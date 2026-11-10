# AUDIT.md — KIRA 2.1 Unified Production Readiness

**Propietario / autoría:** Safeness Inc.  
**Repositorio:** `safenessinc-cellss/KIRA2.1`  
**Rama de auditoría:** `audit/kira2.1-unified-production`  
**Base auditada:** `main` — `08da3f67e003e87c26e80c17dab7479f39a14dce`  
**Proyecto Vercel:** `kira2-1-g0`  
**Dominio objetivo:** `https://kira.coach`  
**Fecha:** 2026-11-10  
**Estado:** auditoría estática y de configuración remota inicial. No se modificó código de producción ni se publicó un nuevo deployment.

## 1. Dictamen ejecutivo

El repositorio ya contiene una base amplia de KIRA 2.1: React 19, TypeScript, Vite, Tailwind v4, Express, Firebase/Firestore, Stripe SDK, Google GenAI SDK, PWA, módulos de Alumno, Coach, Admin y HR, además de trabajo de CRM, certificados y workflows académicos en ramas/PRs abiertos.

Sin embargo, **el estado operativo actual no permite declarar KIRA 2.1 lista para producción transaccional**. Vercel mantiene `KIRA_DEMO_MODE=true` en Production y varias credenciales obligatorias de firma, cifrado, CAPTCHA y tareas programadas aparecen creadas pero vacías. La última deployment listada como Production usa la rama `audit/kira-apple-dashboard-combined`; la deployment más reciente READY es una Preview (sin target Production). Por lo tanto, una publicación inmediata de la versión completa podría mostrar interfaz, pero no habilitar de forma segura pagos, certificados firmados, escrituras críticas ni procesos programados.

**Recomendación:** continuar sobre una rama de integración aislada, completar los bloqueos de seguridad/operación y validar un Preview del SHA exacto antes de promover. No sobrescribir `main`, no fusionar PRs en bloque y no desactivar DEMO para aparentar funcionalidad.

## 2. Evidencia observada

### 2.1 Repositorio y stack
- Repositorio accesible con permisos de lectura y escritura; rama por defecto: `main`.
- `package.json`: React 19, React Router 7, Vite 6, TypeScript 5.8, Tailwind CSS 4, Firebase 12, Express 4, Stripe 22, Google GenAI SDK, Recharts, Motion y Vite PWA.
- El entrypoint real es `src/main.tsx`, que importa `src/App.tsx`. Existe además un `App.tsx` en la raíz con una versión distinta de rutas; debe verificarse si es archivo legado huérfano antes de eliminarlo.
- Existe `server.ts` con endpoints y servicios backend; `firestore.rules` contiene reglas extensas; existen documentos de arquitectura y auditoría previos.
- `.env` no existe en el árbol de `main` consultado. `.gitignore` excluye `.env*` y permite `.env.example`. La observación histórica de un `.env` versionado en el plan de auditoría anterior no se confirma en esta revisión de `main`.

### 2.2 Vercel / producción
- Proyecto Vercel: `kira2-1-g0`; dominios asociados incluyen `kira.coach` y `www.kira.coach`.
- En la lista reciente de deployments, la última READY corresponde a Preview de `feat/kira-demo-ui-polish`; la última deployment con `target=production` corresponde a `audit/kira-apple-dashboard-combined`.
- La variable de producción `KIRA_DEMO_MODE` está establecida en `true`. También existe en Preview/Development con valor `true`.
- Las siguientes variables sensibles están registradas pero vacías en el inventario consultado: `LANDING_CAPTCHA_SECRET`, `KIRA_CERTIFICATE_SIGNING_SECRET`, `KIRA_CERT_SECRET`, `CRON_SECRET`, `KIRA_OUTBOX_CRON_SECRET`, `KIRA_CRM_PII_ENCRYPTION_KEY` y `KIRA_PAYMENTS_ENCRYPTION_KEY`.
- Existen variables de configuración Firebase Web (`VITE_FIREBASE_*`) y variables cifradas `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `KIRA_APP_URL`. La presencia de estas variables no demuestra por sí sola que Firebase Admin esté inicializado correctamente.
- No se leyeron ni imprimieron valores secretos.

### 2.3 Riesgos de código que requieren corrección
1. **Posible exposición de clave Gemini en el bundle:** `vite.config.ts` define `process.env.GEMINI_API_KEY` para el cliente. Si la variable existe durante el build, Vite puede sustituirla dentro del bundle del navegador. La clave debe quedar exclusivamente en `server.ts`; el cliente debe llamar a endpoints autenticados.
2. **Elevación de privilegios en cliente:** `src/hooks/useAuth.ts` asigna `role=admin` al correo propietario desde el navegador e intenta escribir ese rol en Firestore. La autorización de superadministrador debe resolverse y validarse en backend/Custom Claims/Rules, no depender de un if del frontend.
3. **Registro de rol solicitado desde cliente:** el flujo de alta lee `requestedRole` desde `sessionStorage`; debe garantizarse que solicitar rol Coach nunca conceda rol efectivo ni aprobación. El rol privilegiado debe establecerse por backend.
4. **Privacidad de perfiles y journals:** las reglas y consultas deben auditarse por colección y endpoint. El principio obligatorio es que Coach/HR/Admin no puedan leer journals ni notas privadas; HR solo debe recibir agregados consentidos y con umbral de grupo.
5. **UI no coincide aún con la especificación visual entregada:** `src/index.css` utiliza base teal/luminosa y no implementa la identidad solicitada de Glassmorphism oscuro (`#0B0F17`, superficies translúcidas, violeta `#7C5CFF`, cian `#22D3EE`). Debe aplicarse un sistema de diseño coherente, responsive y accesible, no una sustitución indiscriminada de estilos.
6. **Archivos de entrada duplicados:** hay `App.tsx` en raíz y `src/App.tsx`; el entrypoint importa el segundo. Determinar dependencias del primero antes de retirarlo.
7. **Configuración de ejemplo desactualizada:** `.env.example` solo documenta `GEMINI_API_KEY` y `APP_URL`; debe sincronizarse con el inventario server-only real, sin valores de secretos.

## 3. Estado de módulos frente al Master Prompt

La existencia de una página, componente o endpoint no equivale a flujo funcional validado. El repositorio ya tiene rutas y trabajo relacionado con los cuatro roles, cursos, diario, biblioteca, comunidad, perfil, sesiones, HR, certificados y administración. También existen PRs de integración con tareas académicas, CRM y PWA.

Aún debe realizarse una matriz de trazabilidad ruta → componente → endpoint → colección → regla → prueba para cada requisito:
- Alumno: cursos, journaling privado, biblioteca, certificados, coaches, mensajes, progreso/medallas y bienestar.
- Coach: dashboard, cursos/editor, entregas, CRM, Session Intelligence, Copilot y perfil público.
- Admin: usuarios/RBAC, aprobación de coaches, certificados, finanzas/pagos, insights, branding y moderación.
- HR: licencias y analítica estrictamente agregada con consentimiento y umbral mínimo.
- IA: recomendaciones, chat, análisis de journal/sesión, generación, resúmenes y quizzes; verificar autenticación, minimización de datos, consentimiento, rate-limit y ausencia de PII.
- Marketplace: checkout, webhooks firmados, idempotencia, ledger, reembolsos y liquidaciones; no presentar botones simulados como operaciones reales.

## 4. Pull requests y ramas que requieren reconciliación

Se observaron PRs abiertos que representan líneas de trabajo parcialmente solapadas:
- PR #25 `release/admin-expanded-v1`: ampliación Admin; su descripción informa 94 commits por delante de `main`, pero deja E2E, secret scan y bloqueos operativos pendientes.
- PR #27 y #28: workflows Coach/Alumno, certificados, CRM, PWA y seguridad; ambos permanecen Draft según sus descripciones y reportan limitaciones de Preview/credenciales.
- PR #33: navegación responsive y base visual; requiere validar su SHA y no coincide con el tema oscuro solicitado.
- PR #18: auditoría integral/CRM/finanzas; permanece Draft y su propio checklist reporta secretos vacíos, DEMO read-only y E2E incompleto.

No fusionar estos PRs entre sí ni directamente a `main` sin comparar árboles, bases y SHAs actuales. La integración debe elegir una única línea base y portar cambios no duplicados de forma incremental.

## 5. Bloqueos P0 antes de habilitar operaciones reales

| ID | Bloqueo | Acción requerida | Criterio de cierre |
|---|---|---|---|
| P0-1 | `KIRA_DEMO_MODE=true` en Production | Mantenerlo activo hasta cerrar los demás gates; luego desactivar con aprobación del owner | Smoke/E2E autenticados pasan en entorno real |
| P0-2 | Firebase Admin | Configurar y verificar service account/identidad de servidor y permisos mínimos | Lecturas/escrituras backend controladas y auditadas |
| P0-3 | Cifrado CRM y pagos | Proveer claves válidas de 32 bytes para `KIRA_CRM_PII_ENCRYPTION_KEY` y `KIRA_PAYMENTS_ENCRYPTION_KEY` | Round-trip de cifrado y rotación probados |
| P0-4 | Firma de certificados | Configurar secreto de firma compatible con certificados existentes | Emisión, verificación y revocación probadas |
| P0-5 | CAPTCHA y cron/outbox | Configurar `LANDING_CAPTCHA_SECRET`, `CRON_SECRET`, `KIRA_OUTBOX_CRON_SECRET` | Verificación de token, cron autorizado y deduplicación probados |
| P0-6 | Pagos | Configurar Stripe/Mercado Pago sandbox, secretos y webhooks firmados | Checkout, webhook, idempotencia, refund y ledger E2E |
| P0-7 | IA | Configurar clave Gemini server-only y quitar su definición del bundle Vite | Escaneo de artefactos confirma ausencia de secretos |
| P0-8 | IAM/privacidad | Mover rol propietario y aprobaciones a autoridad backend; probar Rules y endpoints | Tests negativos de escalación y acceso a journals pasan |

## 6. Plan de ejecución recomendado

### Fase A — Seguridad base
1. Corregir la inyección potencial de Gemini en Vite.
2. Revisar y corregir la autoridad de roles en servidor/Custom Claims/Firestore Rules.
3. Revisar acceso de perfiles, journals, mensajes, archivos y agregados HR.
4. Sincronizar `.env.example`, documentación y validadores de configuración.

### Fase B — Integración funcional
1. Seleccionar una rama base única tras comparar PR #25, #27, #28 y #33.
2. Construir matriz de trazabilidad de todos los módulos solicitados.
3. Implementar únicamente gaps comprobados; reutilizar componentes y servicios existentes.
4. Aplicar la identidad visual oscura solicitada mediante tokens y componentes compartidos, respetando contraste, responsive y reduced-motion.

### Fase C — Calidad
1. Ejecutar lint/typecheck, pruebas unitarias, build, PWA y Firestore Rules tests.
2. Añadir pruebas de integración para permisos, journal, HR aggregates, certificados, pagos y webhooks.
3. Generar Preview del SHA exacto y ejecutar smoke/E2E con cuentas de prueba.
4. Revisar visualmente escritorio, tablet y móvil.

### Fase D — Publicación
1. Confirmar secretos operativos sin exponerlos en Git o cliente.
2. Desactivar DEMO solo después de cerrar P0 y con aprobación explícita.
3. Promover el SHA validado a Production, sin desplegar reglas/índices Firebase no verificados.
4. Ejecutar smoke test en `https://kira.coach`, verificar autenticación y flujos críticos, registrar deployment y plan de rollback.

## 7. Límites de esta auditoría

- Esta revisión es estática y de configuración remota; no se ejecutó el proyecto en un entorno local, no se accedió a cuentas reales y no se realizaron transacciones.
- No se certificó el funcionamiento visual de Preview autenticado.
- No se leyeron valores secretos.
- No se modificó `main`, no se fusionó ningún PR y no se desplegó producción.
- El presente documento es la puerta de aprobación para comenzar cambios de código en una rama aislada.

## 8. Aprobación requerida

**Solicito aprobación del owner de Safeness Inc. para ejecutar las Fases A–C en la rama aislada `audit/kira2.1-unified-production`.** La publicación a Production será una decisión separada, posterior a los criterios P0, Preview READY del SHA exacto y pruebas E2E. El dominio puede recibir una versión visual validada antes, pero no se habilitarán pagos, certificados oficiales ni escrituras protegidas mientras el backend permanezca en modo DEMO o falten secretos obligatorios.

---
© 2026 Safeness Inc. — KIRA 2.1
