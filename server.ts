import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";

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

const app = express();
app.use(express.json());

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
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

// Only start the local server if we are running it directly (not on Vercel)
if (process.env.NODE_ENV !== 'production' || process.env.START_SERVER === 'true') {
  startLocalServer();
}

// Export the Express API for Vercel
export default app;
