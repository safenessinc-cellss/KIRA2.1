import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import { GoogleGenAI, Modality } from "@google/genai";
import { WebSocketServer } from "ws";
import compression from "compression";
import { verify as verifySignature, createSign, createHmac, createHash, timingSafeEqual, randomBytes } from "node:crypto";
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
async function catalogItem(id: string): Promise<any | null> {
  for (const collectionName of ["courses", "books", "products", "membershipPlans", "marketplace"]) {
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
      if (!(await fsGet("enrollments", enrollmentId))) writes.push(fsCreate("enrollments", enrollmentId, {
        userId: order.userId, studentName: buyerProfile?.displayName || buyerProfile?.name || "Alumno", studentEmail: buyerProfile?.email || "", studentAvatar: buyerProfile?.photoURL || "", courseId: item.id, progress: 0, completed: false, courseCompleted: false,
        paymentOrderId: orderId, paymentStatus: "paid", createdAt: new Date(now)
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

// Server-priced checkout and signed provider webhooks. No browser amount is trusted.
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const user = await verifiedUser(req, res);
    if (!user) return;
    const requestedItems = Array.isArray(req.body?.items) ? req.body.items : (Array.isArray(req.body?.itemIds) ? req.body.itemIds : (typeof req.body?.courseId === "string" ? req.body.courseId.split(",") : []));
    const ids = requestedItems.map((item: any) => typeof item === "string" ? { id: item, quantity: 1 } : item);
    const provider = req.body?.provider === "mercadopago" ? "mercadopago" : "stripe";
    if (!ids.length || ids.length > 20 || ids.some((item: any) => !item || typeof item.id !== "string" || item.id.length > 160 || !Number.isInteger(Number(item.quantity || 1)) || Number(item.quantity || 1) < 1 || Number(item.quantity || 1) > 20)) return res.status(400).json({ error: "Selecciona productos válidos." });
    const items: any[] = [];
    for (const requested of ids) {
      const id = requested.id;
      const product = await catalogItem(id);
      if (!product || !(["published", "active"].includes(String(product.status || "").toLowerCase()) || product.isActive === true || product.active === true)) return res.status(400).json({ error: "Producto no disponible o no publicado: " + id });
      const price = Number(product.price ?? product.amount);
      if (!Number.isFinite(price) || price <= 0 || price > 100000) return res.status(400).json({ error: "Precio inválido en catálogo para " + id });
      if (product.collectionName === "books" && product.type === "link" && price > 0) return res.status(400).json({ error: "Los libros de pago deben almacenarse como PDF protegido en Firebase Storage." });
      items.push({ id, title: String(product.title || product.name || "Producto KIRA").slice(0, 250), type: (product.type === "membership" || product.collectionName === "membershipPlans") ? "membership" : (product.collectionName === "courses" ? "course" : (product.collectionName === "books" ? "book" : (product.type || "product")) ), collectionName: product.collectionName, durationDays: product.collectionName === "membershipPlans" ? Math.max(1, Math.min(3650, Number(product.durationDays || 365))) : undefined, unitPrice: price, currency: String(product.currency || (provider === "mercadopago" ? "brl" : "usd")).toLowerCase(), quantity: Number(requested.quantity || 1) });
    }
    if (new Set(items.map(x => x.currency)).size !== 1) return res.status(400).json({ error: "Los productos deben usar la misma moneda." });
    const stripe = provider === "stripe" ? getStripe() : null;
    const mercadoPagoToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (provider === "stripe" && !stripe) return res.status(503).json({ error: "Stripe no está configurado en el servidor." });
    if (provider === "mercadopago" && !mercadoPagoToken) return res.status(503).json({ error: "Mercado Pago no está configurado en el servidor." });
    const orderId = randomBytes(18).toString("hex");
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    await fsCommit([fsCreate("orders", orderId, { userId: user.uid, provider, status: "pending", currency: items[0].currency, amount: total, items, createdAt: new Date().toISOString() })]);
    const appUrl = (process.env.KIRA_APP_URL || "https://kira.coach").replace(/\/$/, "");
    if (provider === "stripe") {
      const session = await stripe!.checkout.sessions.create({
        mode: "payment",
        line_items: items.map(item => ({ quantity: item.quantity, price_data: { currency: item.currency, unit_amount: Math.round(item.unitPrice * 100), product_data: { name: item.title } } })),
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
  const stripe = getStripe();
  const signature = req.headers["stripe-signature"];
  if (!stripe || typeof signature !== "string" || !req.rawBody || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(400).send("Webhook no configurado o firma ausente.");
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(req.rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET); }
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
});

app.post("/api/webhooks/mercadopago", async (req: any, res) => {
  try {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || "";
    const signature = String(req.headers["x-signature"] || "");
    const requestId = String(req.headers["x-request-id"] || "");
    const paymentId = String(req.query["data.id"] || req.body?.data?.id || "");
    if (!secret || !signature || !requestId || !paymentId) return res.status(401).send("Firma ausente.");
    const parts: any = Object.fromEntries(signature.split(",").map((p: string) => p.trim().split("=").map(x => x.trim())));
    const manifest = "id:" + paymentId.toLowerCase() + ";request-id:" + requestId + ";ts:" + parts.ts + ";";
    const expected = createHmac("sha256", secret).update(manifest).digest("hex");
    if (!parts.v1 || parts.v1.length !== expected.length || !timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected))) return res.status(401).send("Firma inválida.");
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
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

app.post("/api/certificates", async (req,res) => {
  try {
    const user = await verifiedUser(req,res);
    if (!user) return;
    const admin = await fsGet("users",user.uid);
    if (user.email?.toLowerCase() !== "safeness.c.a@gmail.com" || user.emailVerified !== true || admin?.role !== "admin") return res.status(403).json({error:"Solo el superadministrador verificado puede emitir certificados."});
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
    if(user.email?.toLowerCase()!=="safeness.c.a@gmail.com"||user.emailVerified!==true||admin?.role!=="admin")return res.status(403).json({error:"Solo el superadministrador puede revocar certificados."});
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
