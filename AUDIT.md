# KIRA 2.1 — Auditoría y baseline

Fecha: 2026-11-09  
Rama de trabajo: `release/v2.1.0`  
Base: `b1bbaf89ddc136dd3463628e184f88029fcb0e3b` (rama audit)  
Producción observada: deployment Vercel READY del SHA `423d8140a4261e589ed3c3c2a9c29b7258f6b04f`; no equivale a esta rama de trabajo.

## Alcance y evidencia

La revisión se realizó sobre los archivos del repositorio mediante GitHub. Esta sesión no dispone de un checkout local ni de un shell conectado al proyecto; por ello **no se ha ejecutado** `npm run build`, `tsc --noEmit`, `npm run lint`, emulador de Firestore ni pruebas de navegador. No se presenta un resultado de compilación como si se hubiera ejecutado. El Preview de Vercel debe aportar esa evidencia tras el push de esta rama.

## Baseline de módulos

| Módulo | Estado | Evidencia / brecha |
|---|---|---|
| Autenticación y rutas | ⚠️ | `ProtectedRoute` existe en `src/layouts/CoreLayout.tsx`; redirige roles no autorizados a `/`, no al portal de su rol. `src/App.tsx` ya separa alumno, coach, admin y HR. |
| Portal alumno | ⚠️ | `src/pages/Dashboard.tsx` existe y consulta progreso; Journaling está embebido y usa el modelo legado `journals`. No existe evidencia de CRUD separado `journal_entries`, análisis IA específico ni tier unificado. |
| Energía / tiers | ⚠️ | Rules y consumidores actuales usan `points`; el modelo solicitado usa `energyPoints`. No migrar ni renombrar sin fallback compatible. |
| Elite Library | ⚠️ | `src/pages/EliteLibrary.tsx` lista `coachPublicProfiles.mediaItems`; desbloqueo premium informa que compra no está habilitada. No simular pagos. |
| Reviews | ⚠️ | Colección `reviews` y validación existen en rules; falta verificar escritura transaccional y agregado seguro del coach. |
| Nudges | ❌ | No se verificó una implementación completa `/api/ai/nudges` ni subcolección de usuario. |
| Portal coach | ⚠️ | `src/pages/Coach.tsx` incluye dashboard, cursos, tracking/Nexus, chat y analítica; membresía usa `membershipStatus` y endpoint legado `/api/create-checkout-session`. |
| Editor curricular | ⚠️ | Se importan dnd-kit y editor enriquecido; falta validar límites de medios y orden batch end-to-end. |
| Session Intelligence | ⚠️ | `src/pages/SessionIntelligence.tsx` existe, persiste sesiones y llama a `/api/gemini/generate`; no se verificó captura de audio por chunks ≤10s ni cierre de AudioContext. |
| Super Admin | ⚠️ | Dashboard de actividad global existe en la rama audit; analítica financiera por ventanas, DAU/WAU/churn, business insights y white-label deben verificarse/terminarse. |
| HR B2B | ⚠️ | `src/pages/HRDashboard.tsx` consulta miembros y agregados por `companyId`; la lista de miembros expone datos individuales. Rules actuales permiten lectura a administradores de empresa. Debe retirarse el detalle individual para HR. |
| Privacidad de journals | ✅/⚠️ | Rules de `journals` limitan lectura/escritura al propietario; preservar esta frontera también para nuevas colecciones. |
| KIRA AI Chat | ⚠️ | ChatWidget/CoachChat y proxy Gemini existen; no se confirmó el endpoint contextual `/api/ai/chat` con límite 10/min por uid. |
| Pagos Stripe | ⚠️ | Stripe lazy client, checkout y webhooks existentes; mantenerlos, validar firma e idempotencia con pruebas. |
| Firestore rules | ⚠️ | Reglas amplias y con modelos existentes; hay colecciones deshabilitadas temporalmente. No reemplazar reglas completas sin pruebas de emulador. |
| Hosting Vercel | ⚠️ | Proyecto `kira2-1-g0`, framework Vite; deployment Production figura READY. Confirmar API runtime y smoke tests por rol antes de promoción. |

## Errores y riesgos baseline detectados

1. **Exposición potencial de secreto en build:** `vite.config.ts` define `process.env.GEMINI_API_KEY` en el bundle cliente. Aunque el valor pueda ser vacío en Vercel, esta práctica es insegura y debe eliminarse; el cliente ya llama al proxy backend.
2. **Variable Gemini divergente:** el backend consume `GEMINI_API_KEY`; la especificación espera `GOOGLE_GENAI_API_KEY`. Se requiere alias server-side compatible y documentar la variable legacy.
3. **Firebase Admin divergente:** el backend actualmente espera `FIREBASE_SERVICE_ACCOUNT_JSON` o `GOOGLE_SERVICE_ACCOUNT_JSON`; la lista esperada trae `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`. Añadir compatibilidad sin imprimir secretos.
4. **Firebase client:** `src/firebase.ts` consume correctamente `import.meta.env.VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`. Fallbacks actuales de proyecto/bucket deben revisarse para evitar configuración silenciosa incorrecta.
5. **Stripe publishable key:** no se confirmó referencia a `VITE_STRIPE_PUBLISHABLE_KEY`; buscar/añadir donde corresponda al flujo cliente, sin pasar secret key al cliente.
6. **Modelo journaling:** la colección real es `journals`, no `journal_entries`. Adaptar el contrato manteniendo la colección legada o una migración dual; nunca abrir lectura de diarios a HR/admin.
7. **HR:** cambiar vista a agregados de organización únicamente; evitar lecturas de `companies/{id}/members` que exponen filas individuales.
8. **Deploy:** la producción observada usa SHA `423d814`, mientras la base de esta rama contiene mejoras hasta `b1bbaf8`; no promover hasta CI + Preview + smoke tests.

## Env vars — verificación de referencias en código

| Variable esperada | Resultado baseline |
|---|---|
| `FIREBASE_PROJECT_ID` | ✅ server usa `process.env.FIREBASE_PROJECT_ID` |
| `FIREBASE_CLIENT_EMAIL` | ❌ no se observó consumo; backend usa JSON de service account |
| `FIREBASE_PRIVATE_KEY` | ❌ no se observó consumo; backend usa JSON de service account |
| `STRIPE_SECRET_KEY` | ✅ server |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ referencia debe confirmarse en cada webhook existente |
| `GOOGLE_GENAI_API_KEY` | ❌ server usa `GEMINI_API_KEY` |
| `APP_URL` | ⚠️ verificar callbacks/URLs de backend; no asumir equivalencia con `KIRA_APP_URL` |
| `VITE_FIREBASE_API_KEY` | ✅ client |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ client |
| `VITE_FIREBASE_PROJECT_ID` | ✅ client |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ client |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ client |
| `VITE_FIREBASE_APP_ID` | ✅ client |
| `VITE_STRIPE_PUBLISHABLE_KEY` | ⚠️ no confirmada |
| `VITE_APP_URL` | ❌ no confirmada |

**Importante:** esto informa referencias en código, no confirma la existencia de valores en Vercel. No se consultó ni modificó el dashboard de variables.

## Baseline de pruebas

- `npm run build`: pendiente de ejecución en runner/Preview.
- `tsc --noEmit`: pendiente de ejecución en runner/Preview.
- `npm run lint`: pendiente de ejecución en runner/Preview.
- `npm run test:all`: pendiente de ejecución en runner/Preview.
- Secret scan de `src/` y `dist/`: pendiente de ejecutar en runner; se detectó una inyección de env Gemini en `vite.config.ts`.
- Firestore Emulator y smoke tests por rol: pendientes.

## Próximas fases

Fase 1 debe preservar `src/firebase.ts` como singleton y adaptar tipos/hooks/rutas/rules sin romper el esquema existente. Fases 2–6 se completarán por módulos, con writes protegidos por backend o reglas y sin exponer datos privados. La promoción de producción solo se hará si la fase 7 queda verde con evidencia reproducible.
