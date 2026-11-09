# Changelog — KIRA 2.1

## Unreleased — release/v2.1.0
- Creada rama de release desde `b1bbaf89` para aislar la implementación y proteger producción.
- Añadido `AUDIT.md` con baseline verificable, discrepancias de esquema y variables de entorno.
- Identificados riesgos que deben corregirse antes de producción: inyección de Gemini en bundle cliente, HR con lectura individual de miembros, divergencia de claves Gemini/Firebase Admin y contratos legacy de journaling/pagos.
- No se han desplegado reglas ni se ha promovido código a producción en esta etapa.

- Eliminada la inyección de `GEMINI_API_KEY` en el bundle Vite; backend acepta `GOOGLE_GENAI_API_KEY` y alias legacy.
- Backend admite `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY` sin abandonar service-account JSON legacy.
- Añadidos tipos compartidos, hooks Firestore, redirección ProtectedRoute por rol, EnergyTierBadge y helper transaccional de progreso.
- Añadido portal Journal CRUD privado sobre la colección existente `journals`, con análisis IA autenticado.
- Añadidos endpoints de IA para chat, análisis de diario/sesión, nudges y business insights agregados.
- Añadido desbloqueo de biblioteca con transacción server-side; HR ya no consulta ni muestra miembros individuales.
- Restringidas rules de HR y añadidos índices para consultas nuevas; webhook registra idempotencia en `transactions_processed`.
- MediaUpload limita archivos a 5 MB; Admin incorpora analítica ejecutiva y White Label.
- Añadido workflow GitHub Actions para typecheck, build, pruebas de dominio/rules y escaneo de secretos.
- Limitaciones: CI inicial reveló lockfile desincronizado; Vercel bloqueó la creación de Preview por límite diario HTTP 402. No se desplegó a producción ni se tocaron reglas remotas.
