# DEPLOY — Admin Expanded v1

## Rama
`release/admin-expanded-v1` creada desde `main`.

## Estado real
- Commits de implementación enviados a GitHub en la rama.
- Vercel Preview: no creado. La API devolvió HTTP 402 `api-deployments-free-per-day`, retryAfter 86400.
- PR a main: no abierto, porque Preview/CI no están verificados.
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
Con Vercel CLI autenticado y dentro del proyecto correcto:
```bash
vercel ls
vercel rollback <DEPLOYMENT_URL_OR_ID>
git revert <MERGE_COMMIT_SHA>
git push origin main
```

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
