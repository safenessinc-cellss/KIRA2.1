# TEST REPORT — Admin Expanded v1

Fecha de registro: 2026-11-09
Rama: `release/admin-expanded-v1`
PR: https://github.com/safenessinc-cellss/KIRA2.1/pull/25

## Entorno y comandos

| Validación | Comando previsto | Estado | Evidencia |
|---|---|---|---|
| Instalar dependencias | `npm ci` | ⏳ No ejecutado localmente | No hay checkout local en este entorno |
| TypeScript + servidor | `npm run lint` | ⏳ Pendiente CI | El script ejecuta `tsc --noEmit --project tsconfig.app.json` y el chequeo de `server.ts` |
| Build | `npm run build` | ⏳ Pendiente CI | Sin output de build disponible |
| Firestore rules | `npx firebase emulators:exec --only firestore --project demo-kira-rules "npm run test:rules"` | ⏳ Pendiente CI | Script `scripts/firestore-rules.test.mjs` |
| Secret scan del bundle | grep de patrones de claves en `dist/` | ⏳ Pendiente CI | Workflow `.github/workflows/ci.yml` |
| Env scan | grep `process.env` en `src/` y `import.meta.env` en backend | ⏳ Pendiente CI | Workflow `.github/workflows/ci.yml` |

No se reporta ninguna validación como aprobada sin ejecución y output observables.

## Ocho pruebas de coherencia solicitadas

| # | Caso | Estado | Cobertura disponible / brecha |
|---|---|---|---|
| 1 | Aprobar coach → cambio de rol sin refresh | ❌ No ejecutado | Requiere prueba integrada UI/Auth/Firestore; no hay E2E disponible confirmado |
| 2 | Aprobar certificado → `/verify` refleja estado | ❌ No ejecutado | Requiere emitir/firmar y consultar verificación pública con fixture |
| 3a | Refund Stripe → enrollment/cert revocados y payout recalculado | ❌ No ejecutado | Requiere mock Stripe y fixtures de ledger |
| 3b | Refund Mercado Pago → enrollment/cert revocados y payout recalculado | ❌ No ejecutado | Requiere mock Mercado Pago y fixtures de ledger |
| 4 | Webhook duplicado → una transacción | ❌ No ejecutado | Requiere prueba de idempotencia con evento duplicado |
| 5 | Admin no lee journals (solo metadata) | ⚠️ Parcial en suite de rules | El script existente contiene `assertFails(getDoc(journals/...))` para admin y acceso a activity log; no se ejecutó aún |
| 6 | HR/coach reciben permission-denied en journals | ⚠️ Parcial en suite de rules | HR tiene aserción explícita; falta fixture/aserción de coach. No ejecutado |
| 7 | White-label se propaga en cuatro portales | ❌ No ejecutado | Requiere pruebas de integración visual/tenant en cuatro superficies |
| 8 | Stripe health no expone keys | ❌ No ejecutado | Requiere test de endpoint con secretos simulados y aserciones de respuesta |

## Limitaciones

- Esta sesión no dispone de checkout local ni conectividad para clonar GitHub; no se ejecutaron `npm ci`, `tsc`, build, lint, grep ni Firebase Emulator localmente.
- Se añadió GitHub Actions CI para ejecutar las validaciones reproducibles sin consumir cuota de deployments Vercel. El estado solo podrá marcarse verde después de que GitHub ejecute el workflow y publique sus resultados.
- Los tests 1–4, 7 y 8 necesitan mocks/integración que todavía no están implementados en la suite disponible.
- No se realizaron operaciones con pagos, roles, migraciones ni datos de producción.

## Conclusión

**No apto todavía para merge.** Los checks no están confirmados y seis escenarios de aceptación no tienen prueba automatizada completa. Mantener PR #25 abierto y sin merge hasta disponer de CI verde, resolver la cobertura pendiente y validar los bloqueos de seguridad/operación descritos en `BLOCKER.md`.
