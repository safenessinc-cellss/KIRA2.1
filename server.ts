import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import { GoogleGenAI, Modality } from "@google/genai";
import { WebSocketServer } from "ws";
import compression from "compression";
import { verify as verifySignature, createSign, createHmac, createHash, timingSafeEqual, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to validate if an API Key is loaded and is not a placeholder
function isValidGeminiKey(key: any): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') return false;
  if (trimmed.includes('MY_GEMINI_API_KEY') || trimmed === 'MY_GEMINI_API_KEY') return false;
  return true;
}

// Simple Memory Cache for backend optimizations
interface CacheEntry {
  data: any;
  expiresAt: number;
}
const memoryCache = new Map<string, CacheEntry>();

function getCache(key: string): any | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any, ttlMs: number = 120 * 1000) { // 2 minutes default
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs
  });
}

// Lazy Stripe Initialization
let stripeClient: Stripe | null = null;
function getStripe() {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
       apiVersion: "2025-01-27" as any,
    });
  }
  return stripeClient;
}

// Lazy Gemini Initialization
let geminiClient: GoogleGenAI | null = null;
function getGeminiAI() {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!isValidGeminiKey(key)) {
      throw new Error("GEMINI_API_KEY is not defined or is a placeholder in environment variables. Please add a real key under Settings > Secrets.");
    }
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "KIRA-Coach-SAFENESS.INC",
        }
      }
    });
  }
  return geminiClient;
}


interface VerifiedFirebaseUser { uid: string; email?: string; emailVerified: boolean; }
let firebasePublicKeys: Record<string, string> = {};
let firebaseKeysExpiresAt = 0;

async function verifyFirebaseIdToken(token: string): Promise<VerifiedFirebaseUser | null> {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "kira2-a6a20";
  if (!projectId || !token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (header.alg !== "RS256" || !header.kid || claims.aud !== projectId
      || claims.iss !== `https://securetoken.google.com/${projectId}`
      || typeof claims.sub !== "string" || !claims.sub
      || !Number.isFinite(claims.exp) || claims.exp <= now
      || !Number.isFinite(claims.iat) || claims.iat > now + 300) return null;
    if (Date.now() >= firebaseKeysExpiresAt || !firebasePublicKeys[header.kid]) {
      const response = await fetch("https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys");
      if (!response.ok) return null;
      firebasePublicKeys = await response.json() as Record<string, string>;
      const cacheControl = response.headers.get("cache-control") || "";
      const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 3600);
      firebaseKeysExpiresAt = Date.now() + Math.min(maxAge, 3600) * 1000;
    }
    const certificate = firebasePublicKeys[header.kid];
    if (!certificate) return null;
    const signedData = Buffer.from(parts[0] + "." + parts[1]);
    if (!verifySignature("RSA-SHA256", signedData, certificate, Buffer.from(parts[2], "base64url"))) return null;
    return { uid: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined, emailVerified: claims.email_verified === true };
  } catch {
    return null;
  }
}

const geminiRateLimits = new Map<string, { count: number; resetAt: number }>();
async function requireFirebaseUser(req: express.Request, res: express.Response): Promise<VerifiedFirebaseUser | null> {
  const match = (req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: "Debes iniciar sesión para utilizar este servicio." });
    return null;
  }
  const user = await verifyFirebaseIdToken(match[1]);
  if (!user) {
    res.status(401).json({ error: "La sesión no es válida o ha caducado. Vuelve a iniciar sesión." });
    return null;
  }
  const now = Date.now();
  const limit = geminiRateLimits.get(user.uid);
  if (limit && now < limit.resetAt && limit.count >= 20) {
    res.status(429).json({ error: "Has alcanzado el límite temporal de solicitudes de IA. Inténtalo más tarde." });
    return null;
  }
  if (!limit || now >= limit.resetAt) geminiRateLimits.set(user.uid, { count: 1, resetAt: now + 60_000 });
  else limit.count += 1;
  return user;
}


// Trusted server-side Firestore access. Requires FIREBASE_SERVICE_ACCOUNT_JSON.
type ServiceAccount = { project_id: string; client_email: string; private_key: string };
let serviceTokenCache: { token: string; expiresAt: number } | null = null;
function serviceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON no está configurada.");
  const account = JSON.parse(raw) as ServiceAccount;
  if (!account.project_id || !account.client_email || !account.private_key) throw new Error("La cuenta de servicio de Firebase está incompleta.");
  const expectedProject = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "kira2-a6a20";
  if (account.project_id !== expectedProject) throw new Error("La cuenta de servicio no pertenece al proyecto Firebase configurado.");
  account.private_key = account.private_key.replace(/\\n/g, "\n");
  return account;
}
function b64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
async function firestoreToken(): Promise<string> {
  if (serviceTokenCache && serviceTokenCache.expiresAt > Date.now() + 60000) return serviceTokenCache.token;
  const account = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." + b64url(JSON.stringify({
    iss: account.client_email, scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/devstorage.read_write",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600
  }));
  const signer = createSign("RSA-SHA256"); signer.update(unsigned); signer.end();
  const assertion = unsigned + "." + b64url(signer.sign(account.private_key));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  if (!response.ok) throw new Error("No fue posible autenticar el backend con Firebase.");
  const data = await response.json() as any;
  serviceTokenCache = { token: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 };
  return data.access_token;
}
function fsValue(value: any): any {
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(fsValue) } };
  if (typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fsValue(v)])) } };
  return { stringValue: String(value) };
}
function fsDecode(value: any): any {
  if (!value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fsDecode);
  if ("mapValue" in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, fsDecode(v)]));
  return null;
}
function fsFields(data: any): any {
  return Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, fsValue(v)]));
}
function fsDocumentPath(collectionName: string, id: string): string {
  return "projects/" + serviceAccount().project_id + "/databases/(default)/documents/" + collectionName + "/" + encodeURIComponent(id);
}
async function fsGet(collectionName: string, id: string): Promise<any | null> {
  const response = await fetch("https://firestore.googleapis.com/v1/" + fsDocumentPath(collectionName, id), {
    headers: { Authorization: "Bearer " + await firestoreToken() }
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Firestore read failed (" + response.status + ").");
  const document = await response.json() as any;
  return Object.fromEntries(Object.entries(document.fields || {}).map(([k, v]) => [k, fsDecode(v)]));
}
async function fsCommit(writes: any[]): Promise<void> {
  const response = await fetch("https://firestore.googleapis.com/v1/projects/" + serviceAccount().project_id + "/databases/(default)/documents:commit", {
    method: "POST", headers: { Authorization: "Bearer " + await firestoreToken(), "Content-Type": "application/json" },
    body: JSON.stringify({ writes })
  });
  if (!response.ok) {
    const error: any = new Error("Firestore commit failed (" + response.status + ").");
    error.status = response.status;
    throw error;
  }
}
function fsCreate(collectionName: string, id: string, data: any): any {
  return { update: { name: fsDocumentPath(collectionName, id), fields: fsFields(data) }, currentDocument: { exists: false } };
}
function fsUpdate(collectionName: string, id: string, data: any): any {
  return { update: { name: fsDocumentPath(collectionName, id), fields: fsFields(data) } };
}
async function verifiedUser(req: express.Request, res: express.Response): Promise<VerifiedFirebaseUser | null> {
  const match = (req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
  if (!match) { res.status(401).json({ error: "Debes iniciar sesión." }); return null; }
  const user = await verifyFirebaseIdToken(match[1]);
  if (!user) { res.status(401).json({ error: "La sesión no es válida." }); return null; }
  return user;
}
function idSafe(value: string): string { return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120); }

function paymentEncryptionKey(): Buffer {
  const raw=process.env.KIRA_CONFIG_ENCRYPTION_KEY||"";
  const key=/^[a-f0-9]{64}$/i.test(raw)?Buffer.from(raw,"hex"):Buffer.from(raw,"base64");
  if(key.length!==32)throw new Error("Configura KIRA_CONFIG_ENCRYPTION_KEY como 32 bytes (base64 o 64 caracteres hex).");
  return key;
}
function encryptPaymentSecret(value:string):string {
  const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",paymentEncryptionKey(),iv);
  const encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  return [iv.toString("base64"),cipher.getAuthTag().toString("base64"),encrypted.toString("base64")].join(".");
}
function decryptPaymentSecret(value:string):string {
  const [iv,tag,data]=String(value||"").split(".");
  if(!iv||!tag||!data)throw new Error("Secreto de pasarela cifrado inválido.");
  const decipher=createDecipheriv("aes-256-gcm",paymentEncryptionKey(),Buffer.from(iv,"base64"));
  decipher.setAuthTag(Buffer.from(tag,"base64"));
  return Buffer.concat([decipher.update(Buffer.from(data,"base64")),decipher.final()]).toString("utf8");
}
async function requireSuperAdmin(req:express.Request,res:express.Response):Promise<VerifiedFirebaseUser|null>{
  const user=await verifiedUser(req,res);if(!user)return null;
  const profile=await fsGet("users",user.uid);
  if(user.email?.toLowerCase()!=="safeness.c.a@gmail.com"||user.emailVerified!==true||profile?.role!=="admin"){
    res.status(403).json({error:"Solo el superadministrador KIRA verificado puede administrar pagos y configuración."});return null;
  }
  return user;
}
async function fsListDocuments(collectionName:string,pageSize=100):Promise<any[]>{
  const url="https://firestore.googleapis.com/v1/projects/"+serviceAccount().project_id+"/databases/(default)/documents/"+collectionName+"?pageSize="+Math.min(200,Math.max(1,pageSize));
  const response=await fetch(url,{headers:{Authorization:"Bearer "+await firestoreToken()}});
  if(!response.ok)throw new Error("Firestore list failed ("+response.status+").");
  const body=await response.json() as any;
  return (body.documents||[]).map((d:any)=>({id:String(d.name||"").split("/").pop(),...Object.fromEntries(Object.entries(d.fields||{}).map(([k,v])=>[k,fsDecode(v)]))}));
}
async function catalogItem(id: string): Promise<any | null> {
  for (const collectionName of ["courses", "books", "products", "membershipPlans", "paymentPlans", "marketplace"]) {
    const item = await fsGet(collectionName, id);
    if (item) return { ...item, id, collectionName };
  }
  return null;
}
function certSignature(data: any): string {
  const secret = process.env.KIRA_CERTIFICATE_SIGNING_SECRET || "";
  if (secret.length < 32) throw new Error("Configura KIRA_CERTIFICATE_SIGNING_SECRET (mínimo 32 caracteres).");
  const canonical = JSON.stringify(Object.keys(data).sort().reduce((result: any, key) => { result[key] = data[key]; return result; }, {}));
  return createHmac("sha256", secret).update(canonical).digest("hex");
}
async function fulfillOrder(orderId: string, provider: string, paymentId: string, eventId: string, paidMinor: number, currency: string, expectedUserId?: string): Promise<void> {
  const order = await fsGet("orders", orderId);
  if (!order) throw new Error("La orden no existe.");
  if (order.status === "paid") return;
  if (order.provider !== provider || (expectedUserId && order.userId !== expectedUserId) || Math.abs(Math.round(Number(order.amount) * 100) - paidMinor) > 1 || String(order.currency).toLowerCase() !== currency.toLowerCase()) throw new Error("El importe, la moneda, el usuario o el proveedor no coincide con la orden.");
  const now = new Date().toISOString();
  const writes: any[] = [
    fsCreate("paymentEvents", idSafe(provider + "_" + eventId), { provider, eventId, orderId, status: "processed", processedAt: now }),
    fsCreate("transactions", idSafe(provider + "_" + paymentId), { userId: order.userId, orderId, courseId: (order.items || []).find((item: any) => item.type === "course")?.id || "", courseIds: (order.items || []).filter((item: any) => item.type === "course").map((item: any) => item.id), provider, providerPaymentId: paymentId, amount: order.amount, currency: order.currency, status: "paid", createdAt: now }),
    fsUpdate("orders", orderId, { ...order, status: "paid", providerPaymentId: paymentId, paidAt: now, updatedAt: now }),
    fsCreate("auditLogs", idSafe("payment_" + provider + "_" + paymentId), { actorId: "payment_webhook", action: "payment.confirmed", targetId: orderId, provider, paymentId, amount: order.amount, currency: order.currency, createdAt: now }),
    fsCreate("notifications", idSafe("payment_" + orderId), { userId: order.userId, title: "Pago confirmado", message: "Tu pago fue verificado. El acceso comprado ya está siendo habilitado.", type: "system", read: false, createdAt: now })
  ];
  const buyerProfile = await fsGet("users", order.userId);
  for (const item of order.items || []) {
    if (item.type === "course" || item.collectionName === "courses") {
      const enrollmentId = idSafe(order.userId + "_" + item.id);
      const existingEnrollment = await fsGet("enrollments", enrollmentId);
      const enrollment = {
        ...(existingEnrollment || {}),
        userId: order.userId, studentName: existingEnrollment?.studentName || buyerProfile?.displayName || buyerProfile?.name || "Alumno",
        studentEmail: existingEnrollment?.studentEmail || buyerProfile?.email || "", studentAvatar: existingEnrollment?.studentAvatar || buyerProfile?.photoURL || "",
        courseId: item.id, progress: Number(existingEnrollment?.progress || 0), completed: existingEnrollment?.completed === true,
        courseCompleted: existingEnrollment?.courseCompleted === true, status: existingEnrollment?.completed === true ? "completed" : "active",
        paymentOrderId: orderId, paymentStatus: "paid", paidAt: now, updatedAt: now, createdAt: existingEnrollment?.createdAt || now
      };
      writes.push(existingEnrollment ? fsUpdate("enrollments", enrollmentId, enrollment) : fsCreate("enrollments", enrollmentId, enrollment));
      writes.push(fsCreate("outbox", "enrollment_activated_" + enrollmentId, {
        eventId: "enrollment.activated." + enrollmentId + "." + orderId, type: "enrollment.activated.v1",
        aggregate: "enrollment", aggregateId: enrollmentId, schemaVersion: 1,
        payload: { enrollmentId, userId: order.userId, courseId: item.id, orderId }, status: "pending", attempts: 0, createdAt: now
      }));
    } else if (item.collectionName === "books" || item.type === "book") {
      const purchaseId = idSafe(order.userId + "_" + orderId + "_" + item.id);
      writes.push(fsCreate("purchases", purchaseId, { userId: order.userId, productId: item.id, productType: "book", orderId, paymentStatus: "paid", createdAt: now }));
      const entitlementId = idSafe(order.userId + "_" + item.id);
      const existingEntitlement = await fsGet("bookEntitlements", entitlementId);
      const entitlement = { userId: order.userId, productId: item.id, status: "active", paymentStatus: "paid", orderId, grantedAt: now };
      writes.push(existingEntitlement ? fsUpdate("bookEntitlements", entitlementId, entitlement) : fsCreate("bookEntitlements", entitlementId, entitlement));
    } else if (item.type === "membership") {
      const durationDays = Math.max(1, Math.min(3650, Number(item.durationDays || 365)));
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
      const profile = await fsGet("users", order.userId);
      if (profile) writes.push(fsUpdate("users", order.userId, { ...profile, membershipStatus: "active", membershipPaidAt: now, membershipExpiresAt: expiresAt, membershipPlanId: item.id, membershipPlanName: item.title }));
      writes.push(fsCreate("memberships", idSafe(order.userId + "_" + orderId), { userId: order.userId, planId: item.id, planTitle: item.title, status: "active", paymentOrderId: orderId, startsAt: now, expiresAt, durationDays, autoRenew: false }));
    }
  }
  writes.push(fsCreate("outbox", "payment_paid_" + orderId, {
    eventId: "payment.paid." + orderId, type: "payment.paid.v1", aggregate: "order", aggregateId: orderId,
    schemaVersion: 1, payload: { orderId, provider, paymentId, userId: order.userId, amount: order.amount, currency: order.currency },
    status: "pending", attempts: 0, createdAt: now
  }));
  await fsCommit(writes);
}

const app = express();
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));
app.use(express.json({ limit: "5mb", verify: (req: any, _res, buffer) => { req.rawBody = Buffer.from(buffer); } })); // Preserve exact webhook bytes

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Report configuration truthfully; never claim the AI is ready when no key is configured.
app.get("/api/gemini/config", (req, res) => {
  const configured = isValidGeminiKey(process.env.GEMINI_API_KEY);
  res.status(configured ? 200 : 503).json({ configured, isRealKey: configured });
});

// Helper to extract plain text prompt from any content format passed to Gemini API
function extractPromptText(contents: any): string {
  if (!contents) return "";
  if (typeof contents === "string") return contents;
  if (Array.isArray(contents)) {
    return contents.map(c => extractPromptText(c)).join("\n");
  }
  if (typeof contents === "object") {
    if (contents.parts) {
      return extractPromptText(contents.parts);
    }
    if (contents.text) {
      return contents.text;
    }
  }
  return "";
}

// Gemini Content Generation Proxy with Cache, Retry, Timeout, and robust Simulated Fallback logic
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const authenticatedUser = await requireFirebaseUser(req, res);
    if (!authenticatedUser) return;
    const key = process.env.GEMINI_API_KEY;
    const { model, contents, config } = req.body || {};
    const promptText = extractPromptText(contents);
    if (!promptText || promptText.length > 50000 || (model && (typeof model !== "string" || !/^gemini-[a-zA-Z0-9.-]{1,70}$/.test(model)))) {
      return res.status(400).json({ error: "La solicitud de IA no es válida o supera el límite permitido." });
    }

    if (!isValidGeminiKey(key)) {
      return res.status(503).json({ error: "El servicio de IA no está configurado. Contacta al administrador." });
    }
    
    // Create cache key based on contents and config to avoid repeating identical AI calls
    const cacheKey = JSON.stringify({ uid: authenticatedUser.uid, model, contents, config });
    const cachedResponse = getCache(cacheKey);
    if (cachedResponse) {
      console.log("[Cache Backend] Sirviendo respuesta de Gemini desde caché en memoria.");
      return res.json({ text: cachedResponse, cached: true });
    }

    // Map models to ensure we use supported models
    let mappedModel = model || "gemini-3.5-flash";
    const deprecatedModels = [
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-pro",
      "gemini-2.0-flash",
      "gemini-2.0-pro",
      "gemini-2.0-flash-thinking",
      "gemini-3-flash-preview",
      "gemini-2.5-flash"
    ];
    if (deprecatedModels.includes(mappedModel)) {
      mappedModel = "gemini-3.5-flash";
    }

    const ai = getGeminiAI();

    // Implement retry & timeout wrapper
    const fetchWithTimeoutAndRetry = async (retries = 2, delay = 1000): Promise<any> => {
      const apiCall = ai.models.generateContent({
        model: mappedModel,
        contents,
        config
      });

      // 15 seconds timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout: La API de Gemini tardó demasiado en responder (>15s).")), 15000);
      });

      try {
        return await Promise.race([apiCall, timeoutPromise]);
      } catch (err: any) {
        if (retries > 0 && (!err.message || !err.message.includes("Timeout"))) {
          console.warn(`[Gemini Retry] Error en llamada a Gemini. Reintentando en ${delay}ms... (${retries} intentos restantes). Error:`, err.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchWithTimeoutAndRetry(retries - 1, delay * 2);
        }
        throw err;
      }
    };

    const result = await fetchWithTimeoutAndRetry();
    const textResult = result.text || "";

    // Cache successful response for 3 minutes to optimize future duplicate hits
    if (textResult) {
      setCache(cacheKey, textResult, 180 * 1000);
    }

    res.json({ text: textResult, cached: false });
  } catch (error: any) {
    console.error("Gemini API server proxy error:", error);
    res.status(500).json({ error: error.message || "Un error ocurrió al llamar a la API de Gemini en el servidor." });
  }
});


/* Superadmin-only payment configuration API. Provider credentials are AES-256-GCM encrypted at rest. */
app.get("/api/admin/payments/config",async(req,res)=>{
  try{
    const user=await requireSuperAdmin(req,res);if(!user)return;
    const [global,gateways,plans,coupons]=await Promise.all([
      fsGet("paymentSettings","global"),fsListDocuments("paymentGateways"),fsListDocuments("paymentPlans"),fsListDocuments("paymentCoupons")
    ]);
    return res.json({
      settings:{paymentsEnabled:global?.paymentsEnabled!==false,baseCurrency:global?.baseCurrency||"BRL",allowedCurrencies:global?.allowedCurrencies||["BRL","USD","EUR"],roundingRule:global?.roundingRule||"half_up",requirePayment:global?.requirePayment!==false},
      gateways:gateways.map(g=>({id:g.id,provider:g.provider,enabled:g.enabled===true,mode:g.mode==="live"?"live":"test",priority:Number(g.priority||0),publicKey:g.publicKey||"",hasApiKey:!!g.apiKeyEncrypted,hasWebhookSecret:!!g.webhookSecretEncrypted,maskedApiKey:g.apiKeyEncrypted?"•••••••• configurada":"No configurada",updatedAt:g.updatedAt||null})),
      plans:plans.map(({id,...p})=>({id,...p})),coupons:coupons.map(({id,...p})=>({id,...p}))
    });
  }catch(e:any){console.error("[Payments] Config read failed:",e);return res.status(500).json({error:e.message||"No se pudo leer la configuración."});}
});
app.patch("/api/admin/payments/settings",async(req,res)=>{
  try{
    const user=await requireSuperAdmin(req,res);if(!user)return;
    const body=req.body||{};
    const next={paymentsEnabled:body.paymentsEnabled!==false,baseCurrency:String(body.baseCurrency||"BRL").toUpperCase(),allowedCurrencies:Array.isArray(body.allowedCurrencies)?body.allowedCurrencies.map((x:any)=>String(x).toUpperCase()).filter((x:string)=>/^[A-Z]{3}$/.test(x)).slice(0,10):["BRL"],roundingRule:["half_up","up","down"].includes(body.roundingRule)?body.roundingRule:"half_up",requirePayment:body.requirePayment!==false,updatedAt:new Date().toISOString(),updatedBy:user.uid};
    if(!/^[A-Z]{3}$/.test(next.baseCurrency)||!next.allowedCurrencies.includes(next.baseCurrency))return res.status(400).json({error:"Moneda base no válida o no incluida en las monedas permitidas."});
    const before=await fsGet("paymentSettings","global");
    await fsCommit([before?fsUpdate("paymentSettings","global",next):fsCreate("paymentSettings","global",next),fsCreate("config_audit",randomBytes(16).toString("hex"),{scope:"payments",key:"global",actorId:user.uid,before:before||{},after:next,ip:req.ip,userAgent:String(req.headers["user-agent"]||"").slice(0,300),createdAt:next.updatedAt})]);
    return res.json({ok:true,settings:next});
  }catch(e:any){console.error("[Payments] Settings update failed:",e);return res.status(500).json({error:e.message||"No se pudo guardar la configuración."});}
});
app.put("/api/admin/payments/gateways/:provider",async(req,res)=>{
  try{
    const user=await requireSuperAdmin(req,res);if(!user)return;
    const provider=String(req.params.provider||"");
    if(!["stripe","mercadopago"].includes(provider))return res.status(400).json({error:"Pasarela no admitida."});
    const body=req.body||{},id=provider,previous=await fsGet("paymentGateways",id);
    const mode=body.mode==="live"?"live":"test",priority=Math.max(0,Math.min(100,Number(body.priority||0)));
    const apiKey=typeof body.apiKey==="string"?body.apiKey.trim():"",webhookSecret=typeof body.webhookSecret==="string"?body.webhookSecret.trim():"";
    if((apiKey||webhookSecret)&&provider!=="manual")paymentEncryptionKey();
    const next={provider,enabled:body.enabled===true,mode,priority,publicKey:String(body.publicKey||"").slice(0,500),apiKeyEncrypted:apiKey?encryptPaymentSecret(apiKey):(previous?.apiKeyEncrypted||""),webhookSecretEncrypted:webhookSecret?encryptPaymentSecret(webhookSecret):(previous?.webhookSecretEncrypted||""),updatedBy:user.uid,updatedAt:new Date().toISOString()};
    await fsCommit([previous?fsUpdate("paymentGateways",id,next):fsCreate("paymentGateways",id,next),fsCreate("paymentAudit",randomBytes(16).toString("hex"),{actorId:user.uid,action:"gateway.updated",entity:"paymentGateways",entityId:id,before:{...previous,apiKeyEncrypted:previous?.apiKeyEncrypted?"[secret]":undefined,webhookSecretEncrypted:previous?.webhookSecretEncrypted?"[secret]":undefined},after:{...next,apiKeyEncrypted:next.apiKeyEncrypted?"[secret]":undefined,webhookSecretEncrypted:next.webhookSecretEncrypted?"[secret]":undefined},ip:req.ip,userAgent:String(req.headers["user-agent"]||"").slice(0,300),createdAt:next.updatedAt})]);
    return res.json({ok:true,gateway:{provider,enabled:next.enabled,mode,priority,publicKey:next.publicKey,hasApiKey:!!next.apiKeyEncrypted,hasWebhookSecret:!!next.webhookSecretEncrypted}});
  }catch(e:any){console.error("[Payments] Gateway update failed:",e);return res.status(500).json({error:e.message||"No se pudo guardar la pasarela."});}
});
app.post("/api/admin/payments/plans",async(req,res)=>{
  try{
    const user=await requireSuperAdmin(req,res);if(!user)return;
    const b=req.body||{},name=String(b.name||"").trim(),amountCents=Number(b.amountCents),currency=String(b.currency||"BRL").toUpperCase(),interval=String(b.interval||"one_time");
    if(!name||name.length>120||!Number.isSafeInteger(amountCents)||amountCents<0||amountCents>100000000||!/^[A-Z]{3}$/.test(currency)||!["one_time","monthly","yearly"].includes(interval))return res.status(400).json({error:"Datos de plan inválidos."});
    const id=randomBytes(16).toString("hex"),now=new Date().toISOString(),plan={name,amountCents,currency,interval,trialDays:Math.max(0,Math.min(365,Number(b.trialDays||0))),courseId:String(b.courseId||""),status:"active",createdBy:user.uid,createdAt:now,updatedAt:now};
    await fsCommit([fsCreate("paymentPlans",id,plan),fsCreate("paymentAudit",randomBytes(16).toString("hex"),{actorId:user.uid,action:"plan.created",entity:"paymentPlans",entityId:id,after:plan,createdAt:now})]);
    return res.status(201).json({id,...plan});
  }catch(e:any){console.error("[Payments] Plan create failed:",e);return res.status(500).json({error:"No se pudo crear el plan."});}
});
app.patch("/api/admin/payments/plans/:id",async(req,res)=>{
  try{
    const user=await requireSuperAdmin(req,res);if(!user)return;
    const id=idSafe(String(req.params.id||"")),before=await fsGet("paymentPlans",id);if(!before)return res.status(404).json({error:"Plan no encontrado."});
    const b=req.body||{},next={...before,name:typeof b.name==="string"?b.name.trim().slice(0,120):before.name,amountCents:b.amountCents===undefined?before.amountCents:Number(b.amountCents),currency:b.currency===undefined?before.currency:String(b.currency).toUpperCase(),interval:b.interval===undefined?before.interval:String(b.interval),status:b.status==="archived"?"archived":before.status,updatedAt:new Date().toISOString(),updatedBy:user.uid};
    if(!next.name||!Number.isSafeInteger(next.amountCents)||next.amountCents<0||!/^[A-Z]{3}$/.test(next.currency)||!["one_time","monthly","yearly"].includes(next.interval))return res.status(400).json({error:"Datos de plan inválidos."});
    await fsCommit([fsUpdate("paymentPlans",id,next),fsCreate("paymentAudit",randomBytes(16).toString("hex"),{actorId:user.uid,action:"plan.updated",entity:"paymentPlans",entityId:id,before,after:next,createdAt:next.updatedAt})]);
    return res.json({id,...next});
  }catch(e:any){console.error("[Payments] Plan update failed:",e);return res.status(500).json({error:"No se pudo actualizar el plan."});}
});
app.post("/api/admin/payments/coupons",async(req,res)=>{
  try{
    const user=await requireSuperAdmin(req,res);if(!user)return;
    const b=req.body||{},code=String(b.code||"").trim().toUpperCase(),type=String(b.type||"percent"),value=Number(b.value),maxUses=b.maxUses===""||b.maxUses==null?null:Number(b.maxUses);
    if(!/^[A-Z0-9_-]{3,40}$/.test(code)||!["percent","fixed"].includes(type)||!Number.isFinite(value)||value<=0||(type==="percent"&&value>100)||(maxUses!==null&&(!Number.isInteger(maxUses)||maxUses<1)))return res.status(400).json({error:"Cupón inválido."});
    const existing=await fsGet("paymentCoupons",idSafe(code));if(existing)return res.status(409).json({error:"Ese código ya existe."});
    const now=new Date().toISOString(),coupon={code,type,value,maxUses,usedCount:0,expiresAt:b.expiresAt||null,status:"active",createdBy:user.uid,createdAt:now};
    await fsCommit([fsCreate("paymentCoupons",idSafe(code),coupon),fsCreate("paymentAudit",randomBytes(16).toString("hex"),{actorId:user.uid,action:"coupon.created",entity:"paymentCoupons",entityId:idSafe(code),after:coupon,createdAt:now})]);
    return res.status(201).json({id:idSafe(code),...coupon});
  }catch(e:any){console.error("[Payments] Coupon create failed:",e);return res.status(500).json({error:"No se pudo crear el cupón."});}
});
app.get("/api/admin/payments/audit",async(req,res)=>{
  try{const user=await requireSuperAdmin(req,res);if(!user)return;const [payments,configs]=await Promise.all([fsListDocuments("paymentAudit",100),fsListDocuments("config_audit",100)]);return res.json({items:[...payments,...configs].sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||""))).slice(0,150)});}
  catch(e:any){console.error("[Payments] Audit read failed:",e);return res.status(500).json({error:"No se pudo consultar la auditoría."});}
});


/* Backoffice CRM and Dashboard APIs. All PII is encrypted server-side and never read from client Firestore. */
function crmEncryptionKey(): Buffer {
  const raw = process.env.KIRA_CRM_PII_ENCRYPTION_KEY || "";
  const key = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("Configura KIRA_CRM_PII_ENCRYPTION_KEY con 32 bytes (base64 o 64 caracteres hex).");
  return key;
}
function crmEncrypt(value: string): string {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", crmEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}
function crmDecrypt(value: string): string {
  const [iv, tag, data] = String(value || "").split(".");
  if (!iv || !tag || !data) return "";
  const decipher = createDecipheriv("aes-256-gcm", crmEncryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
function crmLeadView(id: string, lead: any): any {
  return {
    id, fullName: crmDecrypt(lead.fullNameEncrypted), email: lead.emailEncrypted ? crmDecrypt(lead.emailEncrypted) : "",
    phone: lead.phoneEncrypted ? crmDecrypt(lead.phoneEncrypted) : "", notes: lead.notesEncrypted ? crmDecrypt(lead.notesEncrypted) : "",
    source: lead.source, campaign: lead.campaign || "", courseInterest: lead.courseInterest || "",
    stage: lead.stage || "new", assignedTo: lead.assignedTo || "", score: Number(lead.score || 0),
    consentGdpr: lead.consentGdpr === true, createdAt: lead.createdAt || "", updatedAt: lead.updatedAt || ""
  };
}
async function beginFirestoreTransaction(): Promise<string> {
  const response = await fetch("https://firestore.googleapis.com/v1/projects/" + serviceAccount().project_id + "/databases/(default)/documents:beginTransaction", {
    method: "POST", headers: { Authorization: "Bearer " + await firestoreToken(), "Content-Type": "application/json" },
    body: JSON.stringify({ options: { readWrite: {} } })
  });
  if (!response.ok) throw new Error("No se pudo iniciar la transacción Firestore.");
  const data = await response.json() as any;
  if (!data.transaction) throw new Error("Firestore no devolvió el identificador de transacción.");
  return data.transaction;
}
async function fsGetInTransaction(collectionName: string, id: string, transaction: string): Promise<any | null> {
  const url = "https://firestore.googleapis.com/v1/" + fsDocumentPath(collectionName, id) + "?transaction=" + encodeURIComponent(transaction);
  const response = await fetch(url, { headers: { Authorization: "Bearer " + await firestoreToken() } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("No se pudo leer un documento dentro de la transacción.");
  const document = await response.json() as any;
  return Object.fromEntries(Object.entries(document.fields || {}).map(([k, v]) => [k, fsDecode(v)]));
}
async function fsCommitTransaction(writes: any[], transaction: string): Promise<void> {
  const response = await fetch("https://firestore.googleapis.com/v1/projects/" + serviceAccount().project_id + "/databases/(default)/documents:commit", {
    method: "POST", headers: { Authorization: "Bearer " + await firestoreToken(), "Content-Type": "application/json" },
    body: JSON.stringify({ writes, transaction })
  });
  if (!response.ok) {
    const error: any = new Error("La operación perdió una condición de concurrencia o no pudo confirmarse.");
    error.status = response.status;
    throw error;
  }
}
async function backofficeAdmin(req: express.Request, res: express.Response, permission?: string): Promise<VerifiedFirebaseUser | null> {
  const user = await verifiedUser(req, res);
  if (!user) return null;
  const profile = await fsGet("users", user.uid);
  if (user.emailVerified !== true || profile?.role !== "admin") {
    res.status(403).json({ error: "Este módulo está habilitado únicamente para administradores verificados." });
    return null;
  }
  const isSuperAdmin = user.email?.toLowerCase() === "safeness.c.a@gmail.com";
  const permissions = Array.isArray(profile.staffPermissions) ? profile.staffPermissions : [];
  if (!isSuperAdmin && permission && !permissions.includes("system") && !permissions.includes(permission)) {
    res.status(403).json({ error: "No tienes permiso para esta operación del backoffice." });
    return null;
  }
  return user;
}
function auditWrite(userId: string, action: string, nodePath: string, entityId: string, before: any, after: any): any {
  const now = new Date().toISOString();
  return fsCreate("auditLogs", randomBytes(16).toString("hex"), {
    actorId: userId, action, nodePath, targetId: entityId, before: before || null, after: after || null,
    createdAt: now, source: "backoffice-api"
  });
}

app.get("/api/admin/dashboard", async (req, res) => {
  try {
    const user = await backofficeAdmin(req, res, "system"); if (!user) return;
    const profile = await fsGet("users", user.uid);
    const isSuperAdmin = user.email?.toLowerCase() === "safeness.c.a@gmail.com";
    const permissions = Array.isArray(profile?.staffPermissions) ? profile.staffPermissions : [];
    const can = (permission: string) => isSuperAdmin || permissions.includes("system") || permissions.includes(permission);
    const from = typeof req.query.from === "string" ? Date.parse(req.query.from + "T00:00:00.000Z") : Date.now() - 30 * 86400000;
    const to = typeof req.query.to === "string" ? Date.parse(req.query.to + "T23:59:59.999Z") : Date.now();
    if (!Number.isFinite(from) || !Number.isFinite(to) || from > to || to - from > 366 * 86400000) return res.status(400).json({ error: "Rango de fechas inválido (máximo 366 días)." });
    const [transactions, enrollments, leads, invoices, certificates, courses] = await Promise.all([
      fsListDocuments("transactions", 200), fsListDocuments("enrollments", 200), fsListDocuments("crmLeads", 200),
      fsListDocuments("invoices", 200), fsListDocuments("certificates", 200), fsListDocuments("courses", 200)
    ]);
    const timestamp = (value: any) => {
      if (!value) return 0;
      const parsed = typeof value === "string" ? Date.parse(value) : (value.toDate ? value.toDate().getTime() : Number(value));
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const inRange = (value: any) => { const t = timestamp(value); return t >= from && t <= to; };
    const grossByCurrency: Record<string, number> = {};
    const revenueByCourse: Record<string, Record<string, number>> = {};
    const paidTransactions = transactions.filter(t => ["paid", "succeeded"].includes(String(t.status || "").toLowerCase()) && inRange(t.paidAt || t.createdAt));
    for (const payment of paidTransactions) {
      const currency = String(payment.currency || "BRL").toUpperCase();
      const amountMinor = Math.round(Number(payment.amountMinor ?? (Number(payment.amount || 0) * 100)));
      if (!Number.isFinite(amountMinor) || amountMinor < 0) continue;
      grossByCurrency[currency] = (grossByCurrency[currency] || 0) + amountMinor;
      const courseIds = Array.isArray(payment.courseIds) ? payment.courseIds : (payment.courseId ? [payment.courseId] : []);
      const share = courseIds.length ? Math.round(amountMinor / courseIds.length) : 0;
      for (const courseId of courseIds) {
        revenueByCourse[courseId] ||= {};
        revenueByCourse[courseId][currency] = (revenueByCourse[courseId][currency] || 0) + share;
      }
    }
    const periodEnrollments = enrollments.filter(e => inRange(e.createdAt));
    const periodLeads = leads.filter(l => inRange(l.createdAt) && (isSuperAdmin || l.assignedTo === user.uid));
    const byStage: Record<string, number> = { new: 0, contacted: 0, qualified: 0, enrolled: 0, lost: 0 };
    for (const lead of periodLeads) byStage[String(lead.stage || "new")] = (byStage[String(lead.stage || "new")] || 0) + 1;
    const converted = byStage.enrolled || 0;
    const overdueInvoices = invoices.filter(i => ["open", "overdue"].includes(String(i.status || "").toLowerCase()) && Date.parse(String(i.dueDate || "9999-12-31")) < Date.now()).length;
    const activeEnrollments = enrollments.filter(e => ["active", "in_progress"].includes(String(e.status || "").toLowerCase()));
    const courseById = new Map(courses.map(c => [c.id, String(c.title || c.name || c.id)]));
    const topCourses = Object.entries(revenueByCourse).map(([courseId, revenue]) => ({ courseId, title: courseById.get(courseId) || courseId, revenueByCurrency: revenue }))
      .sort((a, b) => Object.values(b.revenueByCurrency).reduce((x, y) => x + y, 0) - Object.values(a.revenueByCurrency).reduce((x, y) => x + y, 0)).slice(0, 5);
    const issuedCertificates = certificates.filter(c => c.status === "issued" && inRange(c.issueDate || c.createdAt)).length;
    const result: any = {
      generatedAt: new Date().toISOString(),
      source: "Firestore · lectura actual limitada a 200 documentos por colección; sin materialización ni conciliación de reembolsos"
    };
    if (can("billing") || can("finance")) result.sales = { grossByCurrency, netByCurrency: {} };
    if (can("users") || can("courses")) result.enrollments = { newCount: periodEnrollments.length };
    if (can("crm")) {
      result.leads = { byStage, total: periodLeads.length };
      result.conversion = { rate: periodLeads.length ? converted / periodLeads.length * 100 : 0, converted, qualified: byStage.qualified || 0 };
    }
    if (can("billing") || can("finance")) result.topCourses = topCourses;
    if (can("billing") || can("finance")) result.overdueInvoices = overdueInvoices;
    if (can("users") || can("courses")) result.students = { active: activeEnrollments.length, atRisk: 0 };
    if (can("users")) result.certificates = { issued: issuedCertificates };
    return res.json(result);
  } catch (error: any) {
    console.error("[Backoffice] Dashboard failed:", error);
    return res.status(500).json({ error: "No se pudieron calcular los indicadores del backoffice." });
  }
});

app.get("/api/admin/crm/leads", async (req, res) => {
  try {
    const user = await backofficeAdmin(req, res, "crm"); if (!user) return;
    const stage = String(req.query.stage || ""), source = String(req.query.source || ""), assignedTo = String(req.query.assigned_to || "");
    const leads = await fsListDocuments("crmLeads", 200);
    const isSuperAdmin = user.email?.toLowerCase() === "safeness.c.a@gmail.com";
    const items = leads.filter(lead => (isSuperAdmin || lead.assignedTo === user.uid) && (!stage || lead.stage === stage) && (!source || lead.source === source) && (!assignedTo || lead.assignedTo === assignedTo))
      .map(({ id, ...lead }) => crmLeadView(id, lead))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return res.json({ items, total: items.length, limit: 200 });
  } catch (error: any) {
    console.error("[CRM] Lead list failed:", error);
    return res.status(500).json({ error: error.message || "No se pudieron consultar los leads." });
  }
});

app.post("/api/admin/crm/leads", async (req, res) => {
  try {
    const user = await backofficeAdmin(req, res, "crm"); if (!user) return;
    const body = req.body || {};
    const fullName = String(body.fullName || "").trim(), email = String(body.email || "").trim().toLowerCase(), phone = String(body.phone || "").trim();
    const source = String(body.source || "manual");
    if (!fullName || fullName.length > 180 || (!email && !phone) || email.length > 180 || phone.length > 40 ||
      (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
      !["landing", "whatsapp", "instagram", "referido", "manual"].includes(source)) return res.status(400).json({ error: "Nombre, email o teléfono y origen válido son obligatorios." });
    const key = crmEncryptionKey();
    const dedupeMaterial = [email, phone.replace(/\D/g, ""), source].join("|");
    const id = createHmac("sha256", key).update(dedupeMaterial).digest("hex");
    const now = new Date().toISOString();
    const lead = {
      fullNameEncrypted: crmEncrypt(fullName), emailEncrypted: email ? crmEncrypt(email) : "", phoneEncrypted: phone ? crmEncrypt(phone) : "",
      source, campaign: String(body.campaign || "").slice(0, 120), courseInterest: String(body.courseInterest || "").slice(0, 180),
      stage: "new", assignedTo: (user.email?.toLowerCase() === "safeness.c.a@gmail.com" ? String(body.assignedTo || "") : user.uid).slice(0, 180), score: 0,
      consentGdpr: body.consentGdpr === true, createdAt: now, updatedAt: now, piiVersion: 1
    };
    try {
      await fsCommit([
        fsCreate("crmLeads", id, lead),
        auditWrite(user.uid, "crm.lead.created", "embudo.leads", id, null, { source, stage: "new", assignedTo: lead.assignedTo }),
        fsCreate("outbox", "crm_lead_created_" + id, { eventId: "crm.lead.created." + id, type: "crm.lead.created.v1", aggregate: "crmLead", aggregateId: id, schemaVersion: 1, payload: { leadId: id, source, stage: "new" }, status: "pending", attempts: 0, createdAt: now })
      ]);
    } catch (error: any) {
      if (error.status === 409 || error.status === 400) return res.status(409).json({ error: "Ya existe un lead con la misma combinación de email, teléfono y origen." });
      throw error;
    }
    return res.status(201).json({ item: crmLeadView(id, lead) });
  } catch (error: any) {
    console.error("[CRM] Lead create failed:", error);
    return res.status(500).json({ error: error.message || "No se pudo crear el lead. Verifica la clave de cifrado CRM." });
  }
});

app.patch("/api/admin/crm/leads/:id", async (req, res) => {
  try {
    const user = await backofficeAdmin(req, res, "crm"); if (!user) return;
    const id = idSafe(String(req.params.id || "")), before = await fsGet("crmLeads", id);
    if (!before) return res.status(404).json({ error: "Lead no encontrado." });
    if (user.email?.toLowerCase() !== "safeness.c.a@gmail.com" && before.assignedTo !== user.uid) return res.status(404).json({ error: "Lead no encontrado." });
    const body = req.body || {}, allowedStages = ["new", "contacted", "qualified", "enrolled", "lost"];
    if (body.stage === "enrolled") return res.status(409).json({ error: "La etapa enrolled solo se asigna mediante conversión transaccional." });
    const next: any = { ...before, updatedAt: new Date().toISOString(), updatedBy: user.uid };
    if (typeof body.stage === "string") {
      if (!allowedStages.includes(body.stage)) return res.status(400).json({ error: "Etapa CRM inválida." });
      next.stage = body.stage;
    }
    if (typeof body.assignedTo === "string") {
      if (user.email?.toLowerCase() !== "safeness.c.a@gmail.com" && body.assignedTo !== user.uid) return res.status(403).json({ error: "Solo el superadministrador puede reasignar leads a otro responsable." });
      next.assignedTo = body.assignedTo.slice(0, 180);
    }
    if (body.score !== undefined) {
      const score = Number(body.score); if (!Number.isInteger(score) || score < 0 || score > 100) return res.status(400).json({ error: "Score debe estar entre 0 y 100." });
      next.score = score;
    }
    if (typeof body.notes === "string") next.notesEncrypted = body.notes ? crmEncrypt(body.notes.slice(0, 4000)) : "";
    await fsCommit([
      fsUpdate("crmLeads", id, next),
      auditWrite(user.uid, "crm.lead.updated", "embudo.leads", id, { stage: before.stage, assignedTo: before.assignedTo }, { stage: next.stage, assignedTo: next.assignedTo, score: next.score }),
      fsCreate("outbox", "crm_lead_updated_" + id + "_" + Date.now(), { eventId: "crm.lead.updated." + id + "." + Date.now(), type: "crm.lead.updated.v1", aggregate: "crmLead", aggregateId: id, schemaVersion: 1, payload: { leadId: id, stage: next.stage }, status: "pending", attempts: 0, createdAt: next.updatedAt })
    ]);
    return res.json({ item: crmLeadView(id, next) });
  } catch (error: any) {
    console.error("[CRM] Lead update failed:", error);
    return res.status(500).json({ error: "No se pudo actualizar el lead." });
  }
});

app.get("/api/admin/crm/interactions", async (req, res) => {
  try {
    const user = await backofficeAdmin(req, res, "crm"); if (!user) return;
    const [interactions, leads] = await Promise.all([fsListDocuments("crmInteractions", 200), fsListDocuments("crmLeads", 200)]);
    const isSuperAdmin = user.email?.toLowerCase() === "safeness.c.a@gmail.com";
    const allowedLeadIds = new Set(leads.filter(lead => isSuperAdmin || lead.assignedTo === user.uid).map(lead => lead.id));
    const leadId = String(req.query.leadId || "");
    const items = interactions.filter(item => allowedLeadIds.has(item.leadId) && (!leadId || item.leadId === leadId))
      .map(({ id, ...item }) => ({ id, ...item, leadName: crmDecrypt(leads.find(lead => lead.id === item.leadId)?.fullNameEncrypted || ""), notes: item.notesEncrypted ? crmDecrypt(item.notesEncrypted) : "" }))
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return res.json({ items, total: items.length, limit: 200 });
  } catch (error: any) {
    console.error("[CRM] Interaction list failed:", error);
    return res.status(500).json({ error: "No se pudieron consultar los intentos de contacto." });
  }
});

app.post("/api/admin/crm/leads/:id/interactions", async (req, res) => {
  try {
    const user = await backofficeAdmin(req, res, "crm"); if (!user) return;
    const leadId = idSafe(String(req.params.id || "")), lead = await fsGet("crmLeads", leadId);
    if (!lead || (user.email?.toLowerCase() !== "safeness.c.a@gmail.com" && lead.assignedTo !== user.uid)) return res.status(404).json({ error: "Lead no encontrado." });
    const body = req.body || {}, channel = String(body.channel || ""), outcome = String(body.outcome || "");
    if (!["call", "whatsapp", "email", "meeting", "sms"].includes(channel) || !["no_answer", "left_message", "interested", "not_interested", "scheduled"].includes(outcome)) return res.status(400).json({ error: "Canal u resultado de contacto inválido." });
    const id = randomBytes(16).toString("hex"), now = new Date().toISOString();
    const record = { leadId, channel, outcome, notesEncrypted: body.notes ? crmEncrypt(String(body.notes).slice(0, 2000)) : "", nextActionAt: body.nextActionAt ? new Date(body.nextActionAt).toISOString() : null, actorId: user.uid, createdAt: now };
    await fsCommit([
      fsCreate("crmInteractions", id, record),
      auditWrite(user.uid, "crm.interaction.created", "embudo.intentos-contacto", id, null, { leadId, channel, outcome, nextActionAt: record.nextActionAt })
    ]);
    return res.status(201).json({ id, leadId, channel, outcome, nextActionAt: record.nextActionAt, createdAt: now });
  } catch (error: any) {
    console.error("[CRM] Interaction create failed:", error);
    return res.status(500).json({ error: "No se pudo registrar el intento de contacto." });
  }
});

app.post("/api/admin/crm/leads/:id/convert-to-enrollment", async (req, res) => {
  let transaction = "";
  try {
    const user = await backofficeAdmin(req, res, "crm"); if (!user) return;
    const leadId = idSafe(String(req.params.id || "")), studentUid = String(req.body?.studentUid || ""), courseId = String(req.body?.courseId || "");
    if (!studentUid || !courseId || studentUid.length > 180 || courseId.length > 180) return res.status(400).json({ error: "Se requiere UID del alumno y curso." });
    transaction = await beginFirestoreTransaction();
    const [lead, student, course] = await Promise.all([
      fsGetInTransaction("crmLeads", leadId, transaction),
      fsGetInTransaction("users", studentUid, transaction),
      fsGetInTransaction("courses", courseId, transaction)
    ]);
    if (!lead || (user.email?.toLowerCase() !== "safeness.c.a@gmail.com" && lead.assignedTo !== user.uid) || !student || student.role !== "alumno") return res.status(404).json({ error: "Lead o cuenta de alumno no encontrados." });
    if (!["qualified", "contacted"].includes(String(lead.stage)) || lead.consentGdpr !== true) return res.status(409).json({ error: "Solo se convierte un lead contactado/calificado con consentimiento LGPD registrado." });
    if (!course || !["published", "active"].includes(String(course.status || ""))) return res.status(409).json({ error: "El curso no está publicado o disponible." });
    if (lead.courseInterest && lead.courseInterest !== courseId) return res.status(409).json({ error: "El curso seleccionado no coincide con el interés registrado." });
    const enrollmentId = idSafe(studentUid + "_" + courseId);
    const existingEnrollment = await fsGetInTransaction("enrollments", enrollmentId, transaction);
    if (existingEnrollment) return res.status(409).json({ error: "El alumno ya tiene una matrícula para este curso." });
    const now = new Date().toISOString(), isFree = Number(course.price || 0) <= 0;
    const enrollment = {
      userId: studentUid, studentName: student.displayName || student.name || crmDecrypt(lead.fullNameEncrypted),
      studentEmail: student.email || "", studentAvatar: student.photoURL || "", courseId, leadId,
      progress: 0, completed: false, courseCompleted: false, status: isFree ? "active" : "pending_payment",
      paymentStatus: isFree ? "not_required" : "pending_verification", paymentOrderId: "", createdAt: now, updatedAt: now
    };
    const nextLead = { ...lead, stage: "enrolled", enrolledAt: now, enrollmentId, updatedAt: now, updatedBy: user.uid };
    await fsCommitTransaction([
      fsCreate("enrollments", enrollmentId, enrollment),
      fsUpdate("crmLeads", leadId, nextLead),
      auditWrite(user.uid, "crm.lead.converted", "embudo.inscripciones-confirmadas", leadId, { stage: lead.stage }, { stage: "enrolled", enrollmentId, studentUid, courseId }),
      fsCreate("outbox", "crm_lead_converted_" + leadId, { eventId: "crm.lead.converted." + leadId, type: "crm.lead.converted.v1", aggregate: "crmLead", aggregateId: leadId, schemaVersion: 1, payload: { leadId, enrollmentId, studentUid, courseId }, status: "pending", attempts: 0, createdAt: now })
    ], transaction);
    transaction = "";
    return res.status(201).json({ leadId, enrollmentId, status: enrollment.status, paymentStatus: enrollment.paymentStatus });
  } catch (error: any) {
    console.error("[CRM] Lead conversion failed:", error);
    return res.status(error.status === 409 ? 409 : 500).json({ error: error.message || "No se pudo convertir el lead." });
  }
});

// Server-priced checkout and signed provider webhooks. No browser amount is trusted.
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const user = await verifiedUser(req, res);
    if (!user) return;
    const requestedItems = Array.isArray(req.body?.items) ? req.body.items : (Array.isArray(req.body?.itemIds) ? req.body.itemIds : (typeof req.body?.courseId === "string" ? req.body.courseId.split(",") : []));
    const ids = requestedItems.map((item: any) => typeof item === "string" ? { id: item, quantity: 1 } : item);
    const provider = req.body?.provider === "mercadopago" ? "mercadopago" : "stripe";
    const globalPaymentSettings=await fsGet("paymentSettings","global");
    if(globalPaymentSettings?.paymentsEnabled===false)return res.status(503).json({error:"El checkout está temporalmente deshabilitado por administración."});
    const gatewaySettings=await fsGet("paymentGateways",provider);
    if(gatewaySettings && gatewaySettings.enabled!==true)return res.status(503).json({error:"Esta pasarela está deshabilitada por administración."});
    if (!ids.length || ids.length > 20 || ids.some((item: any) => !item || typeof item.id !== "string" || item.id.length > 160 || !Number.isInteger(Number(item.quantity || 1)) || Number(item.quantity || 1) < 1 || Number(item.quantity || 1) > 20)) return res.status(400).json({ error: "Selecciona productos válidos." });
    const items: any[] = [];
    for (const requested of ids) {
      const id = requested.id;
      const product = await catalogItem(id);
      if (!product || !(["published", "active"].includes(String(product.status || "").toLowerCase()) || product.isActive === true || product.active === true)) return res.status(400).json({ error: "Producto no disponible o no publicado: " + id });
      const price = Number(product.collectionName==="paymentPlans" ? Number(product.amountCents||0)/100 : (product.price ?? product.amount));
      if (!Number.isFinite(price) || price <= 0 || price > 100000) return res.status(400).json({ error: "Precio inválido en catálogo para " + id });
      if (product.collectionName === "books" && product.type === "link" && price > 0) return res.status(400).json({ error: "Los libros de pago deben almacenarse como PDF protegido en Firebase Storage." });
      items.push({ id, title: String(product.title || product.name || "Producto KIRA").slice(0, 250), type: (product.type === "membership" || product.collectionName === "membershipPlans" || product.collectionName === "paymentPlans") ? "membership" : (product.collectionName === "courses" ? "course" : (product.collectionName === "books" ? "book" : (product.type || "product")) ), collectionName: product.collectionName, durationDays: product.collectionName === "paymentPlans" ? (product.interval==="yearly"?365:product.interval==="monthly"?30:0) : (product.collectionName === "membershipPlans" ? Math.max(1, Math.min(3650, Number(product.durationDays || 365))) : undefined), interval: product.collectionName==="paymentPlans" ? String(product.interval||"one_time") : "one_time", unitPrice: price, currency: String(product.currency || (provider === "mercadopago" ? "brl" : "usd")).toLowerCase(), quantity: Number(requested.quantity || 1) });
    }
    const allowedCurrencies=(globalPaymentSettings?.allowedCurrencies||["BRL","USD","EUR"]).map((value:any)=>String(value).toLowerCase());
    if(items.some(item=>!allowedCurrencies.includes(item.currency)))return res.status(400).json({error:"La moneda del producto no está permitida por la configuración de KIRA."});
    if (new Set(items.map(x => x.currency)).size !== 1) return res.status(400).json({ error: "Los productos deben usar la misma moneda." });
    const hasRecurring=items.some(item=>item.interval==="monthly"||item.interval==="yearly");
    if(hasRecurring&&items.some(item=>item.interval==="one_time"))return res.status(400).json({error:"No se pueden mezclar planes recurrentes y pagos únicos en una misma orden."});
    if(hasRecurring&&provider==="mercadopago")return res.status(400).json({error:"Los planes recurrentes por Mercado Pago aún no están habilitados; usa Stripe o un plan de pago único."});
    const stripeSecret=gatewaySettings?.apiKeyEncrypted?decryptPaymentSecret(gatewaySettings.apiKeyEncrypted):process.env.STRIPE_SECRET_KEY;
    const stripe = provider === "stripe" && stripeSecret ? new Stripe(stripeSecret,{apiVersion:"2025-01-27" as any}) : null;
    const mercadoPagoToken = gatewaySettings?.apiKeyEncrypted?decryptPaymentSecret(gatewaySettings.apiKeyEncrypted):process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (provider === "stripe" && !stripe) return res.status(503).json({ error: "Stripe no está configurado en el servidor. Configura su clave en el Centro de pagos." });
    if (provider === "mercadopago" && !mercadoPagoToken) return res.status(503).json({ error: "Mercado Pago no está configurado en el servidor." });
    const orderId = randomBytes(18).toString("hex");
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    await fsCommit([fsCreate("orders", orderId, { userId: user.uid, provider, status: "pending", currency: items[0].currency, amount: total, items, createdAt: new Date().toISOString() })]);
    const appUrl = (process.env.KIRA_APP_URL || "https://kira.coach").replace(/\/$/, "");
    if (provider === "stripe") {
      const session = await stripe!.checkout.sessions.create({
        mode: hasRecurring ? "subscription" : "payment",
        line_items: items.map(item => ({ quantity: item.quantity, price_data: { currency: item.currency, unit_amount: Math.round(item.unitPrice * 100), ...(item.interval==="monthly"?{recurring:{interval:"month"}}:item.interval==="yearly"?{recurring:{interval:"year"}}:{}), product_data: { name: item.title } } })),
        client_reference_id: user.uid, metadata: { userId: user.uid, orderId },
        success_url: appUrl + "/dashboard?payment=processing&session_id={CHECKOUT_SESSION_ID}",
        cancel_url: appUrl + "/dashboard?payment=cancelled"
      });
      const order = await fsGet("orders", orderId);
      await fsCommit([fsUpdate("orders", orderId, { ...order, providerSessionId: session.id, checkoutUrl: session.url })]);
      return res.json({ url: session.url, orderId, provider });
    }
    const preferenceResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST", headers: { Authorization: "Bearer " + mercadoPagoToken, "Content-Type": "application/json", "X-Idempotency-Key": orderId },
      body: JSON.stringify({
        external_reference: orderId, notification_url: appUrl + "/api/webhooks/mercadopago",
        items: items.map(item => ({ id: item.id, title: item.title, quantity: item.quantity, currency_id: item.currency.toUpperCase(), unit_price: item.unitPrice })),
        back_urls: { success: appUrl + "/dashboard?payment=processing", pending: appUrl + "/dashboard?payment=pending", failure: appUrl + "/dashboard?payment=cancelled" },
        auto_return: "approved", payer: user.email ? { email: user.email } : undefined
      })
    });
    if (!preferenceResponse.ok) throw new Error("Mercado Pago no pudo crear la preferencia.");
    const preference = await preferenceResponse.json() as any;
    const order = await fsGet("orders", orderId);
    await fsCommit([fsUpdate("orders", orderId, { ...order, providerPreferenceId: preference.id, checkoutUrl: preference.init_point })]);
    return res.json({ url: preference.init_point, orderId, provider });
  } catch (error: any) {
    console.error("[Payments] Checkout failed:", error);
    return res.status(500).json({ error: error.message || "No fue posible iniciar el pago." });
  }
});

app.post("/api/webhooks/stripe", async (req: any, res) => {
  try {
  const signature = req.headers["stripe-signature"];
  const gateway=await fsGet("paymentGateways","stripe");
  const stripeSecret=gateway?.apiKeyEncrypted?decryptPaymentSecret(gateway.apiKeyEncrypted):process.env.STRIPE_SECRET_KEY;
  const webhookSecret=gateway?.webhookSecretEncrypted?decryptPaymentSecret(gateway.webhookSecretEncrypted):process.env.STRIPE_WEBHOOK_SECRET;
  const stripe=stripeSecret?new Stripe(stripeSecret,{apiVersion:"2025-01-27" as any}):null;
  if (!stripe || typeof signature !== "string" || !req.rawBody || !webhookSecret) return res.status(400).send("Webhook no configurado o firma ausente.");
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret); }
  catch { return res.status(400).send("Firma inválida."); }
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = await stripe.checkout.sessions.retrieve((event.data.object as Stripe.Checkout.Session).id);
      if (session.payment_status !== "paid" || !session.metadata?.orderId) return res.status(200).json({ received: true, ignored: true });
      await fulfillOrder(session.metadata.orderId, "stripe", String(session.payment_intent || session.id), event.id, session.amount_total || 0, session.currency || "usd", session.metadata.userId);
    }
    return res.status(200).json({ received: true });
  } catch (error: any) {
    if (error.status === 409) return res.status(200).json({ received: true, duplicate: true });
    console.error("[Stripe] Fulfillment failed:", error);
    return res.status(500).json({ error: "Confirmación pendiente; Stripe podrá reintentar el webhook." });
  }
  } catch(error:any) {
    console.error("[Stripe] Webhook configuration failed:",error);
    return res.status(503).json({error:"Webhook de Stripe temporalmente no disponible."});
  }
});

app.post("/api/webhooks/mercadopago", async (req: any, res) => {
  try {
    const gateway=await fsGet("paymentGateways","mercadopago");
    const secret = gateway?.webhookSecretEncrypted?decryptPaymentSecret(gateway.webhookSecretEncrypted):(process.env.MERCADOPAGO_WEBHOOK_SECRET||"");
    const signature = String(req.headers["x-signature"] || "");
    const requestId = String(req.headers["x-request-id"] || "");
    const paymentId = String(req.query["data.id"] || req.body?.data?.id || "");
    if (!secret || !signature || !requestId || !paymentId) return res.status(401).send("Firma ausente.");
    const parts: any = Object.fromEntries(signature.split(",").map((p: string) => p.trim().split("=").map(x => x.trim())));
    const signatureTimestamp=Number(parts.ts);
    const signatureTimestampMs=signatureTimestamp<1e12?signatureTimestamp*1000:signatureTimestamp;
    if(!Number.isFinite(signatureTimestampMs)||Math.abs(Date.now()-signatureTimestampMs)>5*60*1000)return res.status(401).send("Firma expirada.");
    const manifest = "id:" + paymentId.toLowerCase() + ";request-id:" + requestId + ";ts:" + parts.ts + ";";
    const expected = createHmac("sha256", secret).update(manifest).digest("hex");
    if (!parts.v1 || parts.v1.length !== expected.length || !timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected))) return res.status(401).send("Firma inválida.");
    const token = gateway?.apiKeyEncrypted?decryptPaymentSecret(gateway.apiKeyEncrypted):process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) return res.status(503).send("Mercado Pago no configurado.");
    const response = await fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(paymentId), { headers: { Authorization: "Bearer " + token } });
    if (!response.ok) throw new Error("No fue posible consultar el pago.");
    const payment = await response.json() as any;
    if (payment.status !== "approved" || !payment.external_reference) return res.status(200).json({ received: true, ignored: true });
    await fulfillOrder(String(payment.external_reference), "mercadopago", String(payment.id), "payment_" + payment.id + "_" + payment.status, Math.round(Number(payment.transaction_amount) * 100), String(payment.currency_id || "").toLowerCase());
    return res.status(200).json({ received: true });
  } catch (error: any) {
    if (error.status === 409) return res.status(200).json({ received: true, duplicate: true });
    console.error("[MercadoPago] Fulfillment failed:", error);
    return res.status(500).json({ error: "Confirmación pendiente; Mercado Pago podrá reintentar el webhook." });
  }
});

app.get("/api/books/:bookId/download", async (req, res) => {
  try {
    const user = await verifiedUser(req, res);
    if (!user) return;
    const bookId = String(req.params.bookId || "");
    if (!bookId || bookId.length > 160) return res.status(400).json({ error: "Libro no válido." });
    const book = await fsGet("books", bookId);
    if (!book || book.status !== "published") return res.status(404).json({ error: "Libro no disponible." });
    const isFree = Number(book.price || 0) === 0;
    const entitlementId = idSafe(user.uid + "_" + bookId);
    const entitlement = isFree ? null : await fsGet("bookEntitlements", entitlementId);
    if (!isFree && (!entitlement || entitlement.status !== "active" || entitlement.paymentStatus !== "paid")) {
      return res.status(403).json({ error: "Debes comprar este libro para acceder al archivo." });
    }
    const asset = await fsGet("bookAssets", bookId);
    if (!asset) return res.status(404).json({ error: "El archivo de este libro todavía no está configurado." });
    if (asset.externalUrl && typeof asset.externalUrl === "string" && /^https:\/\//i.test(asset.externalUrl)) {
      return res.json({ url: asset.externalUrl, type: "external" });
    }
    if (!asset.storagePath || typeof asset.storagePath !== "string" || asset.storagePath.includes("..")) {
      return res.status(404).json({ error: "El archivo del libro no está disponible." });
    }
    const bucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET;
    if (!bucket) return res.status(503).json({ error: "Firebase Storage no está configurado en el servidor." });
    const mediaUrl = "https://storage.googleapis.com/storage/v1/b/" + encodeURIComponent(bucket) + "/o/" + encodeURIComponent(asset.storagePath) + "?alt=media";
    const fileResponse = await fetch(mediaUrl, { headers: { Authorization: "Bearer " + await firestoreToken() } });
    if (!fileResponse.ok) return res.status(502).json({ error: "No fue posible recuperar el archivo del libro." });
    const bytes = Buffer.from(await fileResponse.arrayBuffer());
    res.setHeader("Content-Type", fileResponse.headers.get("content-type") || "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename*=UTF-8''" + encodeURIComponent(String(book.title || "KIRA-book")) + ".pdf");
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).send(bytes);
  } catch (error: any) {
    console.error("[Books] Protected download failed:", error);
    return res.status(500).json({ error: "No fue posible abrir el libro." });
  }
});


const certificateIssueLimits = new Map<string, { count:number; resetAt:number }>();
function certificateSecret(): string {
  const secret = process.env.CERT_SECRET || process.env.KIRA_CERTIFICATE_SIGNING_SECRET || "";
  if (secret.length < 32) throw new Error("Configura CERT_SECRET con al menos 32 caracteres en Vercel.");
  return secret;
}
function certificateCanonical(data:any): string {
  return JSON.stringify(Object.keys(data).sort().reduce((o:any,k)=>{o[k]=data[k];return o;},{}));
}
function certificateHmac(data:any): string {
  return createHmac("sha256",certificateSecret()).update(certificateCanonical(data)).digest("hex");
}
async function readPrivateCertificateAsset(storagePath:string):Promise<Buffer> {
  if (!storagePath.startsWith("certificates/private/") || storagePath.includes("..")) throw new Error("Ruta de activo institucional no válida.");
  const bucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET;
  if (!bucket) throw new Error("FIREBASE_STORAGE_BUCKET no está configurado.");
  const url = "https://storage.googleapis.com/storage/v1/b/"+encodeURIComponent(bucket)+"/o/"+encodeURIComponent(storagePath)+"?alt=media";
  const response = await fetch(url,{headers:{Authorization:"Bearer "+await firestoreToken()}});
  if (!response.ok) throw new Error("No se pudo leer un activo privado del certificado ("+response.status+").");
  return Buffer.from(await response.arrayBuffer());
}
async function savePrivateCertificatePdf(storagePath:string,bytes:Buffer):Promise<void> {
  const bucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET;
  if (!bucket) throw new Error("FIREBASE_STORAGE_BUCKET no está configurado.");
  const url = "https://storage.googleapis.com/upload/storage/v1/b/"+encodeURIComponent(bucket)+"/o?uploadType=media&name="+encodeURIComponent(storagePath);
  const response = await fetch(url,{method:"POST",headers:{Authorization:"Bearer "+await firestoreToken(),"Content-Type":"application/pdf","Cache-Control":"private, no-store"},body:bytes});
  if (!response.ok) throw new Error("No se pudo guardar el PDF en Storage privado ("+response.status+").");
}
function pngData(buffer:Buffer):string { return "data:image/png;base64,"+buffer.toString("base64"); }

app.get("/api/certificates/preview-assets",async(req,res)=>{
  try{
    const user=await verifiedUser(req,res);if(!user)return;
    const admin=await fsGet("users",user.uid);
    if(user.emailVerified!==true||admin?.role!=="admin")return res.status(403).json({error:"Solo administradores verificados pueden previsualizar los certificados."});
    const coachId=String(req.query.coachId||"");
    if(!coachId)return res.status(400).json({error:"Selecciona un coach."});
    const branding=await fsGet("settings","certificateBranding");
    const logoPath=String(branding?.logoStoragePath||"");
    const adminPath=String(branding?.adminSignatureStoragePath||"");
    const coachPath=String(branding?.coachSignaturePaths?.[coachId]||"");
    if(!logoPath||!adminPath||!coachPath)return res.status(409).json({error:"Faltan activos institucionales para la vista previa."});
    const [logo,adminSignature,coachSignature]=await Promise.all([readPrivateCertificateAsset(logoPath),readPrivateCertificateAsset(adminPath),readPrivateCertificateAsset(coachPath)]);
    return res.json({logo:pngData(logo),adminSignature:pngData(adminSignature),coachSignature:pngData(coachSignature)});
  }catch(error:any){console.error("[Certificates] Preview assets failed:",error);return res.status(500).json({error:"No se pudieron cargar los activos privados."});}
});

app.post("/api/certificates", async (req,res) => {
  try {
    const user = await verifiedUser(req,res);
    if (!user) return;
    const admin = await fsGet("users",user.uid);
    if (user.emailVerified !== true || admin?.role !== "admin") return res.status(403).json({error:"Solo administradores verificados pueden emitir certificados."});
    const now = Date.now();
    const previous = certificateIssueLimits.get(user.uid);
    if (previous && previous.resetAt > now && previous.count >= 10) return res.status(429).json({error:"Límite de emisión alcanzado. Inténtalo dentro de un minuto."});
    if (!previous || previous.resetAt <= now) certificateIssueLimits.set(user.uid,{count:1,resetAt:now+60000}); else previous.count++;
    const {studentId,courseId,coachId,enrollmentId,academicHours,notes} = req.body || {};
    if (![studentId,courseId,coachId,enrollmentId].every(x=>typeof x==="string" && x.length>0 && x.length<=180) || !Number.isInteger(academicHours) || academicHours<1 || academicHours>999 || (notes && (typeof notes!=="string" || notes.length>2000))) return res.status(400).json({error:"Datos del certificado incompletos o inválidos."});
    const [student,course,coach,enrollment,branding] = await Promise.all([
      fsGet("users",studentId),fsGet("courses",courseId),fsGet("users",coachId),fsGet("enrollments",enrollmentId),fsGet("settings","certificateBranding")
    ]);
    if (!student || student.role!=="alumno" || !course || !coach || coach.role!=="coach" || coach.approvalStatus!=="approved") return res.status(404).json({error:"Alumno, curso o coach no válidos."});
    if (String(course.coachId)!==coachId) return res.status(409).json({error:"El coach seleccionado no es responsable del curso."});
    if (!enrollment || enrollment.userId!==studentId || enrollment.courseId!==courseId || !(enrollment.completed===true || enrollment.courseCompleted===true || Number(enrollment.progress)>=100)) return res.status(409).json({error:"No existe una matrícula completada para ese alumno y curso."});
    if (Number(course.price||0)>0 && enrollment.paymentStatus!=="paid") return res.status(409).json({error:"El pago del curso no está verificado por webhook."});
    const logoPath=String(branding?.logoStoragePath||"");
    const adminSignaturePath=String(branding?.adminSignatureStoragePath||"");
    const coachSignaturePath=String(branding?.coachSignaturePaths?.[coachId]||"");
    if (!logoPath || !adminSignaturePath || !coachSignaturePath) return res.status(409).json({error:"Faltan logo KIRA, firma del superadministrador o firma del coach en activos privados."});
    const [logoBytes,adminSignatureBytes,coachSignatureBytes] = await Promise.all([readPrivateCertificateAsset(logoPath),readPrivateCertificateAsset(adminSignaturePath),readPrivateCertificateAsset(coachSignaturePath)]);
    const logoHash=createHash("sha256").update(logoBytes).digest("hex");
    const issuedAt=new Date().toISOString();
    const year=new Date().getUTCFullYear();
    const kiraNumber="KIRA-"+year+"-"+randomBytes(6).toString("hex").toUpperCase();
    const studentName=String(student.displayName||student.name||"").trim();
    const courseName=String(course.title||course.name||"").trim();
    const coachName=String(coach.displayName||coach.name||"").trim();
    const adminName=String(admin.displayName||admin.name||admin.email||"Superadministrador KIRA").trim();
    if (!studentName || !courseName || !coachName) return res.status(409).json({error:"Los datos de identidad del alumno, curso o coach están incompletos."});
    const signedPayload={kiraNumber,studentId,studentName,courseId,courseName,coachId,coachName,academicHours,adminId:user.uid,adminName,watermarkHash:logoHash,issueDate:issuedAt,status:"issued"};
    const qrSignature=certificateHmac(signedPayload);
    const appUrl=(process.env.KIRA_APP_URL||"https://kira.coach").replace(/\/$/,"");
    const qrPayload=appUrl+"/verify/"+encodeURIComponent(kiraNumber)+"?sig="+qrSignature;
    const qrPng=await QRCode.toDataURL(qrPayload,{errorCorrectionLevel:"H",margin:1,width:360});
    const pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});
    pdf.setFillColor(250,249,246);pdf.rect(0,0,297,210,"F");
    pdf.setDrawColor(166,139,82);pdf.setLineWidth(0.8);pdf.rect(7,7,283,196);
    pdf.setDrawColor(185,185,178);pdf.setLineWidth(0.25);pdf.rect(10,10,277,190);
    pdf.saveGraphicsState();pdf.setGState(new (pdf as any).GState({opacity:0.10}));pdf.addImage(pngData(logoBytes),"PNG",83,45,130,85,undefined,"FAST");pdf.restoreGraphicsState();
    pdf.addImage(pngData(logoBytes),"PNG",17,15,30,18,undefined,"FAST");
    pdf.setTextColor(42,57,62);pdf.setFont("times","bold");pdf.setFontSize(15);pdf.text("KIRA COACH",148.5,24,{align:"center",charSpace:2});
    pdf.setFontSize(23);pdf.text("CERTIFICADO DE CONCLUSIÓN",148.5,43,{align:"center"});
    pdf.setFont("times","normal");pdf.setFontSize(13);pdf.setTextColor(70,75,78);pdf.text("Se certifica que",148.5,66,{align:"center"});
    pdf.setFont("times","bold");pdf.setFontSize(28);pdf.setTextColor(32,88,88);pdf.text(studentName,148.5,83,{align:"center",maxWidth:235});
    pdf.setFont("times","normal");pdf.setFontSize(13);pdf.setTextColor(70,75,78);pdf.text("ha concluido satisfactoriamente el curso",148.5,98,{align:"center"});
    pdf.setFont("times","bold");pdf.setFontSize(19);pdf.setTextColor(32,88,88);pdf.text(courseName,148.5,112,{align:"center",maxWidth:235});
    pdf.setFont("helvetica","normal");pdf.setFontSize(11);pdf.setTextColor(75,80,82);pdf.text(academicHours+" horas académicas · Coach: "+coachName,148.5,124,{align:"center",maxWidth:240});
    pdf.addImage(pngData(adminSignatureBytes),"PNG",35,139,48,17,undefined,"FAST");
    pdf.addImage(pngData(coachSignatureBytes),"PNG",119,139,48,17,undefined,"FAST");
    pdf.addImage(qrPng,"PNG",239,136,32,32,undefined,"FAST");
    pdf.setDrawColor(150,150,145);pdf.line(24,158,94,158);pdf.line(108,158,178,158);
    pdf.setFont("helvetica","bold");pdf.setFontSize(8);pdf.setTextColor(65,70,72);
    pdf.text("EMISOR AUTORIZADO",59,163,{align:"center"});pdf.text("COACH RESPONSABLE",143,163,{align:"center"});
    pdf.setFont("helvetica","normal");pdf.setFontSize(8);pdf.text("Superadministrador KIRA",59,168,{align:"center"});pdf.text("KIRA COACH",143,168,{align:"center"});
    pdf.setFontSize(8);pdf.setTextColor(85,90,92);pdf.text("Fecha de emisión: "+new Date(issuedAt).toLocaleDateString("es-ES",{timeZone:"UTC"})+" · Verificación pública mediante QR",148.5,183,{align:"center"});
    pdf.setFont("helvetica","bold");pdf.text("N.º KIRA — "+kiraNumber,148.5,189,{align:"center"});
    pdf.setFont("helvetica","normal");pdf.setFontSize(7);pdf.text("Creado por SAFENESS.INC",148.5,195,{align:"center"});
    const pdfBytes=Buffer.from(pdf.output("arraybuffer"));
    const pdfPath="certificates/private/pdf/"+kiraNumber+".pdf";
    await savePrivateCertificatePdf(pdfPath,pdfBytes);
    const record={...signedPayload,logoStoragePath:logoPath,adminSignatureStoragePath:adminSignaturePath,coachSignatureStoragePath:coachSignaturePath,watermarkHash:logoHash,qrPayload,qrSignature,pdfStoragePath:pdfPath,pdfUrl:appUrl+"/api/certificates/"+encodeURIComponent(kiraNumber)+"/pdf",notes:notes||"",createdBy:user.uid,issuedBy:user.uid,createdAt:issuedAt,updatedAt:issuedAt,signatureAlgorithm:"HMAC-SHA256"};
    const publicRecord={kiraNumber,studentName,courseName,coachName,academicHours,issueDate:issuedAt,status:"issued",qrSignature};
    const auditId=idSafe(kiraNumber+"_issued");
    await fsCommit([
      fsCreate("certificates",kiraNumber,record),
      fsCreate("certificatePublic",kiraNumber,publicRecord),
      fsCreate("certificate_audit",auditId,{certificateId:kiraNumber,action:"issued",createdBy:user.uid,issuedBy:user.uid,ip:String(req.headers["x-forwarded-for"]||req.socket.remoteAddress||"").slice(0,200),userAgent:String(req.headers["user-agent"]||"").slice(0,500),timestamp:issuedAt,createdAt:issuedAt})
    ]);
    return res.status(201).json({kiraNumber,pdfUrl:record.pdfUrl,qrUrl:qrPayload,issueDate:issuedAt});
  } catch(error:any) {
    console.error("[Certificates] Issue failed:",error);
    return res.status(500).json({error:error.message||"No fue posible emitir el certificado."});
  }
});

app.get("/api/verify/:kiraNumber",async(req,res)=>{
  try {
    const kiraNumber=String(req.params.kiraNumber||"");
    const signature=String(req.query.sig||"");
    if(!/^KIRA-\\d{4}-[A-F0-9]{12}$/.test(kiraNumber)||!/^([a-f0-9]{64})$/.test(signature)) return res.status(404).json({valid:false,status:"not_found"});
    const record=await fsGet("certificates",kiraNumber);
    if(!record) return res.status(404).json({valid:false,status:"not_found"});
    const payload={kiraNumber:record.kiraNumber,studentId:record.studentId,studentName:record.studentName,courseId:record.courseId,courseName:record.courseName,coachId:record.coachId,coachName:record.coachName,academicHours:record.academicHours,adminId:record.adminId,adminName:record.adminName,watermarkHash:record.watermarkHash,issueDate:record.issueDate,status:"issued"};
    const expected=certificateHmac(payload);
    const valid=signature.length===expected.length&&timingSafeEqual(Buffer.from(signature),Buffer.from(expected))&&record.qrSignature===signature;
    if(!valid) return res.status(200).json({valid:false,status:"invalid_signature"});
    if(record.status==="revoked") return res.status(200).json({valid:false,status:"revoked",certificate:{kiraNumber,studentName:record.studentName,courseName:record.courseName,academicHours:record.academicHours,issueDate:record.issueDate}});
    return res.status(200).json({valid:true,status:"issued",certificate:{kiraNumber,studentName:record.studentName,courseName:record.courseName,academicHours:record.academicHours,coachName:record.coachName,issueDate:record.issueDate}});
  }catch(error){console.error("[Certificates] Public verification failed:",error);return res.status(503).json({valid:false,status:"unavailable"});}
});


app.get("/api/certificates/validate/:token",async(req,res)=>{
  try{
    const token=String(req.params.token||"");
    if(!/^[a-f0-9]{48}$/.test(token))return res.status(404).json({valid:false});
    const record=await fsGet("certificatePublic",token);
    if(!record||record.status!=="issued"||record.validationToken!==token)return res.status(404).json({valid:false});
    const full=await fsGet("certificates",String(record.certificateNumber||""));
    if(!full)return res.status(404).json({valid:false});
    const {signature,signatureAlgorithm,...payload}=full;
    const expected=certSignature(payload);const actual=String(signature||"");
    const valid=actual.length===expected.length&&timingSafeEqual(Buffer.from(actual),Buffer.from(expected));
    return res.status(200).json({valid,certificate:valid?record:null});
  }catch(error){console.error("[Certificates] Legacy validation failed:",error);return res.status(503).json({valid:false});}
});

app.get("/api/certificates/:kiraNumber/pdf",async(req,res)=>{
  try{
    const user=await verifiedUser(req,res);if(!user)return;
    const kiraNumber=String(req.params.kiraNumber||"");
    const record=await fsGet("certificates",kiraNumber);
    if(!record)return res.status(404).json({error:"Certificado no encontrado."});
    if(user.uid!==record.studentId && user.uid!==record.adminId)return res.status(403).json({error:"No tienes permiso para descargar este certificado."});
    const bucket=process.env.FIREBASE_STORAGE_BUCKET||process.env.VITE_FIREBASE_STORAGE_BUCKET;
    const url="https://storage.googleapis.com/storage/v1/b/"+encodeURIComponent(bucket||"")+"/o/"+encodeURIComponent(record.pdfStoragePath)+"?alt=media";
    const file=await fetch(url,{headers:{Authorization:"Bearer "+await firestoreToken()}});
    if(!file.ok)return res.status(502).json({error:"El PDF privado no está disponible."});
    const bytes=Buffer.from(await file.arrayBuffer());
    res.setHeader("Content-Type","application/pdf");res.setHeader("Content-Disposition",'attachment; filename="'+kiraNumber+'.pdf"');res.setHeader("Cache-Control","private, no-store");return res.status(200).send(bytes);
  }catch(error){console.error("[Certificates] PDF download failed:",error);return res.status(500).json({error:"No fue posible descargar el certificado."});}
});

app.post("/api/certificates/:kiraNumber/revoke",async(req,res)=>{
  try{
    const user=await verifiedUser(req,res);if(!user)return;
    const admin=await fsGet("users",user.uid);
    if(user.emailVerified!==true||admin?.role!=="admin")return res.status(403).json({error:"Solo administradores verificados pueden revocar certificados."});
    const kiraNumber=String(req.params.kiraNumber||"");const record=await fsGet("certificates",kiraNumber);
    if(!record)return res.status(404).json({error:"Certificado no encontrado."});
    if(record.status==="revoked")return res.json({status:"revoked"});
    const nowIso=new Date().toISOString();
    await fsCommit([fsUpdate("certificates",kiraNumber,{...record,status:"revoked",revokedAt:nowIso,revokedBy:user.uid,updatedAt:nowIso}),fsUpdate("certificatePublic",kiraNumber,{...(await fsGet("certificatePublic",kiraNumber)),status:"revoked"}),fsCreate("certificate_audit",idSafe(kiraNumber+"_revoked_"+Date.now()),{certificateId:kiraNumber,action:"revoked",issuedBy:user.uid,ip:String(req.headers["x-forwarded-for"]||req.socket.remoteAddress||"").slice(0,200),userAgent:String(req.headers["user-agent"]||"").slice(0,500),timestamp:nowIso,createdAt:nowIso})]);
    return res.json({status:"revoked"});
  }catch(error:any){console.error("[Certificates] Revocation failed:",error);return res.status(500).json({error:"No fue posible revocar el certificado."});}
});

async function startLocalServer() {
  const PORT = 3000;
  
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        ws: false
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Only used locally if NODE_ENV=production, not triggered on Vercel serverless.
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", async (clientWs) => {
    let session: any = null;
    
    clientWs.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        // Setup initial Live connection
        if (msg.type === "setup") {
          try {
            const ai = getGeminiAI();
            session = await ai.live.connect({
              model: "gemini-3.1-flash-live-preview",
              config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: msg.systemInstruction || "You are a helpful assistant.",
                inputAudioTranscription: {},
              },
              callbacks: {
                onmessage: (geminiMsg: any) => {
                  if (clientWs.readyState === 1) { // OPEN
                    clientWs.send(JSON.stringify(geminiMsg));
                  }
                },
              },
            });
          } catch (err: any) {
            console.error("Failed to connect to Gemini Live session:", err);
            if (clientWs.readyState === 1) {
              clientWs.send(JSON.stringify({ error: err.message || "Failed to connect to Gemini Live session." }));
            }
            clientWs.close();
          }
        } else if (msg.audio) {
          if (session) {
            session.sendRealtimeInput({
              audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        }
      } catch (e: any) {
        console.error("Error handling ws message on server:", e);
      }
    });

    clientWs.on("close", () => {
      if (session) {
        try {
          session.close();
        } catch (e) {
          console.error("Error closing Gemini session:", e);
        }
      }
    });
  });

  server.on("upgrade", (request, socket, head) => {
    const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : "";
    if (pathname === "/api/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please try restarting the dev server.`);
      process.exit(1);
    } else {
      console.error('Server error:', e);
      process.exit(1);
    }
  });
}

if (!process.env.VERCEL) {
  startLocalServer();
}

// Export the Express API for Vercel
export default app;
