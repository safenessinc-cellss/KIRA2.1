# DECISIONS — KIRA 2.1 Admin Ampliado

Fecha: 2026-11-09
Base: `main` @ `08da3f67e003e87c26e80c17dab7479f39a14dce`
Rama: `audit/admin-expanded-baseline`

## Decisiones iniciales

1. **Preservar el stack:** mantener React 19, TypeScript, Vite, Tailwind v4, Firebase, Express/Vercel, Stripe y Mercado Pago. No sustituir librerías ni reconstruir la aplicación.
2. **Rutas independientes:** añadir las cuatro rutas admin bajo la protección existente de UI, y repetir autorización admin en cada endpoint server-side.
3. **Admin actual:** conservar `AdminMonitor` y sus módulos existentes. Separar las nuevas páginas en componentes/archivos dedicados para no seguir aumentando el monolito `src/pages/Admin.tsx`.
4. **Branding / Insights / Moderación:** no duplicar ni borrar. Branding tiene un componente `WebsiteConfigView` ya existente; Insights tiene tarjetas estáticas en el dashboard; Moderación no aparece conectada en la navegación inspeccionada. Confirmar el estado de cada sección antes de reubicarla.
5. **Actividad:** introducir `activity_logs` como nuevo esquema auditable. No reutilizar silenciosamente `auditLogs` ni `logs`; se puede crear una capa de compatibilidad/consulta si aporta valor, pero mantener semánticas separadas.
6. **Privacidad:** los logs solo almacenarán tipo de acción, referencias, metadata permitida y datos técnicos mínimos. Prohibido incluir texto de journals o mensajes. La excepción de reportes se limitará a mensajes concretos con reporte `pending`, no a acceso general a conversaciones.
7. **Analytics:** no conceder acceso admin a journals para resolver el error actual. Usar agregados server-side y no devolver texto ni identificadores innecesarios.
8. **Aprobación de coaches:** ampliar `approvalStatus` y el flujo actual solo después de determinar cómo se crean actualmente los perfiles. `coach_applications` será el expediente de solicitud; el documento `users/{uid}` seguirá siendo la fuente de rol/autorización.
9. **Certificados:** mantener compatibilidad con `certificateRequests`, `certificates` y `certificatePublic`. Los certificados existentes con `status=issued` deben seguir validando como activos; una revocación debe actualizar de forma atómica el documento privado y su proyección pública.
10. **Pagos:** preservar `orders`, `transactions`, `paymentEvents` y los webhooks existentes. Añadir refunds/payouts como registros nuevos vinculados a la transacción original. No cambiar importes históricos ni asumir USD: conservar moneda/unidades del ledger.
11. **Payouts:** cálculo server-side, deduplicación por transacción y liquidación manual v2.1. Stripe Connect queda documentado como v2.2, no simulado.
12. **Rate limits:** usar limitadores server-side por UID y operación; no confiar en controles de UI. Diseñar para persistencia/distribución en Vercel, no solo memoria local de una instancia.
13. **Índices:** crear `firestore.indexes.json` solo con consultas implementadas y verificadas; no inventar índices basados únicamente en el esquema propuesto.
14. **Pruebas:** separar pruebas unitarias/integración con mocks del entorno de producción. No realizar reembolsos reales ni cambiar roles de usuarios reales durante smoke tests.

## Conflictos identificados

- El prompt describe React Router v6, pero el repositorio declara `react-router-dom ^7.14.1`. Se adapta el código a la versión instalada.
- El prompt propone certificados `pending_admin/active/revoked`, mientras la implementación actual usa `issued` y validación pública firmada. Se requiere migración retrocompatible.
- El prompt habla de Stripe, pero el checkout real también admite Mercado Pago. La consola debe distinguir proveedor y moneda.
- La privacidad solicitada prohíbe lectura general de journals por administradores, mientras `BIView` intenta leer `journals` directamente. La privacidad prevalece: corregir BI con agregados.
- El prompt habla de `activity_logs`; existen `auditLogs` y `logs` con reglas distintas. No mezclarlos sin un contrato explícito.

## No realizado en esta fase

No se modificó código funcional, reglas Firestore, datos, secretos, variables de Vercel, configuración Stripe/Mercado Pago ni producción.
