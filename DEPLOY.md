# Despliegue KIRA 2.1 — Vercel

## Entorno observado
- Proyecto: `kira2-1-g0` (Vercel, framework Vite).
- Dominios asociados: `https://kira.coach`, `https://www.kira.coach`.
- Rama de trabajo: `release/v2.1.0`.
- Backend: el repositorio contiene un servidor Express en `server.ts`; en esta revisión no se confirmó una función Vercel `api/*` que lo empaquete ni un servicio externo. **No asumir que Express está disponible en producción** hasta verificar el adapter/runtime y probar endpoints reales.
- Vercel reporta un deployment Production READY del SHA `423d8140`; READY solo confirma build/deployment, no el funcionamiento E2E de cada módulo.

## Build y pruebas requeridas antes de promoción
```bash
npm ci
npm run build
npx tsc --noEmit
npm run lint
npm run test:all
npm run build
grep -RniE 'AIza|sk_live|sk_test' src dist
```
El grep debe devolver cero secretos. Ejecutar Firestore Emulator, pruebas de reglas y smoke tests de alumno, coach, HR y propietario sobre Preview.

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
- `FIREBASE_CLIENT_EMAIL` (referencia faltante baseline; legacy: `FIREBASE_SERVICE_ACCOUNT_JSON` / `GOOGLE_SERVICE_ACCOUNT_JSON`)
- `FIREBASE_PRIVATE_KEY` (referencia faltante baseline)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (validar consumo en el webhook vigente)
- `GOOGLE_GENAI_API_KEY` (referencia faltante baseline; legacy: `GEMINI_API_KEY`)
- `APP_URL` (validar consumo; legacy potencial: `KIRA_APP_URL`)

### Client-side
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_STRIPE_PUBLISHABLE_KEY` (referencia no confirmada baseline)
- `VITE_APP_URL` (referencia no confirmada baseline)

Si una referencia necesaria no está implementada en el código, documentarla aquí y no habilitar la funcionalidad que depende de ella hasta validación.

## Stripe webhook
Mantener el webhook existente y su validación de firma. No crear una segunda ruta sin confirmar cuál está registrada en Stripe. Confirmar la URL de producción y probar eventos repetidos para idempotencia antes de activar pagos.

## Promoción y rollback
1. Push de `release/v2.1.0` → Preview.
2. Revisar build logs, CI, pruebas y smoke tests por rol.
3. Solo si Fase 7 está 100% verde, abrir/mergear PR hacia `main` y esperar Production READY.
4. Crear tag `v2.1.0` en el commit validado.
5. Rollback: Vercel → Deployments → seleccionar deployment Production anterior validado → Promote. No promover automáticamente un build no probado.

## Limitaciones de esta auditoría
No se han consultado ni cambiado secretos del dashboard Vercel. Esta sesión no ha ejecutado comandos shell ni emulador local; reportar los resultados del Preview como evidencia antes de considerar el release completo.
