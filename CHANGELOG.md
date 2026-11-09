# CHANGELOG — Admin Expanded v1

## Implementación
- Se añade una capa server-side común de autorización para `/api/admin/*`, basada en Firebase ID token y rol Firestore `admin`.
- Se añaden endpoints iniciales de agregados Analytics, usuarios/actividad, acciones de usuario, solicitudes de coach, aprobación/revocación de certificados, pagos, reembolsos por proveedor, payouts manuales y estado Stripe.
- Se conserva el modelo anterior de certificados y su firma; se agregan `adminStatus`, `requiresManualApproval`, revisión y revocación como campos adicionales.
- Se agregan reglas de aislamiento para logs, solicitudes, refunds, payouts y webhooks; se restringe el acceso general admin al texto de mensajes.
- Se añaden índices compuestos iniciales solicitados.
- Se documenta la política de privacidad y el procedimiento de deploy/rollback.

## Limitaciones pendientes de validar
- Build TypeScript/Vite, reglas Firestore y smoke tests no ejecutados en esta sesión.
- La cola de webhooks y su reproceso requieren integración con una tarea durable; el endpoint actual registra la solicitud, no reejecuta automáticamente el proveedor.
- Email transaccional no se ha conectado en estas rutas; se generan notificaciones in-app donde procede.
- El cálculo de payouts requiere una asignación fiable de coach a cada transacción; el ledger actual inspeccionado no garantiza ese campo.
- El logger debe integrarse con cada acción de dominio adicional a login/logout.
