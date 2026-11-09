// Vercel catch-all serverless entry for the existing Express API.
// The same Express app is used locally by server.ts; do not duplicate routes here.
import app from "../server";

export default app;
