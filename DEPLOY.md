# Despliegue KIRA 2.1 — Vercel

## Entorno observado
- Proyecto: `kira2-1-g0` (Vercel, framework Vite).
- Dominios asociados: `https://kira.coach`, `https://www.kira.coach`.
- Rama de trabajo: `release/v2.1.0`.
- Backend: Express en `server.ts`, exportado como función Node.js mediante `vercel.json` (build `@vercel/node`, route `/api/(.*)` → `/server.ts`). El frontend se compila como sitio estático Vite a `dist`. La app local inicia Express + Vite; en Vercel `process.env.VERCEL` evita abrir un puerto. WebSocket `/api/live` no está garantizado en Serverless; no depender de él para flujos críticos.
- Vercel reporta un deployment Production READY del SHA `423d8140`; READY solo confirma build/deployment, no el funcionamiento E2E de cada módulo.

## Build y pruebas requeridas antes de promoción
```bash
npm install --no-audit --no-fund
npm run build
npx tsc --noEmit
npm run lint
npm run test:all
npm run build
grep -RniE 'AIza|sk_live|sk_test' src dist
```
El grep debe devolver cero credenciales privadas. Las claves públicas Firebase API no son secretos, pero la política de release exige que no haya literales hardcodeados. Ejecutar Firestore Emulator, pruebas de reglas y smoke tests de alumno, coach, HR y propietario sobre Preview.

## Firestore
Después de validar rules e índices en emulador y revisar el diff:
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```
No ejecutar despliegue de reglas sin emulador verde y revisión de compatibilidad con los documentos existentes.

## Variables a verificar en Vercel
La auditoría verifica referencias de código, no los valores del panel. No se creó ni modificó ninguna variable.

### Server-side
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL` (consumida por `server.ts`; legacy JSON aún compatible)
- `FIREBASE_PRIVATE_KEY` (consumida por `server.ts`; legacy JSON aún compatible)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (validar consumo en el webhook vigente)
- `GOOGLE_GENAI_API_KEY` (consumida por `server.ts`; legacy `GEMINI_API_KEY`)
- `APP_URL` (consumida por `server.ts`; fallback `KIRA_APP_URL`)

### Client-side
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_STRIPE_PUBLISHABLE_KEY` (no consumida: el checkout actual usa Stripe Checkout alojado por backend; no necesita clave publicable en cliente)
- `VITE_APP_URL` (no consumida: frontend usa rutas relativas y origen del navegador)

Si una referencia necesaria no está implementada en el código, documentarla aquí y no habilitar la funcionalidad que depende de ella hasta validación.

## Stripe webhook
Mantener el webhook existente y su validación de firma. No crear una segunda ruta sin confirmar cuál está registrada en Stripe. Confirmar la URL de producción y probar eventos repetidos para idempotencia antes de activar pagos.

## Promoción y rollback
1. Push de `release/v2.1.0` → Preview.
2. Revisar build logs, CI, pruebas y smoke tests por rol.
3. Solo si Fase 7 está 100% verde, abrir/mergear PR hacia `main` y esperar Production READY.
4. Crear tag `v2.1.0` en el commit validado.
5. Rollback: Vercel → Deployments → seleccionar deployment Production anterior validado → Promote. No promover automáticamente un build no probado.

## Estado de ejecución de este release
- GitHub Actions inicial detectó que \`npm ci\` falla porque el \`package-lock.json\` existente no contiene dependencias que npm espera. El workflow se ajustó a \`npm install --no-audit --no-fund\` para poder evaluar build/typecheck mientras se corrige el lockfile.
- Vercel Preview no pudo crearse: la API de Vercel devolvió HTTP 402 por límite \`api-deployments-free-per-day\` y ventana de 24 horas. No se modificó el dashboard.
- Producción y reglas remotas no se han modificado.

## Limitaciones de esta auditoría
No se han consultado ni cambiado secretos del dashboard Vercel. Esta sesión no ha ejecutado comandos shell ni emulador local; reportar los resultados del Preview como evidencia antes de considerar el release completo.
