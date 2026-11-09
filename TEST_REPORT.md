# TEST REPORT — KIRA 2.1 Admin Expanded v1

Fecha de actualización: 2026-11-09
Rama: `release/admin-expanded-v1`
PR: https://github.com/safenessinc-cellss/KIRA2.1/pull/25
HEAD consultado: `a3bc1e1976dc7193225cd6e6a27b1633d668a0bb`

## 1. Entorno y validación automatizada observada

### Ejecución anterior de GitHub Actions

Workflow run `42649252648` (CI, intento anterior al arreglo de Firebase Messaging):

| Paso | Resultado observado | Evidencia |
|---|---|---|
| Checkout | ✅ success | GitHub Actions |
| Setup Node.js 22 | ✅ success | GitHub Actions |
| Regenerar lockfile | ✅ success | GitHub Actions |
| Commit de lockfile sincronizado | ✅ success | GitHub Actions |
| `npm ci` | ✅ success | GitHub Actions |
| `npm run lint` (TypeScript app + server) | ✅ success | Step 7 |
| `npm run build` | ✅ success | Step 8 |
| Instalar Firestore emulator tooling | ✅ success | Step 9 |
| Firestore rules tests | ✅ success | Step 10 |
| Client bundle secret scan | ❌ failure | Encontró una Firebase API key hardcodeada en `dist/firebase-messaging-sw.js` |
| Client/server env scan | ⏭️ skipped | Se detuvo al fallar el scan anterior |

Fragmento literal del log que motivó la corrección:
```text
dist/firebase-messaging-sw.js:10:  apiKey: "AIzaSyCYmfCeHXfrpKdMn_3G-rrim3wu0FIopiE",
##[error]Potential credential pattern found in dist/
```

La clave pertenecía a una configuración hardcodeada de un proyecto `gen-lang-client-0082259364`, distinta del proyecto KIRA configurado por `src/firebase.ts`. Se eliminó del service worker y se añadió `GET /api/firebase-config` para recuperar la configuración pública en runtime. También se añadió alias `GOOGLE_GENAI_API_KEY` para Gemini.

### Ejecuciones posteriores al arreglo

En HEAD `a3bc1e1976dc7193225cd6e6a27b1633d668a0bb`, al momento de esta actualización, GitHub reportó tres workflows en curso:

- CI run `42651052378`: typecheck en curso; build, reglas y scans pendientes.
- Admin Expanded Quality Gate run `42651052384`: build en curso; reglas pendientes.
- KIRA full quality and security gate run `42651052535`: TypeScript en curso.

No se declara ninguna de estas ejecuciones como verde hasta que GitHub publique conclusión final. Los checks Vercel no son equivalentes a CI: uno reportó success y otro failure por límite de build/deploy del plan.

## 2. Validación local solicitada

| Comando | Estado | Resultado |
|---|---|---|
| `rm -rf node_modules .next dist && npm ci` | ⏳ No ejecutado localmente | Esta sesión no tiene checkout/terminal del operador |
| `npx tsc --noEmit` | ⏳ No ejecutado literalmente | CI anterior pasó `npm run lint`, que ejecuta TypeScript de app y server |
| `npm run build` | ✅ CI anterior | Paso 8 de run `42649252648` |
| `npm run lint` | ✅ CI anterior | Paso 7 de run `42649252648` |
| Greps locales exactos | ⏳ No ejecutados | Repetir en terminal operador después de build limpio |
| `git ls-files` para .env | ⏳ No ejecutado localmente | Revisar con el comando de `DEPLOY.md` |

No hay output local literal que pueda reportarse: no se ejecutaron comandos en el Mac del operador.

## 3. Revisión estática de seguridad

- Se detectó una API key Firebase hardcodeada en `public/firebase-messaging-sw.js` y compilada a `dist/firebase-messaging-sw.js`. Se quitó la configuración hardcodeada; el service worker ahora obtiene la configuración pública desde `/api/firebase-config`.
- La Firebase Web API key utilizada por el cliente principal en `src/firebase.ts` se suministra mediante `VITE_FIREBASE_API_KEY`. Es una configuración pública de Firebase Web, no una credencial privada de service account. Si aparece en el bundle, validar proyecto y restricciones; no publicar service-account JSON, Stripe secret, Mercado Pago access token ni signing secret.
- `src/pages/admin/AdminExpandedPage.tsx`: la única coincidencia estática de `journal` encontrada es texto UI indicando que journals/mensajes privados no son visibles para admin; no es una lectura Firestore directa.
- `.gitignore` incluye `.env*` con excepción `!.env.example`, `node_modules/`, `dist/`, `.next/`, `out/` y `.vercel/`. La comprobación definitiva de archivos tracked debe hacerse con `git ls-files` en el checkout local.

## 4. Suite actual de Firestore rules

La suite `scripts/firestore-rules.test.mjs` ejecutó correctamente en el run CI anterior. Incluye:
- privacidad de journals entre usuarios;
- admin no puede leer journal ajeno;
- activity logs append-only y acceso permitido a admin;
- admin puede leer un mensaje solo mientras existe reporte pending; acceso denegado cuando el reporte está cerrado;
- aislamiento de company_admin entre compañías;
- restricciones de autoedición de roles, companyId, staffPermissions, isBanned y coachId;
- restricciones de escritura de refunds/transactions/orders y enrollment de cursos pagados.

La suite no equivale a pruebas E2E de los ocho flujos funcionales.

## 5. Ocho escenarios de aceptación

| # | Caso | Estado | Evidencia / brecha |
|---|---|---|---|
| 1 | Aprobar coach → rol y UI actualizados sin refresh manual | ❌ No probado E2E | Requiere test integrado UI/Auth/Firestore |
| 2 | Aprobar certificado → `/verify` refleja estado | ❌ No probado E2E | Requiere fixture de emisión, firma y consulta pública |
| 3 | Refund Stripe → ledger y revocación relacionados | ❌ No probado E2E | Requiere mock Stripe y fixtures de transacción |
| 4 | Refund Mercado Pago → ledger y revocación relacionados | ❌ No probado E2E | Requiere mock Mercado Pago |
| 5 | Webhook duplicado → un solo efecto | ❌ No probado E2E | Requiere replay duplicado y prueba de idempotencia del handler |
| 6 | Admin no lee journals privados | ⚠️ Rules test aprobado | `assertFails(getDoc(journals/...))` incluido y suite rules CI anterior pasó |
| 7 | Aislamiento de roles alumno/coach/HR/admin | ⚠️ Parcial | Rules cubre alumno, admin y company_admin/HR; falta caso explícito de coach |
| 8 | White-label propagado en cuatro portales | ❌ No probado | Requiere prueba de integración visual/tenant en las cuatro superficies |

## 6. Conclusión de release

**NO LISTO PARA PRODUCCIÓN.** TypeScript/lint, build y rules tests sí pasaron en una ejecución CI anterior; el escaneo de secretos falló por una configuración Firebase hardcodeada que ya se corrigió en la rama. La nueva ejecución aún debe finalizar. No se ejecutó validación local en el equipo del operador y faltan pruebas E2E para los escenarios 1–5 y 8, además del caso coach del escenario 7.

Seguir el procedimiento de `DEPLOY.md`. No desplegar Vercel ni Firebase, no ejecutar migración, refund o payout real hasta que los gates estén completos y el operador confirme.
