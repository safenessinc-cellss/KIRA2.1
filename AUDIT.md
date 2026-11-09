# AUDIT — Admin Ampliado KIRA 2.1

Fecha: 2026-11-09
Repositorio: `safenessinc-cellss/KIRA2.1`
Rama base inspeccionada: `main`
Commit base: `08da3f67e003e87c26e80c17dab7479f39a14dce`
Rama de auditoría: `audit/admin-expanded-baseline`

## Alcance

Auditoría de solo lectura para incorporar:
- `/admin/users` — User Activity Center
- `/admin/coach-approvals` — Coach Approvals
- `/admin/certificate-approvals` — Certificate Approvals
- `/admin/payments` — Payment Gateway Console

Se preservan Analytics, Branding, Insights IA y Moderación. No se han modificado archivos funcionales, reglas de Firestore, datos ni configuración de Vercel.

## Hallazgos por área

| Área | Estado | Evidencia / observación |
|---|---|---|
| Base React / TypeScript / Vite | ⚠️ | `package.json` confirma React 19, TypeScript, Vite 6 y Tailwind v4. El router instalado es `react-router-dom ^7.14.1`, no v6 como dice el prompt. |
| Admin actual | ⚠️ | `src/pages/Admin.tsx` contiene un `AdminMonitor` con navegación interna por estado local. No hay rutas independientes para los cuatro módulos solicitados. |
| Analytics | ⚠️ | Existe `BIView` y se enlaza desde la navegación actual. Lee directamente `journals` para contar `sentiment`; las reglas actuales permiten leer journals solo al dueño. Esto causa una incompatibilidad de permisos y debe sustituirse por agregados seguros. |
| Branding | ⚠️ | Existe `WebsiteConfigView` y lógica de configuración de `settings/website`, pero en el bloque de navegación/render inspeccionado no aparece conectado como sección accesible. Verificar el archivo completo antes de decidir cómo restaurarlo; no duplicarlo. |
| Insights IA | ⚠️ | Hay tarjetas de “Kira Intelligence: AI-Suggested Insights” con contenido estático en el dashboard de administración. No se ha verificado un flujo de generación/caché real para esa vista. |
| Moderación | ❌ | No se encontró una sección de moderación/reportes en la navegación ni en los componentes renderizados de `AdminMonitor`. La colección `reports` sí tiene reglas Firestore. |
| User Activity Center | ❌ | No existen rutas `/admin/users` ni `/admin/users/:uid`, endpoints admin de actividad, ni reglas para `activity_logs`. Existe `auditLogs`/ `logs` con otro esquema; no asumir que son intercambiables. |
| Coach Approvals | ⚠️ | Hay un flujo existente de aprobación de usuarios/coaches dentro de `Admin.tsx` y campos `approvalStatus` en `users`; no se encontró `coach_applications` ni endpoints de revisión dedicados. Debe extenderse el flujo existente sin duplicar aprobaciones. |
| Certificate Approvals | ⚠️ | Existe `certificateRequests`, emisión server-side en `POST /api/certificates/issue` y validación pública en `GET /api/certificates/validate/:token`. El estado actual es `issued`; las reglas hacen certificados inmutables para clientes. No existe el ciclo `pending_admin/active/revoked` solicitado. |
| Payment Gateway Console | ⚠️ | Existe checkout server-side para Stripe y Mercado Pago, webhook Stripe/Mercado Pago, `orders`, `transactions`, `paymentEvents`, `auditLogs` y `memberships`. No se encontraron refunds, payouts, webhook_events ni endpoints admin de pagos. No confundir `paymentEvents` con el nuevo historial de webhooks sin migración compatible. |
| Autorización API admin | ❌ | `verifiedUser()` valida el ID token Firebase, pero no es un guard admin. El endpoint de emisión de certificados hace una comprobación puntual de email/rol; no hay middleware común para endpoints admin. |
| Validación Zod | ❌ | `zod` no aparece en dependencias de `package.json`; no se verificó validación Zod común en los endpoints actuales. |
| Índices Firestore | ❌ | No se encontró `firestore.indexes.json` en la raíz de `main`. |
| Reglas Firestore nuevas | ❌ | No existen matches para `activity_logs`, `coach_applications`, `refunds`, `payouts` ni `webhook_events`. |
| Build / tests | ⚠️ | No se ejecutaron `tsc`, `npm run build`, lint ni pruebas de reglas: el acceso utilizado es lectura GitHub y no proporciona un checkout ejecutable del repo. No declarar build verde. |

## Archivos inspeccionados y decisión preliminar

| Archivo | Estado | Acción propuesta para implementación |
|---|---|---|
| `src/App.tsx` | Existe | Extender rutas lazy bajo el guard admin existente; preservar rutas y layouts actuales. |
| `src/pages/Admin.tsx` | Existe (4.661 líneas) | Mantener el AdminMonitor y los componentes actuales; añadir enlaces/contadores solo tras mapear correctamente Branding, Insights y Moderación. Evitar una reescritura monolítica. |
| `src/layouts/DashboardLayout.tsx` | Existe | Preservar layout; revisar navegación admin para enlaces a nuevas rutas y menú móvil. |
| `src/layouts/CoreLayout.tsx` | Existe | Preservar `ProtectedRoute`; no confiar en él como única seguridad. |
| `server.ts` | Existe (681 líneas) | Añadir router/handlers admin con verificación de token + rol admin server-side, validación de entrada, límites de tasa y auditoría. Preservar checkout y webhooks actuales. |
| `firestore.rules` | Existe (548 líneas) | Añadir reglas puntuales y compatibles; no reemplazar reglas actuales. Revisar antes el conflicto Analytics/journals. |
| `firestore.indexes.json` | No encontrado | Crear únicamente los índices requeridos por consultas nuevas y existentes verificadas. |
| `package.json` | Existe | No cambiar stack. Añadir Zod solo si se confirma que no hay validador equivalente ya instalado/compartido. |

## Endpoints existentes observados en server.ts

- `GET /api/health`
- `GET /api/gemini/config`
- `POST /api/gemini/generate`
- `POST /api/create-checkout-session`
- `POST /api/webhooks/stripe`
- `POST /api/webhooks/mercadopago`
- `POST /api/certificates/issue`
- `GET /api/certificates/validate/:token`

No se encontraron los endpoints del Admin Ampliado en el archivo inspeccionado.

## Riesgos / bloqueos que deben resolverse antes de desplegar

1. **Privacidad de journals:** `BIView` lee documentos de `journals` en cliente admin, pero las reglas actuales restringen lectura al propietario. No abrir journals a admins para “arreglar” el dashboard. Migrar BI a agregados server-side sin texto y verificar la necesidad de acceso de emergencia para reportes; la excepción de mensajes reportados debe ser acotada por documento/reporte pendiente.
2. **Certificados existentes:** el modelo real usa `certificateRequests`, `certificates` con estado `issued` y `certificatePublic` firmado. Cambiarlo directamente a `pending_admin/active/revoked` puede invalidar certificados actuales. Se requiere transición retrocompatible y actualización atómica de la proyección pública.
3. **Pagos existentes:** el ledger real contiene `orders`, `transactions` y `paymentEvents`, y admite Stripe + Mercado Pago. Refunds y payouts deben integrarse con ese modelo y con el proveedor original; no recalcular ni borrar históricos.
4. **Identidad admin:** Firestore reconoce el email propietario y rol `admin`; los nuevos endpoints deben comprobar el rol desde un perfil confiable después de verificar el ID token. No confiar en rol enviado por el cliente.
5. **Reembolsos reales:** no ejecutar refunds ni modificar saldos de producción durante la implementación/pruebas. Usar Stripe test mode o mocks verificables; cualquier refund real es una operación financiera irreversible.
6. **RBAC y reglas:** no desplegar reglas nuevas sin pruebas de acceso para alumno, coach, admin y hr_admin. La regla actual de lectura de perfiles de usuarios es amplia y requiere revisión separada, sin ampliarla.

## Resultado de Fase 0

- [x] Repositorio y rama estable identificados.
- [x] Archivos base inspeccionados.
- [x] Módulos actuales y brechas iniciales documentados.
- [x] Rama de auditoría creada desde `main`.
- [ ] Build, lint y pruebas locales ejecutados (requiere checkout/entorno ejecutable).
- [ ] Revisión del plan de implementación y autorización para modificar código.

**Conclusión:** la ampliación es viable, pero no es solo añadir cuatro pantallas. Requiere endpoints admin protegidos, reglas Firestore, compatibilidad con los ledgers actuales y una corrección previa del acceso Analytics a journals. No se ha tocado producción.
