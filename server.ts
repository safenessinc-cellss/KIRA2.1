import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import { GoogleGenAI, Modality } from "@google/genai";
import { WebSocketServer } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables. Please check Settings > Secrets.");
    }
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return geminiClient;
}

const app = express();
app.use(express.json());

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint to verify Gemini configuration
app.get("/api/gemini/config", (req, res) => {
  res.json({ configured: !!process.env.GEMINI_API_KEY });
});

// Gemini Content Generation Proxy
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return res.status(412).json({
        error: "GEMINI_API_KEY_MISSING",
        message: "La clave de API de Gemini no está configurada en las variables de entorno del servidor. Por favor, añádela en Settings > Secrets."
      });
    }

    const { model, contents, config } = req.body;
    
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
    const result = await ai.models.generateContent({
      model: mappedModel,
      contents,
      config
    });

    res.json({ text: result.text || "" });
  } catch (error: any) {
    console.error("Gemini API server proxy error:", error);
    res.status(500).json({ error: error.message || "Un error ocurrió al llamar a la API de Gemini en el servidor." });
  }
});

// Stripe Integration
app.post("/api/create-checkout-session", async (req, res) => {
  const { courseId, userId, amount, title, type = 'course_purchase' } = req.body;
  const stripe = getStripe();
  
  if (!userId || (!courseId && type === 'course_purchase')) {
    return res.status(400).json({ error: "Faltan datos de compra" });
  }

  // IF STRIPE IS CONFIGURED
  if (stripe) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: title,
              metadata: { courseId, type }
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${req.headers.origin}${type === 'coach_membership' ? '/coach' : '/dashboard'}?success=true&courseId=${courseId || ''}&amount=${amount}&title=${encodeURIComponent(title)}&type=${type}`,
        cancel_url: `${req.headers.origin}${type === 'coach_membership' ? '/coach' : '/dashboard'}?canceled=true`,
        client_reference_id: userId,
        metadata: { userId, courseId: courseId || '', type }
      });
      return res.json({ url: session.url });
    } catch (e: any) {
      console.error("Stripe Session Error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  // MOCK MODE (Fallback)
  console.log(`[MOCK] Simulando compra Stripe para ${userId}: ${type} ${title} por $${amount}`);
  
  const redirectUrl = type === 'coach_membership' 
    ? `/coach?success=true&type=coach_membership&amount=${amount}`
    : `/dashboard?success=true&courseId=${courseId}&amount=${amount}&title=${encodeURIComponent(title)}`;

  res.json({ 
    url: redirectUrl,
    sessionId: `mock_session_${Date.now()}`
  });
});

async function startLocalServer() {
  const PORT = 3000;
  
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
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

startLocalServer();

// Export the Express API for Vercel
export default app;
