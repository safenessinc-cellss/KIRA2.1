# DEPLOY POR TERMINAL — KIRA 2.1

**Alcance:** preparar y desplegar manualmente desde el terminal del operador, sin depender de Vercel Git Integration. Este manual no autoriza por sí solo a fusionar PR #25 ni a desplegar: ejecutar el bloque de producción únicamente después de completar todos los gates de validación.

## Pre-requisitos del operador

- Node.js >= 20 (recomendado: Node 22, igual que CI).
- npm incluido con Node.
- `npm i -g vercel` (CLI instalada).
- `vercel login` (sesión activa).
- `npm i -g firebase-tools` (si se publicarán Firestore rules/indexes).
- `firebase login` (sesión activa).
- Acceso al repo GitHub `safenessinc-cellss/KIRA2.1`.
- Permiso al proyecto Vercel KIRA 2.1 y al proyecto Firebase configurado en `.env`.
- Variables de producción cargadas en Vercel; nunca pegar valores secretos en GitHub, chats o logs.

Comprobar versiones:
```bash
node --version
npm --version
vercel --version
firebase --version
```

## Paso 0 — Snapshot de producción actual (rollback seguro)

```bash
# Guardar el deployment actual de producción para rollback
vercel ls --prod | head -5

# Anotar el URL del deployment actual. Rollback será:
# vercel promote <url-del-deployment-anterior>
```

Guardar también el alias de producción actual y el commit asociado. No continuar si la cuenta, scope o proyecto mostrado no corresponde a KIRA 2.1 / kira.coach.

## Paso 1 — Sincronizar rama y comprobar conflictos con main

```bash
git fetch origin main
git fetch origin release/admin-expanded-v1
git checkout release/admin-expanded-v1
git status --short --branch
git rev-list --left-right --count origin/main...HEAD
```

Interpretación del último comando: primer número = commits que main tiene y la rama no; segundo = commits que la rama tiene y main no.

**Estado consultado en GitHub el 2026-11-09:** `main...release/admin-expanded-v1` estaba `ahead 81 / behind 0`, con merge base igual al SHA de main; PR #25 figuraba `mergeable: true`. No se identificaban commits entrantes de main ni conflictos que resolver. Volver a comprobar antes de actuar: la rama puede haber cambiado desde esa consulta.

Solo si el primer número es mayor que cero, integrar main:
```bash
git merge origin/main --no-commit --no-ff
```

Si Git informa conflictos:
1. Ejecutar `git status` y enumerar cada archivo en conflicto.
2. Resolver cada archivo preservando los cambios funcionales de main y los cambios Admin Expanded.
3. No usar `git checkout --ours .` ni `--theirs .` sobre todo el repositorio.
4. Revisar cada resolución con `git diff` y `git diff --check`.
5. Registrar archivo, conflicto, decisión y motivo en `DECISIONS.md`.
6. Ejecutar la validación completa del Paso 2 antes de crear el merge commit.

Si el merge quedó preparado y todas las validaciones pasan:
```bash
git add <archivos-resueltos>
git commit -m "merge: sync release/admin-expanded-v1 with main"
git push origin release/admin-expanded-v1
```

Si el primer número es cero, no crear un merge commit vacío: no hay cambios de main que integrar. En todos los casos:
```bash
git fetch origin
git rev-list --left-right --count origin/main...origin/release/admin-expanded-v1
```

Comprobar PR #25 en GitHub y exigir `mergeable: true`. **No fusionar PR #25** como parte de este procedimiento.

## Paso 2 — Validación local completa (bloqueante)

Ejecutar desde la raíz del repositorio y conservar la salida literal. No publicar si algún comando falla.

### 2.1 Instalación limpia

```bash
rm -rf node_modules .next dist
npm ci
```

Resultado requerido: código de salida 0 y dependencias instaladas desde `package-lock.json`. Si `npm ci` informa desajuste, no sustituirlo silenciosamente por `npm install`: revisar `package.json`/lockfile, regenerar el lockfile de forma deliberada, commitearlo y repetir `npm ci`.

### 2.2 TypeScript, build y lint

```bash
npx tsc --noEmit
npm run build
du -sh dist
find dist -type f -maxdepth 3 -print0 | xargs -0 du -h | sort -h | tail -20
npm run lint
```

El proyecto es **React + Vite + TypeScript**, no Next.js. El artefacto estático esperado es `dist/`; `.next/` no se utiliza. `npm run lint` valida el TypeScript de la aplicación y el servidor Express.

### 2.3 Escaneos de seguridad solicitados

```bash
grep -rn "AIza\\|sk_live\\|sk_test\\|APP_USR-" dist/ .next/ out/ 2>/dev/null || true
grep -rn "process.env" src/ 2>/dev/null || true
grep -rn "import.meta.env" api/ server.ts 2>/dev/null || true
grep -rn "journal" src/pages/admin/ src/components/admin/ 2>/dev/null || true
git ls-files | grep -E "\\.env($|\\.local)" || true
```

Revisión obligatoria:
- No debe haber claves privadas Stripe (`sk_live_`/`sk_test_`), tokens Mercado Pago (`APP_USR-`), credenciales de service account ni secretos de firma en `dist/`.
- La configuración Firebase Web (`AIza...`) es un identificador público de cliente, no una clave privada. El bundle cliente Firebase normalmente necesita esa configuración. El service worker de KIRA ya no debe contener una API key/proyecto hardcodeados: carga la configuración pública en tiempo de ejecución desde `/api/firebase-config`. Si el primer grep detecta una Firebase Web API key que Vite incorporó al bundle de `src/firebase.ts`, identificarla como tal, verificar que corresponde al proyecto KIRA y que tiene restricciones apropiadas en Google Cloud; no confundirla con una service-account key. El build CI anterior detectó una clave hardcodeada de un proyecto distinto en `public/firebase-messaging-sw.js`; esa referencia fue eliminada en esta rama.
- `process.env` no debe aparecer en código cliente. `import.meta.env` no debe aparecer en backend.
- Revisar cada coincidencia de `journal` en el área admin. En la revisión de esta rama, el único hit de `AdminExpandedPage.tsx` era un texto de interfaz que informa que journals y mensajes privados no son visibles; no era una lectura Firestore. Repetir la revisión localmente.
- `git ls-files` no debe listar `.env` ni `.env.local`. `.env.example` sí puede estar versionado y debe contener solo nombres/placeholders.

**Importante:** no copiar ni compartir la salida de archivos de entorno; los comandos anteriores no imprimen sus valores.

### 2.4 Firestore Emulator y pruebas de reglas

En una terminal:
```bash
firebase emulators:start --only firestore,auth --project demo-kira-rules
```

En otra terminal, desde la raíz:
```bash
npm run test:rules
```

Alternativa automatizada:
```bash
npx firebase emulators:exec --only firestore,auth --project demo-kira-rules "npm run test:rules"
```

La suite actual `scripts/firestore-rules.test.mjs` cubre reglas de journals privados, activity logs append-only, acceso de admin a mensajes solo con reporte pendiente, aislamiento entre usuarios/empresas y restricciones de escritura de roles/pagos. La suite actual **no implementa por sí sola los ocho escenarios E2E completos** indicados abajo; no marcar un escenario como aprobado solo porque pase el smoke test de reglas.

### 2.5 Ocho pruebas de aceptación funcional

Registrar evidencia, datos de prueba y resultado individual en `TEST_REPORT.md`:

1. Aprobar coach: cambio de estado/rol y actualización visible sin logout/refresh manual.
2. Aprobar certificado: emisión y resultado verificable en `/verify` o ruta pública vigente.
3. Refund Stripe: mock/sandbox; ledger, enrollment/certificado relacionado y conciliación correctos.
4. Refund Mercado Pago: mock/sandbox; ledger, enrollment/certificado relacionado y conciliación correctos.
5. Webhook duplicado: idempotencia; una sola transacción/efecto.
6. Privacidad admin: admin no lee texto de journals; solo metadata permitida.
7. Aislamiento de roles: alumno, coach, HR/company_admin y admin reciben permisos esperados; HR/coach no leen journals ajenos.
8. White-label: marca/tenant correcta en los cuatro portales/superficies acordados.

No usar dinero real ni datos reales. Los casos 1–5 y 7–8 necesitan pruebas integradas/mocks o un entorno sandbox; no se consideran cubiertos por `npm run test:rules`.

### 2.6 Criterio de salida

No avanzar a despliegue hasta que:
- instalación, TypeScript, build y lint finalicen con código 0;
- escaneos estén revisados y sin secretos privados;
- Firestore Emulator pase;
- los ocho escenarios tengan evidencia y estado aprobado, o se documenten expresamente como bloqueantes;
- `TEST_REPORT.md` contenga salida literal, fecha, commit y versión de Node/npm.

## Paso 3 — Preparar artefactos de deploy

### 3.1 Vercel

El repositorio usa **Vite + Express**. El `vercel.json` actual configura:
- `server.ts` con `@vercel/node` para API;
- `package.json` con `@vercel/static-build` y `distDir: dist` para frontend;
- rutas `/api/*` a `server.ts`, filesystem y fallback SPA a `/index.html`.

Por tanto, el output esperado es `dist`, no `.next`. No convertir a configuración Next.js. Mantener la configuración existente salvo que una validación local del CLI indique una incompatibilidad concreta.

Comprobar:
```bash
cat vercel.json
cat package.json
test -s dist/index.html
```

### 3.2 Variables de entorno

Usar `.env.example` como inventario de nombres. Los valores reales deben configurarse en Vercel (Production) y localmente solo en archivos ignorados:
- Firebase Web: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`.
- Firebase Admin: `FIREBASE_PROJECT_ID` y una credencial de service account en el formato que admite el backend (`FIREBASE_SERVICE_ACCOUNT_JSON` o `GOOGLE_SERVICE_ACCOUNT_JSON`).
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- Mercado Pago: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`.
- Gemini: `GEMINI_API_KEY` (preferida) o `GOOGLE_GENAI_API_KEY` (alias soportado).
- Aplicación: `KIRA_APP_URL` / `APP_URL`, `KIRA_CERTIFICATE_SIGNING_SECRET`.

No poner secretos privados en variables `VITE_*`; Vite las incorpora al navegador. La Firebase Web API key es pública por diseño y debe tener restricciones de API/referrer adecuadas.

### 3.3 Archivos locales y Git

```bash
git ls-files | grep -E "\\.env($|\\.local)" || true
grep -nE '^\\.env|node_modules|dist|\\.next|\\.vercel' .gitignore
git status --short
```

`.gitignore` incluye `.env*` (con excepción de `.env.example`), `node_modules/`, `dist/`, `.next/`, `out/` y `.vercel/`. Confirmar que ningún archivo local de secretos aparece como tracked.

### 3.4 Firebase

`firebase.json` registra `firestore.rules` y `firestore.indexes.json`. Las reglas e índices **no se despliegan como parte de Vercel**. Solo después de aprobar tests y revisión de cambios:
```bash
firebase use <FIREBASE_PROJECT_ID_CONFIRMADO>
firebase deploy --only firestore:rules,firestore:indexes
```

Verificar que el proyecto mostrado sea el proyecto KIRA de producción. No ejecutar migración de certificados en producción sin respaldo, dry-run revisado y aprobación separada.

## Paso 4 — Deploy manual por terminal (operador humano)

**Gate obligatorio:** completar el Paso 2 y el Paso 3. El PR #25 debe seguir sin fusionar si el operador no ha autorizado expresamente el merge. La estrategia CLI puede desplegar la rama revisada directamente, pero eso no equivale a integrar `main`; confirmar que se desea publicar exactamente el SHA de `release/admin-expanded-v1`.

### 4.1 Vincular el proyecto correcto

Desde la raíz del repo:
```bash
vercel link
```

Elegir el scope y proyecto KIRA 2.1 correctos en el asistente. No asumir que un proyecto de nombre parecido es el correcto. Verificar `.vercel/project.json` sin mostrar tokens ni secretos:
```bash
cat .vercel/project.json
```

### 4.2 Descargar configuración de producción y revisar variables

```bash
vercel pull --yes --environment=production
vercel env ls production
```

Comprobar en el dashboard que están definidas todas las variables requeridas en el apartado 3.2. No imprimir sus valores.

### 4.3 Construir con configuración de producción

Opción recomendada: build local prebuilt, para que el operador pueda inspeccionar el artefacto antes de publicarlo:
```bash
vercel build --prod
```

Si el CLI indica que faltan variables de build, corregir la configuración de producción y repetir. No inventar valores ni copiar secretos al repo.

### 4.4 Publicar el artefacto prebuilt

Solo con autorización humana final, SHA revisado y gates verdes:
```bash
vercel deploy --prebuilt --prod
```

Alternativa solicitada de deploy directo (Vercel ejecuta el build según el proyecto):
```bash
vercel --prod
```

La CLI evita depender del disparador Git de Vercel, pero **no garantiza evitar cuotas o límites de deployments del plan**. Si Vercel vuelve a responder HTTP 402 `api-deployments-free-per-day`, detenerse; no reintentar en bucle ni cambiar facturación sin autorización del propietario.

### 4.5 Verificación posterior

```bash
vercel ls --prod
vercel inspect <URL_DEL_DEPLOYMENT>
```

Comprobar manualmente:
- `https://kira.coach` carga sin pantalla blanca.
- `/api/health` responde `{"status":"ok"}`.
- `/api/firebase-config` devuelve configuración pública del proyecto KIRA y nunca secretos privados.
- login Google, dashboard y rutas admin.
- permisos separados alumno, coach, HR/company_admin y admin.
- flujo de aprobación coach/certificados y validación pública.
- pagos en modo sandbox; no ejecutar refunds/payouts reales.
- PWA y notificaciones en primer plano/fondo.

Si falla una verificación crítica, detener rollout y ejecutar rollback.

## Paso 5 — Rollback

```bash
# Revisar deployments y recuperar el URL anotado en Paso 0
vercel ls --prod

# Promover el deployment de producción anterior
vercel promote <URL_DEL_DEPLOYMENT_ANTERIOR>
```

Después verificar `https://kira.coach`, login y `/api/health`. Si también se desplegaron Firestore rules/indexes, revertirlos solo con la versión anterior revisada y volver a ejecutar Emulator. No revertir reglas a ciegas porque podría reabrir acceso a datos privados.

## Estado y evidencias al preparar este manual

- Repositorio: `safenessinc-cellss/KIRA2.1`.
- Rama: `release/admin-expanded-v1`.
- PR #25: abierto, no fusionado.
- Último compare confirmado en esta preparación: la rama estaba 81 commits ahead y 0 behind respecto a main; mergeable true.
- Frontend: Vite, artefacto `dist/`; backend: Express en `server.ts`.
- `vercel.json`: build estático `dist`, función `server.ts` y fallback SPA.
- Se añadió endpoint `/api/firebase-config` y se quitó la Firebase API key/proyecto hardcodeados de `public/firebase-messaging-sw.js`; el service worker usa configuración pública runtime.
- CI anterior: typecheck, build y Firestore rules tests completaron correctamente; el scan falló por la clave Firebase hardcodeada del service worker. La corrección se ha subido y requiere una nueva ejecución verde.
- Validación local: no ejecutada desde esta sesión.
- No se ha fusionado PR #25, no se ha publicado a Vercel y no se han desplegado Firebase rules/indexes.

**No declarar este release listo para producción hasta actualizar `TEST_REPORT.md` con las salidas reales y los ocho casos de aceptación completos.**
