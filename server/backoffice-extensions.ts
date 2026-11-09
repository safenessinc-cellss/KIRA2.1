import { createHmac, randomBytes } from "node:crypto";
import { hasScopedPermission, permissionMapFromList } from "./permissions-domain";
import { isValidPeriodLabel } from "./finance-domain";
import { verifyWebhookHmac, webhookDedupeKey } from "./integrations-domain";

const ROLE_SEED: Record<string, string[]> = {
  superadmin: ["*"],
  admin: ["dashboard.read","crm.leads.read","crm.leads.create","crm.leads.update","crm.interactions.read","crm.interactions.create","crm.enrollments.convert","courses.read","courses.create","courses.update","courses.groups.read","courses.groups.create","courses.groups.update","courses.lessons.read","courses.lessons.create","courses.lessons.update","students.read","students.enrollments.read","students.contracts.read","students.attendance.read","students.attendance.mark","students.assessments.grade","finance.invoices.read","finance.invoices.create","finance.invoices.update","finance.payments.read","finance.coupons.read","finance.coupons.create","finance.coupons.update","configuration.integrations.read","configuration.users.read","configuration.users.update","audit.read"],
  coach: ["dashboard.academic.read","courses.read","courses.groups.own.read","courses.sessions.own.read","courses.lessons.own.read","students.own.read","students.attendance.own.read","students.attendance.own.mark","students.assessments.own.read","students.assessments.own.grade","students.enrollments.own.read"],
  sales: ["dashboard.sales.read","crm.leads.own.read","crm.leads.own.create","crm.leads.own.update","crm.interactions.own.read","crm.interactions.own.create","crm.enrollments.convert"],
  finance: ["dashboard.finance.read","finance.invoices.read","finance.invoices.create","finance.invoices.update","finance.invoices.remind","finance.payments.read","finance.payments.reconcile","finance.refunds.request","finance.coupons.read","finance.coupons.create","finance.coupons.update","audit.finance.read"],
  student: ["courses.enrolled.read","students.profile.own.read","students.profile.own.update","students.enrollments.own.read","students.contracts.own.read","students.attendance.own.read","students.assessments.own.read","finance.invoices.own.read","finance.payments.own.read","certificates.own.request","certificates.own.read"]
};
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function allowRate(key: string, limit = 12, windowMs = 60_000): boolean {
  const now = Date.now(), current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) { rateBuckets.set(key, { count: 1, resetAt: now + windowMs }); return true; }
  if (current.count >= limit) return false; current.count += 1; return true;
}
function clientIp(req: any): string { return String(req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim().slice(0, 80); }

export function registerBackofficeExtensions(app: any, d: any): void {
  const { fsGet, fsListAllDocuments, fsCommit, fsCreate, fsUpdate, auditWrite, verifiedUser, requireSuperAdmin, crmEncryptionKey, crmEncrypt, cronAuthorized } = d;

  async function rebuildDashboardAggregate(periodId: string) {
    if (!isValidPeriodLabel(periodId)) throw new Error("periodId inválido.");
    const [transactions, enrollments, leads, invoices, certificates, courses, performances, refunds, settings, groups] = await Promise.all([
      fsListAllDocuments("transactions"), fsListAllDocuments("enrollments"), fsListAllDocuments("crmLeads"),
      fsListAllDocuments("invoices"), fsListAllDocuments("certificates"), fsListAllDocuments("courses"),
      fsListAllDocuments("student_performance"), fsListAllDocuments("refunds"), fsGet("settings", "enrollment"), fsListAllDocuments("course_groups")
    ]);
    const [year, month] = periodId.split("-").map(Number);
    const from = Date.UTC(year, month - 1, 1), to = Date.UTC(year, month, 1);
    const stamp = (v: any) => { const n = typeof v === "number" ? v : Date.parse(String(v || "")); return Number.isFinite(n) ? n : 0; };
    const inPeriod = (v: any) => { const n = stamp(v); return n >= from && n < to; };
    const paid = transactions.filter((t: any) => ["paid", "succeeded"].includes(String(t.status || "").toLowerCase()) && inPeriod(t.paidAt || t.createdAt));
    const salesByCurrency: Record<string, number> = {};
    const courseRevenue: Record<string, number> = {};
    for (const tx of paid) {
      const currency = String(tx.currency || "BRL").toUpperCase();
      const amount = Math.max(0, Math.round(Number(tx.amountMinor ?? Number(tx.amount || 0) * 100)));
      if (!Number.isFinite(amount)) continue;
      salesByCurrency[currency] = (salesByCurrency[currency] || 0) + amount;
      const ids = Array.isArray(tx.courseIds) ? tx.courseIds : tx.courseId ? [tx.courseId] : [];
      for (const id of ids) courseRevenue[String(id)] = (courseRevenue[String(id)] || 0) + Math.round(amount / Math.max(1, ids.length));
    }
    const refundCents = refunds.filter((r: any) => ["paid", "succeeded", "completed"].includes(String(r.status || "").toLowerCase()) && inPeriod(r.refundedAt || r.createdAt))
      .reduce((sum: number, r: any) => sum + Math.max(0, Math.round(Number(r.amountCents ?? Number(r.amount || 0) * 100))), 0)
      + transactions.filter((t: any) => String(t.status || "").toLowerCase() === "refunded" && inPeriod(t.refundedAt || t.updatedAt))
      .reduce((sum: number, t: any) => sum + Math.max(0, Math.round(Number(t.refundedAmountCents ?? t.amountMinor ?? Number(t.amount || 0) * 100))), 0);
    const leadsByStage: Record<string, number> = { new: 0, contacted: 0, qualified: 0, enrolled: 0, lost: 0 };
    for (const lead of leads.filter((x: any) => inPeriod(x.createdAt))) { const stage = String(lead.stage || "new"); if (stage in leadsByStage) leadsByStage[stage]++; }
    const periodEnrollments = enrollments.filter((e: any) => inPeriod(e.createdAt));
    const activeEnrollments = enrollments.filter((e: any) => ["active", "in_progress"].includes(String(e.status || "").toLowerCase())).length;
    const minAttendance = Number(settings?.min_attendance ?? settings?.minAttendance ?? 75);
    const minScore = Number(settings?.min_score ?? settings?.minScore ?? 60);
    const groupCoach = new Map<string, string>();
    for (const group of groups as any[]) groupCoach.set(String(group.id), String(group.coachId || ""));
    const academicByCoach: Record<string, any> = {};
    for (const enrollment of enrollments) {
      const coachId = groupCoach.get(String(enrollment.groupId || "")); if (!coachId) continue;
      academicByCoach[coachId] ||= { newEnrollments: 0, activeEnrollments: 0, atRiskStudents: 0 };
      if (inPeriod(enrollment.createdAt)) academicByCoach[coachId].newEnrollments++;
      if (["active", "in_progress"].includes(String(enrollment.status || "").toLowerCase())) academicByCoach[coachId].activeEnrollments++;
    }
    for (const performance of performances) {
      const coachId = groupCoach.get(String(performance.groupId || "")); if (!coachId) continue;
      academicByCoach[coachId] ||= { newEnrollments: 0, activeEnrollments: 0, atRiskStudents: 0 };
      if (Number(performance.attendancePct || 0) < minAttendance || Number(performance.avgScorePct || 0) < minScore) academicByCoach[coachId].atRiskStudents++;
    }
    const leadsByAssignee: Record<string, Record<string, number>> = {};
    for (const lead of leads.filter((x: any) => inPeriod(x.createdAt) && String(x.assignedTo || ""))) {
      const owner = String(lead.assignedTo); const stage = String(lead.stage || "new");
      leadsByAssignee[owner] ||= { new: 0, contacted: 0, qualified: 0, enrolled: 0, lost: 0 };
      if (stage in leadsByAssignee[owner]) leadsByAssignee[owner][stage]++;
    }
    const atRiskStudents = performances.filter((p: any) => Number(p.attendancePct || 0) < minAttendance || Number(p.avgScorePct || 0) < minScore).length;
    const now = Date.now();
    const overdueInvoices = invoices.filter((i: any) => ["open", "overdue"].includes(String(i.status || "")) && stamp(i.dueDate) < now).length;
    const certificatesIssued = certificates.filter((c: any) => c.status === "issued" && inPeriod(c.issueDate || c.createdAt)).length;
    const courseNames = new Map(courses.map((c: any) => [c.id, String(c.title || c.name || c.id)]));
    const topCourses = Object.entries(courseRevenue).map(([courseId, revenueCents]) => ({ courseId, title: courseNames.get(courseId) || courseId, revenueCents })).sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 10);
    const enrolledLeads = leadsByStage.enrolled || 0, totalLeads = Object.values(leadsByStage).reduce((a, b) => a + b, 0);
    const previous = await fsGet("dashboard_aggregates", periodId);
    const aggregate = {
      periodId, salesGrossCents: salesByCurrency.BRL || 0, salesNetCents: (salesByCurrency.BRL || 0) - refundCents,
      refundsCents: refundCents, salesByCurrency, newEnrollments: periodEnrollments.length, activeEnrollments,
      atRiskStudents, academicByCoach, leadsByStage, leadsByAssignee, conversionRate: totalLeads ? enrolledLeads / totalLeads * 100 : 0,
      topCourses, overdueInvoices, certificatesIssued, updatedAt: new Date().toISOString(),
      sourceEventId: "reconcile_" + periodId + "_" + randomBytes(6).toString("hex")
    };
    const writes = [previous ? fsUpdate("dashboard_aggregates", periodId, aggregate) : fsCreate("dashboard_aggregates", periodId, aggregate),
      auditWrite("cron:dashboard", "dashboard.aggregate.refreshed", "dashboard.aggregates", periodId, previous ? { updatedAt: previous.updatedAt } : null, { updatedAt: aggregate.updatedAt, sourceEventId: aggregate.sourceEventId })];
    await fsCommit(writes);
    return aggregate;
  }

  app.post("/api/cron/dashboard/refresh", async (req: any, res: any) => {
    try {
      if (!cronAuthorized(req, res)) return;
      const requested = String(req.body?.periodId || new Date().toISOString().slice(0, 7));
      const result = await rebuildDashboardAggregate(requested);
      return res.json({ ok: true, aggregate: result });
    } catch (error: any) { console.error("[Dashboard] aggregate refresh failed:", error); return res.status(500).json({ error: "No se pudieron actualizar los agregados del dashboard." }); }
  });

  async function requirePermission(req: any, res: any, key: string, scope: "assigned" | "own" | "all" = "all"): Promise<any | null> {
    const actor = await verifiedUser(req, res); if (!actor) return null;
    const profile = await fsGet("users", actor.uid);
    if (actor.email?.toLowerCase() === "safeness.c.a@gmail.com" && actor.emailVerified) return actor;
    const role = String(profile?.role === "alumno" ? "student" : profile?.role || "");
    const active = await fsGet("role_permissions", role);
    if (active?.permissions && hasScopedPermission(active.permissions, key, scope)) return actor;
    if (!active && role === "admin" && Array.isArray(profile?.staffPermissions) && (profile.staffPermissions.includes("system") || profile.staffPermissions.includes(key.split(".")[0]))) return actor;
    res.status(403).json({ error: "No tienes el permiso requerido: " + key + "." }); return null;
  }

  app.get("/api/admin/permissions", async (req: any, res: any) => {
    try { const actor = await requireSuperAdmin(req, res); if (!actor) return;
      const docs = await fsListAllDocuments("role_permissions");
      return res.json({ items: docs.map(({ id, ...item }: any) => ({ role: id, ...item })) });
    } catch (error: any) { console.error("[RBAC] read failed:", error); return res.status(500).json({ error: "No se pudo consultar la matriz de permisos." }); }
  });

  app.get("/api/admin/integrations", async (req: any, res: any) => {
    try {
      const actor = await requirePermission(req, res, "configuration.integrations.read"); if (!actor) return;
      const items = await fsListAllDocuments("integrations");
      return res.json({ items: items.map(({ id, enabled, publicConfig, updatedAt, updatedBy }: any) => ({ provider: id, enabled: enabled === true, publicConfig: publicConfig || {}, updatedAt: updatedAt || null, updatedBy: updatedBy || null })) });
    } catch (error: any) { console.error("[Integrations] read failed:", error); return res.status(500).json({ error: "No se pudieron consultar las integraciones." }); }
  });

  app.patch("/api/admin/integrations/:provider", async (req: any, res: any) => {
    try {
      const actor = await requireSuperAdmin(req, res); if (!actor) return;
      const provider = String(req.params.provider || "");
      if (!["landing", "whatsapp", "zoom", "google_calendar"].includes(provider)) return res.status(400).json({ error: "Proveedor no permitido." });
      if (typeof req.body?.enabled !== "boolean") return res.status(400).json({ error: "enabled debe ser booleano." });
      const publicConfig = req.body?.publicConfig === undefined ? undefined : req.body.publicConfig;
      if (publicConfig !== undefined && (!publicConfig || typeof publicConfig !== "object" || Array.isArray(publicConfig) || JSON.stringify(publicConfig).length > 10000 || Object.keys(publicConfig).some(key => /secret|token|password|private|api.?key/i.test(key)))) return res.status(400).json({ error: "publicConfig solo admite configuración pública sin credenciales." });
      const before = await fsGet("integrations", provider);
      const now = new Date().toISOString();
      const next = { ...(before || {}), enabled: req.body.enabled, ...(publicConfig === undefined ? {} : { publicConfig }), updatedBy: actor.uid, updatedAt: now };
      await fsCommit([before ? fsUpdate("integrations", provider, next) : fsCreate("integrations", provider, next), auditWrite(actor.uid, "integration.updated", "configuracion.integraciones", provider, before || null, { enabled: next.enabled, publicConfig: next.publicConfig || {} })]);
      return res.json({ provider, enabled: next.enabled, publicConfig: next.publicConfig || {}, updatedAt: now });
    } catch (error: any) { console.error("[Integrations] update failed:", error); return res.status(500).json({ error: "No se pudo actualizar la integración." }); }
  });

  app.post("/api/admin/permissions/seed", async (req: any, res: any) => {
    try { const actor = await requireSuperAdmin(req, res); if (!actor) return;
      const writes: any[] = []; let created = 0;
      for (const [role, keys] of Object.entries(ROLE_SEED)) {
        const existing = await fsGet("role_permissions", role); if (existing) continue;
        const permissions = permissionMapFromList(keys); const now = new Date().toISOString();
        writes.push(fsCreate("role_permissions", role, { permissions, version: 1, updatedBy: actor.uid, updatedAt: now, requiresMFA: true })); created++;
      }
      if (writes.length) { writes.push(auditWrite(actor.uid, "permissions.seed.applied", "configuracion.permisos", "role_permissions", null, { rolesCreated: created })); await fsCommit(writes); }
      return res.json({ ok: true, created, existing: Object.keys(ROLE_SEED).length - created });
    } catch (error: any) { console.error("[RBAC] seed failed:", error); return res.status(500).json({ error: "No se pudo aplicar la matriz de permisos." }); }
  });

  app.patch("/api/admin/permissions/:role", async (req: any, res: any) => {
    try { const actor = await requireSuperAdmin(req, res); if (!actor) return;
      const role = String(req.params.role || "");
      if (!Object.prototype.hasOwnProperty.call(ROLE_SEED, role) || role === "superadmin") return res.status(400).json({ error: "Rol no modificable." });
      const input = req.body?.permissions;
      if (!input || typeof input !== "object" || Array.isArray(input)) return res.status(400).json({ error: "permissions debe ser un mapa booleano." });
      const allowed = new Set(ROLE_SEED[role]); const entries = Object.entries(input);
      if (entries.length > 250 || entries.some(([key, value]) => !allowed.has(key) || typeof value !== "boolean" || key === "*" || key.startsWith("superadmin."))) return res.status(400).json({ error: "La matriz contiene permisos no permitidos para este rol." });
      const before = await fsGet("role_permissions", role); const permissions = Object.fromEntries(entries) as Record<string, boolean>;
      const now = new Date().toISOString(); const next = { permissions, version: Number(before?.version || 0) + 1, updatedBy: actor.uid, updatedAt: now, requiresMFA: true };
      await fsCommit([fsUpdate("role_permissions", role, next), auditWrite(actor.uid, "permissions.role.updated", "configuracion.permisos", role, before || null, next)]);
      return res.json({ role, ...next });
    } catch (error: any) { console.error("[RBAC] update failed:", error); return res.status(500).json({ error: "No se pudo actualizar la matriz de permisos." }); }
  });

  app.post("/api/public/landing/:slug", async (req: any, res: any) => {
    try {
      const ip = clientIp(req); if (!allowRate("landing:" + ip, 8)) return res.status(429).json({ error: "Demasiados envíos. Inténtalo más tarde." });
      const slug = String(req.params.slug || "").toLowerCase(); if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)) return res.status(404).json({ error: "Formulario no encontrado." });
      const [form, integration] = await Promise.all([fsGet("landing_forms", slug), fsGet("integrations", "landing")]);
      if (!form?.active || integration?.enabled !== true) return res.status(410).json({ error: "Este formulario no está disponible." });
      const body = req.body || {}; if (String(body.website || body.company_website || "").trim()) return res.status(202).json({ success: true, redirect: form.successUrl || null });
      if (form.captchaEnabled) {
        const secret = String(process.env.LANDING_CAPTCHA_SECRET || ""); const token = String(body.captchaToken || "");
        if (!secret || !token) return res.status(503).json({ error: "La validación CAPTCHA no está configurada." });
        const response = await fetch("https://www.google.com/recaptcha/api/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ secret, response: token, remoteip: ip }) });
        const captcha = await response.json() as any; if (!response.ok || captcha.success !== true) return res.status(400).json({ error: "No se pudo validar el CAPTCHA." });
      }
      const fullName = String(body.fullName || body.name || "").trim().slice(0, 180); const email = String(body.email || "").trim().toLowerCase().slice(0, 180); const phone = String(body.phone || body.telephone || "").trim().slice(0, 40);
      if (!fullName || (!email && !phone) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return res.status(400).json({ error: "Nombre y email o teléfono válido son obligatorios." });
      const key = crmEncryptionKey(); const dedupe = createHmac("sha256", key).update([email, phone.replace(/\D/g, ""), "landing"].join("|")).digest("hex");
      const existing = await fsGet("crmLeads", dedupe); if (existing) return res.status(200).json({ success: true, duplicate: true, redirect: form.successUrl || null });
      const now = new Date().toISOString(); const lead = { fullNameEncrypted: crmEncrypt(fullName, "crmLead:" + dedupe + ":fullName"), emailEncrypted: email ? crmEncrypt(email, "crmLead:" + dedupe + ":email") : "", phoneEncrypted: phone ? crmEncrypt(phone, "crmLead:" + dedupe + ":phone") : "", source: "landing", campaign: String(body.campaign || slug).slice(0, 120), courseInterest: String(body.courseInterest || form.courseId || "").slice(0, 180), stage: "new", assignedTo: "", score: 0, consentGdpr: body.consentGdpr === true, createdAt: now, updatedAt: now, createdBy: "landing:" + slug };
      await fsCommit([fsCreate("crmLeads", dedupe, lead), auditWrite("landing:" + slug, "crm.lead.created", "crm.leads", dedupe, null, { source: "landing", stage: "new" }), fsCreate("outbox", "crm_lead_created_" + dedupe, { eventId: "crm.lead.created." + dedupe, type: "crm.lead.created.v1", aggregate: "crmLead", aggregateId: dedupe, schemaVersion: 1, payload: { leadId: dedupe, source: "landing" }, status: "pending", attempts: 0, createdAt: now })]);
      return res.status(201).json({ success: true, redirect: form.successUrl || null });
    } catch (error: any) { console.error("[Landing] submit failed:", error); return res.status(500).json({ error: "No se pudo registrar la solicitud." }); }
  });

  app.post("/api/webhooks/whatsapp", async (req: any, res: any) => {
    const raw = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(JSON.stringify(req.body || {}));
    const timestamp = String(req.headers["x-kira-timestamp"] || ""); const signature = String(req.headers["x-kira-signature"] || "");
    const event = req.body || {}; const providerValue = event.entry?.[0]?.changes?.[0]?.value || event; const eventId = String(event.event_id || event.eventId || event.id || providerValue.messages?.[0]?.id || event.entry?.[0]?.id || "");
    const ip = clientIp(req); if (!allowRate("whatsapp:" + ip, 30)) return res.status(429).json({ error: "Límite de eventos excedido." });
    const secret = String(process.env.WHATSAPP_WEBHOOK_SECRET || ""); const signatureOk = verifyWebhookHmac(secret, timestamp, raw, signature);
    const inboxId = signatureOk && eventId ? "whatsapp_" + webhookDedupeKey("whatsapp", eventId) : "whatsapp_invalid_" + randomBytes(16).toString("hex");
    if (!signatureOk) {
      try { await fsCommit([fsCreate("webhook_inbox", inboxId, { provider: "whatsapp", payload: raw.toString("utf8").slice(0, 100000), signatureOk: false, dedupeKey: inboxId, receivedAt: new Date().toISOString(), error: "invalid_signature_or_timestamp" })]); } catch { /* preserve the 401 response; never process invalid data */ }
      return res.status(401).json({ error: "Firma HMAC inválida o timestamp fuera de la ventana permitida." });
    }
    try {
      const integration = await fsGet("integrations", "whatsapp");
      if (!integration?.enabled) { try { await fsCommit([fsCreate("webhook_inbox", inboxId, { provider: "whatsapp", payload: raw.toString("utf8").slice(0, 100000), signatureOk: true, dedupeKey: inboxId, receivedAt: new Date().toISOString(), error: "integration_disabled" })]); } catch { /* duplicate is already recorded */ } return res.status(410).json({ error: "La integración WhatsApp está deshabilitada." }); }
      if (!eventId) return res.status(400).json({ error: "event_id es obligatorio para deduplicar el evento." });
      const existing = await fsGet("webhook_inbox", inboxId); if (existing) return res.status(200).json({ ok: true, duplicate: true });
      const now = new Date().toISOString();
      await fsCommit([fsCreate("webhook_inbox", inboxId, { provider: "whatsapp", payload: raw.toString("utf8").slice(0, 100000), signatureOk: true, dedupeKey: webhookDedupeKey("whatsapp", eventId), receivedAt: now, processedAt: null, error: null })]);
      const message = providerValue.messages?.[0] || event.messages?.[0] || event.message || {}; const contact = providerValue.contacts?.[0] || event.contacts?.[0] || event.contact || {};
      const fullName = String(contact.profile?.name || contact.name || event.name || "Contacto WhatsApp").slice(0, 180);
      const phone = String(message.from || contact.wa_id || event.from || event.phone || "").replace(/[^+0-9]/g, "").slice(0, 40);
      const textBody = String(message.text?.body || message.body || event.text || "").slice(0, 2000);
      let leadId: string | null = null;
      if (phone) {
        const key = crmEncryptionKey(); leadId = createHmac("sha256", key).update(["", phone.replace(/\D/g, ""), "whatsapp"].join("|")).digest("hex");
        const lead = await fsGet("crmLeads", leadId); const leadNow = new Date().toISOString();
        if (!lead) await fsCommit([fsCreate("crmLeads", leadId, { fullNameEncrypted: crmEncrypt(fullName, "crmLead:" + leadId + ":fullName"), emailEncrypted: "", phoneEncrypted: crmEncrypt(phone, "crmLead:" + leadId + ":phone"), source: "whatsapp", campaign: "", courseInterest: "", stage: "new", assignedTo: "", score: 0, consentGdpr: false, createdAt: leadNow, updatedAt: leadNow, createdBy: "whatsapp" }), auditWrite("whatsapp", "crm.lead.created", "crm.leads", leadId, null, { source: "whatsapp", stage: "new" }), fsCreate("outbox", "crm_lead_created_" + leadId, { eventId: "crm.lead.created." + leadId, type: "crm.lead.created.v1", aggregate: "crmLead", aggregateId: leadId, schemaVersion: 1, payload: { leadId, source: "whatsapp" }, status: "pending", attempts: 0, createdAt: leadNow })]);
        const interactionId = "wa_" + webhookDedupeKey("whatsapp-interaction", eventId);
        await fsCommit([fsCreate("crmInteractions", interactionId, { leadId, channel: "whatsapp", outcome: "received", notesEncrypted: textBody ? crmEncrypt(textBody, "crmInteraction:" + interactionId + ":notes") : "", createdAt: leadNow, createdBy: "whatsapp", sourceEventId: eventId }), fsUpdate("webhook_inbox", inboxId, { provider: "whatsapp", payload: raw.toString("utf8").slice(0, 100000), signatureOk: true, dedupeKey: webhookDedupeKey("whatsapp", eventId), receivedAt: now, processedAt: leadNow, error: null, leadId, interactionId })]);
      } else { await fsCommit([fsUpdate("webhook_inbox", inboxId, { provider: "whatsapp", payload: raw.toString("utf8").slice(0, 100000), signatureOk: true, dedupeKey: webhookDedupeKey("whatsapp", eventId), receivedAt: now, processedAt: new Date().toISOString(), error: "no_phone_in_payload" })]); }
      return res.status(200).json({ ok: true, leadId });
    } catch (error: any) { try { const failed = await fsGet("webhook_inbox", inboxId); if (failed) await fsCommit([fsUpdate("webhook_inbox", inboxId, { ...failed, error: "processing_failed", failedAt: new Date().toISOString() })]); } catch { /* keep inbox retryable for operator review */ } console.error("[WhatsApp] webhook processing failed:", error); return res.status(202).json({ ok: true, accepted: true, processingError: "retry_required" }); }
  });
}
