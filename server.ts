import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import { GoogleGenAI, Modality } from "@google/genai";
import { WebSocketServer } from "ws";
import compression from "compression";
import { verify as verifySignature, createSign, createHmac, timingSafeEqual, randomBytes } from "node:crypto";

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


interface VerifiedFirebaseUser { uid: string; email?: string; }
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
    return { uid: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };
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
    iss: account.client_email, scope: "https://www.googleapis.com/auth/datastore",
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
  for (const collectionName of ["courses", "books", "products"]) {
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
async function fulfillOrder(orderId: string, provider: string, paymentId: string, eventId: string, paidMinor: number, currency: string): Promise<void> {
  const order = await fsGet("orders", orderId);
  if (!order) throw new Error("La orden no existe.");
  if (order.status === "paid") return;
  if (order.provider !== provider || Math.abs(Math.round(Number(order.amount) * 100) - paidMinor) > 1 || String(order.currency).toLowerCase() !== currency.toLowerCase()) throw new Error("El importe, la moneda o el proveedor no coincide con la orden.");
  const now = new Date().toISOString();
  const writes: any[] = [
    fsCreate("paymentEvents", idSafe(provider + "_" + eventId), { provider, eventId, orderId, status: "processed", processedAt: now }),
    fsCreate("transactions", idSafe(provider + "_" + paymentId), { userId: order.userId, orderId, provider, providerPaymentId: paymentId, amount: order.amount, currency: order.currency, status: "paid", createdAt: now }),
    fsUpdate("orders", orderId, { ...order, status: "paid", providerPaymentId: paymentId, paidAt: now, updatedAt: now })
  ];
  for (const item of order.items || []) {
    if (item.type === "course" || item.collectionName === "courses") {
      const enrollmentId = idSafe(order.userId + "_" + item.id);
      if (!(await fsGet("enrollments", enrollmentId))) writes.push(fsCreate("enrollments", enrollmentId, {
        userId: order.userId, courseId: item.id, progress: 0, completed: false, courseCompleted: false,
        paymentOrderId: orderId, paymentStatus: "paid", createdAt: now
      }));
    } else if (item.type === "membership") {
      const profile = await fsGet("users", order.userId);
      if (profile) writes.push(fsUpdate("users", order.userId, { ...profile, membershipStatus: "active", membershipPaidAt: now }));
      writes.push(fsCreate("memberships", idSafe(order.userId + "_" + orderId), { userId: order.userId, planId: item.id, status: "active", paymentOrderId: orderId, startsAt: now }));
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
    const ids = Array.isArray(req.body?.itemIds) ? req.body.itemIds : (typeof req.body?.courseId === "string" ? req.body.courseId.split(",") : []);
    const provider = req.body?.provider === "mercadopago" ? "mercadopago" : "stripe";
    if (!ids.length || ids.length > 20 || ids.some((id: any) => typeof id !== "string" || id.length > 160)) return res.status(400).json({ error: "Selecciona productos válidos." });
    const items: any[] = [];
    for (const id of [...new Set(ids)]) {
      const product = await catalogItem(id);
      if (!product || product.status === "draft" || product.status === "archived" || product.published === false) return res.status(400).json({ error: "Producto no disponible: " + id });
      const price = Number(product.price ?? product.amount);
      if (!Number.isFinite(price) || price <= 0 || price > 100000) return res.status(400).json({ error: "Precio inválido en catálogo para " + id });
      items.push({ id, title: String(product.title || product.name || "Producto KIRA").slice(0, 250), type: product.type === "membership" ? "membership" : (product.collectionName === "courses" ? "course" : (product.type || "product")), collectionName: product.collectionName, quantity: 1, unitPrice: price, currency: String(product.currency || "usd").toLowerCase() });
    }
    if (new Set(items.map(x => x.currency)).size !== 1) return res.status(400).json({ error: "Los productos deben usar la misma moneda." });
    const orderId = randomBytes(18).toString("hex");
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    await fsCommit([fsCreate("orders", orderId, { userId: user.uid, provider, status: "pending", currency: items[0].currency, amount: total, items, createdAt: new Date().toISOString() })]);
    const appUrl = (process.env.KIRA_APP_URL || "https://kira.coach").replace(/\/$/, "");
    if (provider === "stripe") {
      const stripe = getStripe();
      if (!stripe) return res.status(503).json({ error: "Stripe no está configurado en el servidor." });
      const session = await stripe.checkout.sessions.create({
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
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) return res.status(503).json({ error: "Mercado Pago no está configurado en el servidor." });
    const preferenceResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST", headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json", "X-Idempotency-Key": orderId },
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
      await fulfillOrder(session.metadata.orderId, "stripe", String(session.payment_intent || session.id), event.id, session.amount_total || 0, session.currency || "usd");
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

app.post("/api/certificates/issue", async (req, res) => {
  try {
    const user = await verifiedUser(req, res);
    if (!user) return;
    const profile = await fsGet("users", user.uid);
    const admin = user.email?.toLowerCase() === "safeness.c.a@gmail.com" || profile?.role === "admin";
    if (!profile || (!admin && profile.role !== "coach")) return res.status(403).json({ error: "No tienes permiso para emitir certificados." });
    const enrollmentId = String(req.body?.enrollmentId || "");
    const enrollment = enrollmentId ? await fsGet("enrollments", enrollmentId) : null;
    if (!enrollment || (Number(enrollment.progress) < 100 && enrollment.completed !== true && enrollment.courseCompleted !== true)) return res.status(409).json({ error: "El alumno aún no ha completado el curso." });
    const course = await fsGet("courses", String(enrollment.courseId || ""));
    if (!course || (!admin && course.coachId !== user.uid)) return res.status(403).json({ error: "Curso no autorizado para este coach." });
    const student = await fsGet("users", String(enrollment.userId || ""));
    const coach = await fsGet("users", String(course.coachId || ""));
    if (!student || !coach) return res.status(409).json({ error: "No se pudo verificar la identidad del alumno o del coach." });
    const token = randomBytes(24).toString("hex");
    const number = "KIRA-" + new Date().getUTCFullYear() + "-" + randomBytes(5).toString("hex").toUpperCase();
    const payload: any = {
      certificateNumber: number, validationToken: token, studentId: enrollment.userId,
      studentName: String(student.displayName || student.name || "Alumno"), courseId: enrollment.courseId,
      courseTitle: String(course.title || course.name || "Curso"), coachId: course.coachId,
      coachName: String(coach.displayName || coach.name || "Coach"), hours: Number(course.hours || course.durationHours || 0),
      issuerName: "KIRA COACH · SAFENESS.INC", issuedBy: user.uid, status: "issued", issuedAt: new Date().toISOString()
    };
    if (!Number.isFinite(payload.hours) || payload.hours <= 0 || payload.hours > 10000) return res.status(409).json({ error: "El curso no tiene horas válidas configuradas." });
    const signature = certSignature(payload);
    const publicRecord = { certificateNumber: number, validationToken: token, studentName: payload.studentName, courseTitle: payload.courseTitle, coachName: payload.coachName, hours: payload.hours, issuerName: payload.issuerName, issuedBy: user.uid, issuedAt: payload.issuedAt, status: "issued", signature };
    await fsCommit([fsCreate("certificates", number, { ...payload, signature, signatureAlgorithm: "HMAC-SHA256" }), fsCreate("certificatePublic", token, { ...publicRecord, signatureAlgorithm: "HMAC-SHA256" })]);
    return res.status(201).json({ certificateNumber: number, validationUrl: (process.env.KIRA_APP_URL || "https://kira.coach") + "/validate/" + token });
  } catch (error: any) {
    console.error("[Certificates] Issue failed:", error);
    return res.status(500).json({ error: error.message || "No fue posible emitir el certificado." });
  }
});

app.get("/api/certificates/validate/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "");
    if (!/^[a-f0-9]{48}$/.test(token)) return res.status(404).json({ valid: false });
    const record = await fsGet("certificatePublic", token);
    if (!record || record.status !== "issued" || record.validationToken !== token) return res.status(404).json({ valid: false });
    const full = await fsGet("certificates", String(record.certificateNumber || ""));
    if (!full) return res.status(404).json({ valid: false });
    const { signature, signatureAlgorithm, ...payload } = full;
    const expected = certSignature(payload);
    const actual = String(signature || "");
    const valid = actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
    return res.status(200).json({ valid, certificate: valid ? record : null });
  } catch (error) {
    console.error("[Certificates] Validation failed:", error);
    return res.status(503).json({ valid: false, error: "Validación temporalmente no disponible." });
  }
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
