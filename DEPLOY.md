# DEPLOY — Admin Expanded v1

## Rama de trabajo
`release/admin-expanded-v1` (creada desde `main`).

## Flujo previsto
1. Push de la rama crea un Preview mediante Git Integration de Vercel.
2. Ejecutar build, lint, pruebas de reglas y smoke tests por rol en Preview.
3. Abrir PR hacia `main` solo después de superar todos los controles.
4. Merge a `main` provoca el deployment de producción según la integración configurada.
5. Crear tag `v2.1.0-admin-expanded` solo después de verificar el deployment y el smoke test de producción.

## Rollback
Con Vercel CLI autenticado y dentro del proyecto correcto:
```bash
vercel ls
vercel rollback <DEPLOYMENT_URL_OR_ID>
git revert <MERGE_COMMIT_SHA>
git push origin main
```
El rollback de Vercel revierte el deployment; el revert de Git restaura el código en la rama de producción. Revisar el historial de deploys antes de ejecutar.

## Variables esperadas (nombres solamente)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON` o `GOOGLE_SERVICE_ACCOUNT_JSON`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `KIRA_CERTIFICATE_SIGNING_SECRET`
- `KIRA_APP_URL`

## Estado
Este documento describe el proceso objetivo. No declara que Preview, producción o smoke tests hayan sido ejecutados.
