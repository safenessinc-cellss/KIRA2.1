# KIRA — Variables de entorno del backend

Todos los valores sensibles son server-only. Nunca añadir valores a Git, PR, logs, frontend `VITE_*`, Firestore en texto plano ni conversaciones.

| Variable | Propósito | Requerida para |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Cuenta de servicio con acceso limitado a Firestore/Storage | API Express |
| `FIREBASE_PROJECT_ID` | ID del proyecto Firebase esperado | Validación de identidad |
| `FIREBASE_STORAGE_BUCKET` | Bucket privado para contratos PDF | Contratos |
| `KIRA_CRM_PII_ENCRYPTION_KEY` | AES-256-GCM CRM PII, 32 bytes base64 o 64 hex | Crear/leer PII CRM |
| `KIRA_CONFIG_ENCRYPTION_KEY` | Cifrado de configuración de pasarelas | Configuración de pagos |
| `KIRA_CERT_SECRET` | HMAC-SHA256 de certificados y contratos (mínimo 32 caracteres) | Firmas verificables |
| `KIRA_CERTIFICATE_SIGNING_SECRET` | Nombre legacy compatible para firma de certificados | Compatibilidad |
| `WHATSAPP_WEBHOOK_SECRET` | Firma HMAC de eventos entrantes WhatsApp | Integración WhatsApp |
| `LANDING_CAPTCHA_SECRET` | Validación server-side CAPTCHA de formularios | Landing pages |
| `CRON_SECRET` | Bearer secreto para Cloud Scheduler; mínimo 24 caracteres aleatorios | Jobs financieros programados |
| `KIRA_OUTBOX_CRON_SECRET` | Bearer secreto independiente para reintentos del outbox académico | Proyección de asistencia y evaluaciones |
| `STRIPE_SECRET_KEY` | Acceso API Stripe (si no se usa secreto cifrado en Firestore) | Stripe |
| `STRIPE_WEBHOOK_SECRET` | Verificación de webhook Stripe | Stripe |
| `MERCADOPAGO_ACCESS_TOKEN` | Acceso API Mercado Pago | Mercado Pago |
| `MERCADOPAGO_WEBHOOK_SECRET` | Verificación de webhook Mercado Pago | Mercado Pago |

## Generación de claves
- CRM: `openssl rand -base64 32` para `KIRA_CRM_PII_ENCRYPTION_KEY`.
- Config: generar una clave independiente de 32 bytes para `KIRA_CONFIG_ENCRYPTION_KEY`.
- Certificados: generar un secreto aleatorio de al menos 32 bytes; no reutilizar la clave CRM ni la de pagos.

## Rotación
1. Añadir nueva clave server-only al entorno de Preview/producción.
2. Para cifrado de datos, habilitar lectura multi-key versionada, re-cifrar datos por lotes y comprobar muestras antes de retirar la clave antigua.
3. Para HMAC, admitir temporalmente firma actual/anterior en verificación; emitir nuevas firmas solo con la nueva clave.
4. Registrar ventana, actor y resultado de rotación en audit log; nunca registrar el valor del secreto.
5. Revocar la clave anterior tras confirmar que no quedan documentos/firmas dependientes.

## Configuración
Configurar en Vercel Project Settings → Environment Variables para las funciones desplegadas en Vercel y en Secret Manager/Cloud Run para backend dedicado. No enviar secretos al bundle Vite.
