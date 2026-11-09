const required = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_SERVICE_ACCOUNT_JSON",
];
const missing = required.filter((key) => !String(process.env[key] || "").trim());
if (missing.length) {
  console.error("[KIRA QA] Faltan variables obligatorias:", missing.join(", "));
  process.exit(1);
}
if (process.env.VITE_FIREBASE_PROJECT_ID === "kira2-a6a20" || process.env.FIREBASE_PROJECT_ID === "kira2-a6a20") {
  console.error("[KIRA QA] Bloqueado: el entorno QA no puede usar el Firebase de producción kira2-a6a20.");
  process.exit(1);
}
if (process.env.VITE_FIREBASE_PROJECT_ID !== process.env.FIREBASE_PROJECT_ID) {
  console.error("[KIRA QA] VITE_FIREBASE_PROJECT_ID y FIREBASE_PROJECT_ID deben apuntar al mismo proyecto QA.");
  process.exit(1);
}
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} catch {
  console.error("[KIRA QA] FIREBASE_SERVICE_ACCOUNT_JSON no contiene JSON válido.");
  process.exit(1);
}
if (serviceAccount.project_id !== process.env.FIREBASE_PROJECT_ID) {
  console.error("[KIRA QA] La cuenta de servicio no pertenece al proyecto Firebase QA configurado.");
  process.exit(1);
}
console.log("[KIRA QA] Configuración Firebase aislada validada para:", process.env.FIREBASE_PROJECT_ID);
