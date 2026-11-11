# KIRA — Variables de entorno del backend

Todos los valores sensibles son server-only. Nunca añadir valores a Git, PR, logs, frontend `VITE_*`, Firestore en texto plano ni conversaciones.

| Variable | Propósito | Requerida para |
|---|---|---|
| `KIRA_DEMO_MODE` | `true` para modo demo de solo lectura; bloquea POST/PUT/PATCH/DELETE en `/api/` | Demo sin credenciales |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Cuenta de servicio con acceso limitado a Firestore/Storage | API Express |
| `FIREBASE_PROJECT_ID` | ID del proyecto Firebase esperado | Validación de identidad |
| `FIREBASE_STORAGE_BUCKET` | Bucket privado para contratos PDF | Contratos |
| `KIRA_CRM_PII_ENCRYPTION_KEY` | AES-256-GCM CRM PII, 32 bytes base64 o 64 hex | Crear/leer PII CRM |
| `KIRA_PAYMENTS_ENCRYPTION_KEY` | Clave independiente AES-256-GCM para secretos de pagos | Configuración de pagos (preferida) |
| `KIRA_CONFIG_ENCRYPTION_KEY` | Clave legacy compatible para configuración de pasarelas | Compatibilidad durante rotación |
| `KIRA_CERT_SECRET` | HMAC-SHA256 de certificados y contratos (mínimo 32 caracteres) | Firmas verificables |
| `KIRA_CERTIFICATE_SIGNING_SECRET` | Nombre legacy compatible para firma de certificados | Compatibilidad |
| `WHATSAPP_WEBHOOK_SECRET` | Firma HMAC de eventos entrantes WhatsApp | Integración WhatsApp |
| `LANDING_CAPTCHA_SECRET` | Validación server-side CAPTCHA de formularios | Landing pages |
| `CRON_SECRET` | Bearer secreto para Vercel Cron/Cloud Scheduler; mínimo 24 caracteres aleatorios | Agregados HR y jobs financieros programados |
| `KIRA_OUTBOX_CRON_SECRET` | Bearer secreto independiente para reintentos del outbox académico | Proyección de asistencia y evaluaciones |
| Credenciales Stripe/Mercado Pago | Se introducen en Admin > Centro de pagos y se cifran AES-256-GCM en Firestore | Pasarela seleccionada |
| `KIRA_PAYMENTS_ENCRYPTION_KEY` | Clave maestra server-only para cifrar credenciales administradas desde Dashboard | Guardar/leer secretos de pagos |
| `KIRA_CONFIG_ENCRYPTION_KEY` | Nombre legacy aceptado temporalmente si no existe la clave anterior | Migración de configuración |

## Generación de claves
- CRM: `openssl rand -base64 32` para `KIRA_CRM_PII_ENCRYPTION_KEY`.
- Config: generar una clave independiente de 32 bytes para `KIRA_PAYMENTS_ENCRYPTION_KEY`; la clave legacy `KIRA_CONFIG_ENCRYPTION_KEY` solo se mantiene durante la rotación.
- Certificados: generar un secreto aleatorio de al menos 32 bytes; no reutilizar la clave CRM ni la de pagos.

## Rotación
1. Añadir nueva clave server-only al entorno de Preview/producción.
2. Para cifrado de datos, habilitar lectura multi-key versionada, re-cifrar datos por lotes y comprobar muestras antes de retirar la clave antigua.
3. Para HMAC, admitir temporalmente firma actual/anterior en verificación; emitir nuevas firmas solo con la nueva clave.
4. Registrar ventana, actor y resultado de rotación en audit log; nunca registrar el valor del secreto.
5. Revocar la clave anterior tras confirmar que no quedan documentos/firmas dependientes.

## Configuración
Configurar en Vercel Project Settings → Environment Variables para las funciones desplegadas en Vercel y en Secret Manager/Cloud Run para backend dedicado. No enviar secretos al bundle Vite.

Las claves API y secretos de webhook de Stripe/Mercado Pago se administran desde **Admin → Centro de pagos**. Se cifran en el backend y el cliente solo recibe indicadores de configuración. La clave maestra `KIRA_PAYMENTS_ENCRYPTION_KEY` permanece en infraestructura server-only. Las variables legacy `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` no son fuente de configuración para el checkout de esta rama.


## Modo DEMO sin credenciales

Configurar `KIRA_DEMO_MODE=true` en Preview/Development para explorar la interfaz sin habilitar operaciones reales. En este modo el backend rechaza con HTTP 423 todas las solicitudes mutables bajo `/api/`, incluidas matrículas, CRM, pagos, webhooks, certificados y revocaciones. El endpoint `/api/health` informa `mode=demo`, `readOnly=true` y la disponibilidad booleana de integraciones sin exponer secretos. No se crean datos ficticios ni se simulan pagos o certificados. Las lecturas que dependen de Firestore requieren todavía `FIREBASE_SERVICE_ACCOUNT_JSON`; por tanto, este modo permite inspección visual, no una demostración funcional de persistencia. Para producción, completar las credenciales, ejecutar pruebas E2E y establecer `KIRA_DEMO_MODE=false`.
