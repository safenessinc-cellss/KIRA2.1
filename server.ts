import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import { GoogleGenAI, Modality } from "@google/genai";
import { WebSocketServer } from "ws";
import compression from "compression";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

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


// Firebase Admin verifies identity and performs trusted payment writes.
// Set FIREBASE_SERVICE_ACCOUNT_JSON as a Vercel encrypted secret.
function getFirebaseAdminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");
  const serviceAccount = JSON.parse(raw);
  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || process.env.VITE_FIREBASE_PROJECT_ID || "kira2-a6a20"
  });
}
function getAdminDb() { return getFirestore(getFirebaseAdminApp()); }
async function verifyFirebaseUser(req: express.Request) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) throw new Error("Missing Firebase bearer token");
  return getAuth(getFirebaseAdminApp()).verifyIdToken(header.slice(7));
}
function getPublicAppUrl() { return (process.env.APP_URL || "https://kira.coach").replace(/\/$/, ""); }


const app = express();

// Raw-body Stripe webhook must be registered before express.json().
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers["stripe-signature"];
  if (!stripe || !secret) return res.status(503).json({ error: "Stripe webhook is not configured" });
  if (!signature || !Buffer.isBuffer(req.body)) return res.status(400).json({ error: "Missing raw body/signature" });
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(req.body, signature, secret); }
  catch (err: any) { console.error("Stripe signature invalid", err?.message); return res.status(400).json({ error: "Invalid Stripe signature" }); }
  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) return res.status(200).json({ received: true, ignored: true });
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return res.status(200).json({ received: true, paymentStatus: session.payment_status });
  const userId = session.metadata?.userId || session.client_reference_id;
  let items: Array<{id:string; itemType:"course"|"book"}>;
  try {
    items = JSON.parse(session.metadata?.items || "[]");
    if (!userId || !Array.isArray(items) || !items.length || items.some(x => !x?.id || !["course","book"].includes(x.itemType))) throw new Error("bad metadata");
  } catch { return res.status(400).json({ error: "Invalid checkout metadata" }); }

  try {
    const firestore = getAdminDb();
    const eventRef = firestore.collection("stripeWebhookEvents").doc(event.id);
    const orderRef = firestore.collection("orders").doc(session.id);
    await firestore.runTransaction(async tx => {
      const eventSnap = await tx.get(eventRef);
      const orderSnap = await tx.get(orderRef);
      if (eventSnap.exists) return;
      tx.set(eventRef, { eventId: event.id, type: event.type, processedAt: FieldValue.serverTimestamp() });
      if (orderSnap.exists && orderSnap.data()?.status === "paid") return;
      const amount = (session.amount_total || 0) / 100;
      const currency = String(session.currency || "usd").toUpperCase();
      tx.set(orderRef, { userId, items, amount, currency, status: "paid", paymentStatus: "paid", stripeSessionId: session.id, stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null, paidAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() });
      tx.set(firestore.collection("transactions").doc(session.id), { userId, amount, currency, type: "marketplace_purchase", items, status: "paid", paymentStatus: "paid", stripeSessionId: session.id, stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null, paidAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() });
      for (const item of items) {
        if (item.itemType === "course") {
          tx.set(firestore.collection("enrollments").doc(userId + "_" + item.id), { userId, courseId: item.id, progress: 0, status: "active", paymentStatus: "paid", orderId: session.id, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        } else {
          tx.set(firestore.collection("purchases").doc(userId + "_" + item.id), { userId, itemId: item.id, itemType: "book", status: "paid", paymentStatus: "paid", orderId: session.id, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }
      }
    });
    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("Stripe webhook fulfillment failed", err);
    return res.status(500).json({ error: "Webhook processing failed; Stripe should retry" });
  }
});

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));
app.use(express.json({ limit: "5mb" }));

// Resolve product prices and identities on the server; never trust client-supplied amount/title.
app.post("/api/create-checkout-session", async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: "Stripe is not configured; no payment was created." });
  let decoded: any;
  try { decoded = await verifyFirebaseUser(req); }
  catch { return res.status(401).json({ error: "Authentication required. Sign in again." }); }
  const requested = req.body?.items;
  if (!Array.isArray(requested) || requested.length < 1 || requested.length > 8 || requested.some((x:any)=>!x?.id || !["course","book"].includes(x.itemType))) return res.status(400).json({ error: "Invalid checkout items" });
  const items = requested.filter((x:any,i:number)=>requested.findIndex((y:any)=>y.id===x.id && y.itemType===x.itemType)===i);
  if (items.length !== requested.length) return res.status(400).json({ error: "Duplicate items are not allowed" });
  try {
    const firestore = getAdminDb();
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const validated: Array<{id:string;itemType:"course"|"book"}> = [];
    for (const item of items) {
      const collectionName = item.itemType === "course" ? "courses" : "books";
      const productSnap = await firestore.collection(collectionName).doc(String(item.id)).get();
      if (!productSnap.exists) return res.status(404).json({ error: "Product not found" });
      const product = productSnap.data() || {};
      if (String(product.status || "").toLowerCase() !== "published" && product.published !== true) return res.status(409).json({ error: "Product is not published" });
      const price = Number(product.price);
      if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ error: "Invalid server-side price. Free items need a separate backend enrollment flow." });
      const title = String(product.title || product.name || "KIRA item").slice(0, 200);
      lineItems.push({ quantity: 1, price_data: { currency: String(product.currency || "usd").toLowerCase(), unit_amount: Math.round(price * 100), product_data: { name: title, metadata: { productId: String(item.id), itemType: item.itemType } } } });
      validated.push({ id: String(item.id), itemType: item.itemType });
    }
    const origin = getPublicAppUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "payment", payment_method_types: ["card"], line_items: lineItems,
      client_reference_id: decoded.uid, metadata: { userId: decoded.uid, items: JSON.stringify(validated) },
      success_url: origin + "/dashboard?checkout=return&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin + "/dashboard?checkout=cancelled"
    });
    return res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error("Stripe checkout create failed", err);
    return res.status(500).json({ error: "Could not create a secure checkout session." });
  }
});

app.get("/api/stripe/session-status", async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: "Stripe is not configured" });
  let decoded: any;
  try { decoded = await verifyFirebaseUser(req); }
  catch { return res.status(401).json({ error: "Authentication required" }); }
  const sessionId = String(req.query.session_id || "");
  if (!sessionId.startsWith("cs_")) return res.status(400).json({ error: "Invalid checkout session ID" });
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.client_reference_id !== decoded.uid && session.metadata?.userId !== decoded.uid) return res.status(403).json({ error: "Session belongs to another user" });
    return res.json({ status: session.status, paymentStatus: session.payment_status, currency: session.currency, amountTotal: session.amount_total });
  } catch { return res.status(404).json({ error: "Checkout session not found" }); }
});


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
    const key = process.env.GEMINI_API_KEY;
    const { model, contents, config } = req.body;

    if (!isValidGeminiKey(key)) {
      return res.status(503).json({ error: "El servicio de IA no está configurado. Contacta al administrador." });
    }
    
    // Create cache key based on contents and config to avoid repeating identical AI calls
    const cacheKey = JSON.stringify({ model, contents, config });
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
