# DEPLOY — Admin Expanded v1

## Rama
`release/admin-expanded-v1` creada desde `main`.

## Estado real
- Commits de implementación enviados a GitHub en `release/admin-expanded-v1`.
- Pull Request #25 abierto hacia `main`: https://github.com/safenessinc-cellss/KIRA2.1/pull/25. No fusionado.
- Vercel: deployment rechazado por HTTP 402 `api-deployments-free-per-day`; no existe Preview validado.
- CI independiente: añadido `.github/workflows/ci.yml` para typecheck/lint, build, Firestore rules tests y scans básicos. Pendiente confirmar ejecución verde.
- Validación local: no ejecutada en esta sesión (sin checkout local/red para clonar).
- Producción: no desplegada.
- Tag `v2.1.0-admin-expanded`: no creado.
- Reglas e índices Firebase: no desplegados.

## Flujo objetivo
1. Ejecutar GitHub Actions y corregir lint/build/tests.
2. Crear Preview cuando se libere la cuota de deployments.
3. Smoke test alumno, coach, admin y hr.
4. Abrir PR a main con checks verdes.
5. Merge a main y verificar deployment de producción.
6. Crear tag `v2.1.0-admin-expanded` solo tras smoke test.

## Rollback

No desplegar hasta que Preview, CI, reglas y smoke tests estén aprobados. Si tras una futura publicación hay regresión:

1. Identificar el deployment estable anterior con `vercel ls`.
2. Ejecutar `vercel rollback <DEPLOYMENT_URL_OR_ID>` desde el proyecto Vercel correcto y verificar el dominio.
3. Revertir la integración en GitHub con `git revert -m 1 <MERGE_COMMIT_SHA>` si fue merge commit (o `git revert <COMMIT_SHA>` si fue squash), ejecutar CI y `git push origin main`.
4. Si se desplegaron reglas Firestore, restaurar la versión previa revisada de `firestore.rules` e índices, ejecutar Emulator y desplegar solo tras validar.
5. Confirmar login, rutas públicas, permisos alumno/coach/admin/HR y pagos en smoke tests.

Con Vercel CLI autenticado y dentro del proyecto correcto, `vercel ls` permite identificar el deployment anterior y `vercel rollback` efectuar rollback.

## Variables esperadas (nombres solamente)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON` o `GOOGLE_SERVICE_ACCOUNT_JSON`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `KIRA_CERTIFICATE_SIGNING_SECRET`
- `KIRA_APP_URL`

No se han leído ni modificado valores de secretos.
