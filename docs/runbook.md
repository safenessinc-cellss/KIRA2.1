# KIRA — Runbook de backoffice, contratos y finanzas

## Seguridad de despliegue
- Nunca añadir claves a Vite, Git, logs ni documentos Firestore en claro.
- Backend necesita FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET, KIRA_CRM_PII_ENCRYPTION_KEY, KIRA_CONFIG_ENCRYPTION_KEY, KIRA_CERT_SECRET y CRON_SECRET según módulos activos.
- Mantener Preview y producción en entornos separados; usar credenciales sandbox para Stripe/Mercado Pago.
- Reglas/índices Firestore solo se despliegan después de aprobación del owner y merge.

## Jobs financieros (Cloud Scheduler)
Zona horaria America/Sao_Paulo, POST con Authorization: Bearer <CRON_SECRET>.
- Día 1 06:00: /api/cron/invoices/generate, JSON {"periodLabel":"YYYY-MM"}.
- Diario 06:00: /api/cron/invoices/overdue.
- Diario 07:00: /api/cron/invoices/dunning.
- Diario 08:00: /api/cron/invoices/reconcile.
Cloud Scheduler no se crea automáticamente por el código; debe provisionarse en el proyecto GCP del backend. Las ejecuciones deben monitorearse y alertar por HTTP != 2xx.

## Outbox académico (asistencia y evaluaciones)

- Configurar Cloud Scheduler con POST a `/api/internal/academic-outbox/dispatch` cada 1–5 minutos, Authorization: Bearer `KIRA_OUTBOX_CRON_SECRET`.
- El endpoint procesa únicamente `session.attendance_marked.v1` y `assessment.graded.v1`; otros eventos quedan disponibles para sus consumidores.
- La proyección `student_performance/{studentId}_{groupId}` se recalcula idempotentemente desde el outbox. Los eventos usan lease, reintento exponencial y estado `failed` después de 8 intentos.
- Monitorizar respuestas HTTP, cantidad pending/failed y `lastError`; no editar la proyección desde el cliente.
- Si el worker falla, corregir la causa y reactivar/reintentar el evento mediante proceso administrativo auditado; nunca marcarlo processed manualmente.

## Incidentes

### Webhook de pago no confirma
1. Consultar logs del backend por request ID; nunca imprimir token ni payload sensible.
2. Revisar configuración del webhook en el proveedor y secreto en Secret Manager/Vercel backend.
3. Comprobar evento y orden en Firestore (paymentEvents, orders, transactions).
4. Reenviar evento desde el proveedor sandbox/portal; la deduplicación evita procesar dos veces.
5. Si hay orden pagada y factura no pagada, detener reintentos y escalar; no editar invoices.status manualmente.

### Pasarela en modo test
1. Verificar entorno activo en paymentGateways/{provider} mediante el endpoint administrativo.
2. Comprobar que credenciales sandbox y webhook sandbox correspondan al mismo entorno.
3. No cambiar a producción sin aprobación del owner y prueba de pago/conciliación.
4. Nunca resolver mediante edición de Firestore desde navegador.

### Lead duplicado
1. Buscar por HMAC de email/teléfono y origen; no exportar PII sin permiso asignado.
2. Verificar si hay crmLead existente y si ya tiene enrollmentId.
3. No borrar lead convertido ni crear enrollment manual paralelo.
4. Corregir asignación/etapa por endpoint auditado; conservar historial de interacciones.

### Matrícula sin cupo / contador inconsistente
1. Consultar course_groups/{groupId} y matrículas enrollments con groupId.
2. La reserva se hace en transacción Firestore; ante HTTP 409, refrescar datos y no forzar incremento manual.
3. Si el contador difiere del número de matrículas, pausar altas y ejecutar reparación controlada por script idempotente y auditado.
4. No aumentar capacidad para eludir conflicto sin autorización del responsable académico.

### Contrato no descarga o hash no coincide
1. Verificar bucket y permisos de service account (FIREBASE_STORAGE_BUCKET, Storage read/write).
2. Comparar SHA-256 del PDF descargado con enrollments.contractHash.
3. Si no coincide, bloquear firma; generar nuevo contrato y auditar sustitución.
4. No hacer el objeto público ni enviar enlaces con token a clientes.

### Facturas no generadas
1. Revisar que enrollment esté active, tenga plan monthly o custom y tenga cuota mensual/número de cuotas configurado.
2. Ejecutar /api/admin/invoices/jobs/generate como superadmin con periodo explícito.
3. Verificar docId enrollmentId_periodLabel y contador counters/invoiceNumber.
4. Un segundo job debe producir cero nuevas facturas para el mismo período.

### Dunning no entrega mensajes
1. Consultar payment_reminders y outbox invoice.dunning.queued.
2. status=queued significa evento preparado, no mensaje enviado.
3. Verificar consumidor de Notifications/proveedor de email/WhatsApp/SMS; reintentar desde outbox idempotente.
4. No cambiar manualmente factura a paid.

### Preview bloqueado por límite Vercel
1. No usar Preview anterior para aprobar SHA nuevo.
2. Guardar SHA final y mensaje exacto del proveedor.
3. Esperar ventana de límite o ejecutar vercel deploy --prebuilt desde CLI autenticado del owner.
4. No promover producción ni mergear sin Preview del SHA exacto y aprobación explícita.

## Rollback
1. Antes del merge, crear tag pre-backoffice-merge-YYYYMMDD en el commit base acordado.
2. Para rollback de código, revertir el merge commit y desplegar el último deployment READY conocido.
3. Revertir reglas/índices solo con snapshot y validación de dependencias; no eliminar colecciones con datos.
4. Mantener datos Firestore; preferir rollback compatible hacia atrás sobre borrado destructivo.
5. Registrar actor, SHA, hora, impacto y resultado en Audit.

## Deuda conocida
- Dunning genera cola de notificaciones, pero entrega externa aún requiere proveedor/worker.
- No se han configurado Cloud Scheduler jobs ni secretos en proyecto remoto.
- Refunds, impuestos, payouts y conciliación completa de contracargos quedan fuera del módulo actual.
- Los locks transaccionales de solapamiento coach/sala todavía deben reforzarse para concurrencia de agenda alta.


## Dashboard materializado
- Configurar Cloud Scheduler en America/Sao_Paulo con POST a /api/cron/dashboard/refresh cada 15 minutos y Authorization: Bearer <CRON_SECRET>.
- El body puede incluir periodId: YYYY-MM; por defecto se recalcula el mes actual.
- La API del dashboard lee exclusivamente dashboard_aggregates y oculta widgets según role_permissions. Si faltan agregados devuelve HTTP 503, no métricas ficticias.
- La reconciliación actual vuelve a calcular el período desde Firestore; supervisar la latencia y el límite de lecturas del proyecto.

## RBAC e integraciones
- Después de configurar MFA del superadministrador, ejecutar POST /api/admin/permissions/seed una sola vez para inicializar role_permissions.
- Los cambios se hacen con PATCH /api/admin/permissions/{role}; el rol superadmin es inmutable desde esta API.
- Configurar LANDING_CAPTCHA_SECRET y WHATSAPP_WEBHOOK_SECRET como secretos server-only. Los webhooks usan x-kira-timestamp y x-kira-signature con HMAC-SHA256 sobre timestamp + punto + cuerpo HTTP original.
- Revisar webhook_inbox para firmas inválidas, duplicados y errores de procesamiento; nunca reintentar manualmente eventos con signatureOk=false.
