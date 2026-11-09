# KIRA — Navegación oficial del backoffice y estado de integración

**Rama:** \`audit/kira-real-modules-security-commerce\`  
**Persistencia primaria:** Firebase Authentication + Firestore + Firebase Storage.  
**Estado:** primera vertical funcional de Dashboard y CRM; los nodos sin backend validado permanecen bloqueados en la UI.

## 1. Árbol oficial

\`\`\`text
📊 Dashboard (Visión General de Ventas y Matrículas)
🎯 Embudo de Ventas (CRM)
  ├── Leads Captados
  ├── Intentos de Contacto
  └── Inscripciones Confirmadas
🎓 Gestión de Cursos
  ├── Todos los Cursos (Online/Presenciales)
  ├── Grupos y Horarios
  └── Módulos y Clases
👥 Alumnos y Matrículas
  ├── Base de Alumnos
  ├── Contratos y Matrículas
  └── Rendimiento / Asistencia
💰 Finanzas
  ├── Mensualidades / Cuotas
  ├── Pasarela de Pago
  └── Cupones de Descuento
⚙️ Configuración
  ├── Integraciones (Landing Pages / WhatsApp)
  └── Usuarios y Permisos
\`\`\`

La sidebar se implementa en \`src/pages/Admin.tsx\` como componente exportado \`Sidebar\`. Los contadores se consultan al backend; la navegación usa la matriz legacy \`staffPermissions\` como puente. El servidor vuelve a comprobar permisos en cada endpoint.

### Diagrama Mermaid del árbol y sus dependencias

\`\`\`mermaid
flowchart TD
  ROOT[KIRA Backoffice]
  ROOT --> DASH[Dashboard]
  ROOT --> CRM[Embudo de Ventas]
  CRM --> LEADS[Leads Captados]
  CRM --> CONTACT[Intentos de Contacto]
  CRM --> CONVERT[Inscripciones Confirmadas]
  ROOT --> COURSES[Gestión de Cursos]
  COURSES --> CATALOG[Todos los Cursos]
  COURSES --> GROUPS[Grupos y Horarios]
  COURSES --> LESSONS[Módulos y Clases]
  ROOT --> STUDENTS[Alumnos y Matrículas]
  STUDENTS --> BASE[Base de Alumnos]
  STUDENTS --> CONTRACTS[Contratos y Matrículas]
  STUDENTS --> ATTEND[ Rendimiento / Asistencia]
  ROOT --> FINANCE[Finanzas]
  FINANCE --> INVOICES[Mensualidades / Cuotas]
  FINANCE --> GATEWAYS[Pasarela de Pago]
  FINANCE --> COUPONS[Cupones de Descuento]
  ROOT --> CONFIG[Configuración]
  CONFIG --> INTEGRATIONS[Integraciones Landing / WhatsApp]
  CONFIG --> PERMISSIONS[Usuarios y Permisos]
  LEADS --> DBCRM[(crmLeads)]
  CONTACT --> DBINTERACTIONS[(crmInteractions)]
  CONVERT --> DBENROLL[(enrollments)]
  CATALOG --> DBCOURSES[(courses)]
  GROUPS --> DBGROUPS[(courseGroups / groupSessions)]
  LESSONS --> DBLESSONS[(modules / lessons)]
  BASE --> DBUSERS[(users)]
  CONTRACTS --> DBCONTRACTS[(contracts / enrollments)]
  ATTEND --> DBATTEND[(attendance / assessments)]
  INVOICES --> DBINVOICES[(invoices)]
  GATEWAYS --> DBPAYMENTS[(paymentSettings / paymentGateways)]
  COUPONS --> DBCOUPONS[(paymentCoupons)]
  INTEGRATIONS --> DBINTEGRATIONS[(integrations / landingForms / webhookInbox)]
  PERMISSIONS --> DBPERMS[(rolePermissions)]
  DBCRM --> OUTBOX[(outbox)]
  DBENROLL --> OUTBOX
  DBPAYMENTS --> OUTBOX
  OUTBOX --> AUDIT[(auditLogs)]
  OUTBOX --> NOTIFY[Notifications]
  OUTBOX --> KPI[(dashboardKpis)]
\`\`\`

## 2. Mapeo y estado real

| Nodo | Implementación | Estado en esta rama |
|---|---|---|
| Dashboard | \`BackofficeDashboard\` → \`GET /api/admin/dashboard\` | Implementado, agregado en vivo limitado a 200 documentos/colección; no es todavía una vista materializada |
| Leads Captados | \`BackofficeCRM\` + \`crmLeads\` | CRUD básico, cifrado AES-256-GCM, deduplicación determinista compuesta, filtros por etapa |
| Intentos de Contacto | \`crmInteractions\` + GET/POST | Registro y listado con canal, resultado, notas cifradas y próxima acción |
| Inscripciones Confirmadas | conversión lead→enrollment | Transacción Firestore; requiere cuenta student, curso publicado, consentimiento y etapa contactado/calificado |
| Todos los Cursos | \`CMSView\` existente | Reutilizado; modalidad/capacidad/fechas aún no normalizadas en backend |
| Grupos y Horarios | pendiente | Bloqueado; falta colección, API, capacidad transaccional y calendario |
| Módulos y Clases | \`CMSView\` existente | Reutilizado parcialmente; vínculo groupId/orden no completado |
| Base de Alumnos | \`StudentManagementView\` existente | Reutilizado; revisar autorización por alcance y agregados de pago/asistencia |
| Contratos y Matrículas | módulos existentes no equivalentes al contrato de alumno | Bloqueado; el gestor de contratos existente corresponde a contratos de coaches |
| Rendimiento / Asistencia | pendiente | Bloqueado; faltan sesiones, asistencia, evaluaciones y umbrales |
| Mensualidades / Cuotas | pendiente | Bloqueado; no hay invoices/dunning/conciliación completos |
| Pasarela de Pago | \`AdminPaymentsConfig\` existente | Reutilizado parcialmente; Stripe/Mercado Pago, modo test/live, secretos cifrados, planes/cupones |
| Cupones de Descuento | \`PromotionsManagerView\` + Payment Coupons | Reutilizado parcialmente; falta límite por curso/grupo/alumno en checkout |
| Integraciones | pendiente | Bloqueado; landing/WhatsApp no conectados a inbox HMAC |
| Usuarios y Permisos | \`SecurityView\` existente | Reutilizado parcialmente; matriz rolePermissions por nodo y MFA step-up pendientes |
| Notifications / Audit / Storage | servicios transversales existentes | Parciales; falta worker durable/outbox dispatch completo |
| Verificación pública | \`/verify/:code\` existente | Fuera del backoffice |

Los nodos sin backend funcional están visibles pero deshabilitados. Esto evita habilitar pantallas que no pueden persistir ni hacer cumplir permisos. No se presentan como terminados.

## 3. Contratos API añadidos

- \`GET /api/admin/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD\`
- \`GET /api/admin/crm/leads?stage=&source=&assigned_to=\`
- \`POST /api/admin/crm/leads\`
- \`PATCH /api/admin/crm/leads/:id\`
- \`GET /api/admin/crm/interactions?leadId=\`
- \`POST /api/admin/crm/leads/:id/interactions\`
- \`POST /api/admin/crm/leads/:id/convert-to-enrollment\`

Contrato OpenAPI: [kira-backoffice-crm-dashboard-v1.openapi.yaml](../api/kira-backoffice-crm-dashboard-v1.openapi.yaml).

## 4. Modelo Firestore actual

No ejecutar migraciones PostgreSQL en esta rama. Las colecciones del vertical implementado:

- \`crmLeads/{leadId}\`: nombre/email/teléfono/notas cifrados; source, campaign, courseInterest, stage, assignedTo, score, consentGdpr, timestamps.
- \`crmInteractions/{interactionId}\`: leadId, channel, outcome, notesEncrypted, nextActionAt, actorId, createdAt.
- \`enrollments/{uid_courseId}\`: matrícula canónica existente; se añade leadId y status en la conversión.
- \`outbox/{eventId}\`: eventos pendientes escritos junto con la operación de dominio.
- \`auditLogs/{auditId}\`: actorId, action, nodePath, targetId, before/after y timestamp.
- \`transactions\`, \`invoices\`, \`certificates\`, \`courses\`: fuentes actuales consultadas por dashboard si existen.

### Diagrama de relaciones

\`\`\`mermaid
erDiagram
  USERS ||--o{ CRM_LEADS : assigned_to
  COURSES ||--o{ CRM_LEADS : course_interest
  CRM_LEADS ||--o{ CRM_INTERACTIONS : has
  CRM_LEADS ||--o| ENROLLMENTS : converts_to
  USERS ||--o{ ENROLLMENTS : student
  COURSES ||--o{ ENROLLMENTS : course
  ENROLLMENTS ||--o{ INVOICES : billed_by
  ENROLLMENTS ||--o{ CERTIFICATES : qualifies_for
  USERS ||--o{ AUDIT_LOGS : actor
  CRM_LEADS ||--o{ OUTBOX : emits
  ENROLLMENTS ||--o{ OUTBOX : emits
\`\`\`

## 5. Grafo de eventos

\`\`\`mermaid
flowchart TD
  LEAD[CRM Lead] -->|crm.lead.created.v1| OUTBOX[Firestore Outbox]
  LEAD -->|crm.lead.updated.v1| OUTBOX
  LEAD -->|crm.lead.converted.v1| OUTBOX
  OUTBOX --> NOTIFY[Notifications worker pendiente]
  OUTBOX --> ANALYTICS[Dashboard / Analytics]
  COURSE[Courses] --> GROUPS[Groups & Sessions pendiente]
  GROUPS --> ATT[Attendance pendiente]
  ATT --> PERF[Assessments pendiente]
  PERF --> CERT[Certificates]
  ENR[Enrollment] --> INVOICE[Invoices pendiente]
  PAY[Verified Payment webhook] --> ENR
  PAY --> INVOICE
  CERT --> VERIFY[Public /verify]
  ALL[Every write endpoint] --> AUDIT[Audit Logs]
\`\`\`

El vertical CRM persiste los eventos en \`outbox\`, pero aún no existe un worker durable con leases, backoff, DLQ y replay. Por tanto, la entrega a Notifications/Analytics no se declara completada.

## 6. Seguridad y privacidad

- Los documentos CRM no son legibles/escribibles desde Firebase Client SDK; las reglas Firestore los deniegan explícitamente.
- La API cifra PII con AES-256-GCM y AAD asociado a entidad/campo (evita intercambiar ciphertext entre email, teléfono, nombre o notas), con versión de esquema PII 2; exige \`KIRA_CRM_PII_ENCRYPTION_KEY\` (32 bytes en base64 o 64 caracteres hex).
- La deduplicación utiliza HMAC determinista de email + teléfono normalizado + source. No se almacena un hash simple de contacto.
- Los administradores no superadmin solo pueden consultar/editar leads cuyo \`assignedTo\` sea su UID. El superadmin autorizado es \`safeness.c.a@gmail.com\`.
- La conversión requiere consentimiento, etapa \`contacted\` o \`qualified\`, usuario alumno existente y curso publicado. La matrícula y la actualización del lead se confirman en una transacción Firestore.
- La clave CRM es independiente de \`KIRA_CONFIG_ENCRYPTION_KEY\`; no reutilizar claves de pago.
- Auditoría registra actor y \`nodePath\` para escrituras del CRM.
- Las reglas explícitas bloquean acceso directo a CRM, invoices, attendance, groups, integrations, rolePermissions y outbox hasta que sus APIs confiables existan.

## 7. Límites actuales del Dashboard

- Lee como máximo 200 documentos por colección con el helper actual. No cumple todavía el SLA de 2 segundos a escala.
- No usa \`mv_dashboard_kpis\`; la materialización/refresh cada 5 minutos requiere worker o agregadores programados.
- Muestra ingresos brutos; ingresos netos no se calculan hasta integrar refunds/conciliación.
- El indicador de alumnos en riesgo es cero provisional hasta tener attendance y assessments.
- Top cursos reparte el importe de una transacción entre los courseIds asociados; órdenes mixtas requieren snapshots de línea para exactitud.
- Los filtros implementados son fechas; filtro por moneda/curso pendiente.

## 8. Criterios de aceptación

| Nodo | Resultado |
|---|---|
| Dashboard | API real y widgets conectados: parcial; materialización, neto, filtros y SLO pendientes |
| Leads | CRUD básico, cifrado, deduplicación compuesta, filtros: parcial; import CSV y paginación pendientes |
| Intentos de contacto | Alta/listado, canal/outcome/notas cifradas/nextAction: parcial; edición e historial completo de auditoría en UI pendiente |
| Conversión | Transacción y evento outbox: parcial; falta cupo/grupo, integración de pago y E2E |
| Cursos | Vista existente reutilizada; campos de modalidad/capacidad/fechas pendientes |
| Grupos y horarios | No implementado |
| Módulos y clases | Reutilizado; groupId/orderIndex pendiente |
| Alumnos | Vista existente reutilizada; agregados de pago/asistencia pendientes |
| Contratos y matrículas | No implementado como contrato de alumno; certificados existentes no sustituyen contratos |
| Rendimiento / asistencia | No implementado |
| Cuotas | No implementado |
| Pasarela | Parcial; refunds, conciliación, impuestos, dunning y ciclo completo pendientes |
| Cupones | Parcial; restricciones por curso/grupo/alumno pendientes |
| Integraciones | No implementado |
| Usuarios y permisos | RBAC legacy; role_permissions y MFA step-up pendientes |

## 10. Jobs programados: estado y diseño objetivo

**No hay cron de cuotas ni conciliación habilitado todavía.** No se crea un job que llame a endpoints inexistentes o que marque pagos por inferencia.

| Job objetivo | Horario | Operación | Estado |
|---|---|---|---|
| Generación de cuotas | Diario 06:00, America/Sao_Paulo | Crear invoice por enrollment + periodo con clave única determinista | Pendiente de invoices y paymentPlan |
| Marcar vencidas | Diario 06:10, America/Sao_Paulo | Transición open → overdue según dueDate | Pendiente de invoices |
| Conciliación de pagos | Diario 07:00, America/Sao_Paulo | Comparar proveedor, order, transaction e invoice; generar discrepancias auditadas | Parcial en pagos, job pendiente |
| Refresco de KPIs | Cada 5 minutos | Recalcular agregados autorizados y persistir dashboardKpis | Pendiente de worker durable |

La implementación deberá usar Vercel Cron Jobs o Cloud Scheduler/Cloud Tasks, con autenticación interna, idempotencia, lock/lease y auditoría. El job no debe ejecutar cobros ni emitir certificados desde el cliente.

## 11. Runbook inicial

### Clave CRM no configurada
1. Revisar variable Vercel \`KIRA_CRM_PII_ENCRYPTION_KEY\` en Preview y Production.
2. Debe representar exactamente 32 bytes en base64 o 64 caracteres hex.
3. No rotarla sin plan de descifrado/re-cifrado de todos los campos \`*Encrypted\`.
4. No copiar la clave en chat, GitHub ni Firestore.

### Lead duplicado
1. La API responde HTTP 409 para la misma combinación normalizada de email, teléfono y origen.
2. Revisar el lead existente desde el backoffice con permiso.
3. No crear un duplicado manual con otro source para evadir la deduplicación.

### Conversión rechazada
1. Verificar consentimiento \`consentGdpr=true\`.
2. Verificar etapa \`contacted\` o \`qualified\`.
3. Verificar que el UID exista y tenga rol \`alumno\`.
4. Verificar curso publicado y que el lead tenga el mismo courseInterest.
5. Si ya existe matrícula para UID+curso, reconciliar el registro; no borrar el enrollment.

### Webhook/gateway caído
1. No marcar pagos como pagados manualmente.
2. Revisar firma, evento, orderId, importe y moneda.
3. Reprocesar únicamente con ID de evento idempotente después de confirmar el estado en el proveedor.
4. Conciliar orders/transactions antes de restaurar checkout.

### Matrícula sin cupo
Los grupos y la reserva transaccional de cupo aún no están habilitados. No aceptar matrículas a grupos con capacidad hasta implementar la transacción de cupos y las pruebas de carrera.


## 9. Fase A — vertical académica (implementación en la rama)

Backend Express añadido en `server.ts`:
- `POST /api/admin/groups`, `PATCH /api/admin/groups/:id`.
- `POST /api/admin/groups/:id/sessions`, `PATCH /api/admin/sessions/:sessionId`.
- `POST /api/admin/groups/:id/enroll`: transacción Firestore que lee grupo/alumno/curso/matrícula y actualiza contador + crea matrícula + audit + outbox en un commit.
- `POST /api/admin/sessions/:sessionId/attendance`: doc ID determinista sesión/alumno, creación idempotente, solo alumno matriculado y sesión realizada.
- `POST /api/admin/assessments`: valida rango de nota, peso y matrícula.
- `POST /api/admin/enrollments/:id/complete`: verifica pago y umbrales académicos (75 % / 60 por defecto).
- Proyección `student_performance` recalculada desde el flujo de eventos; no es editable por navegador.
- Certificados ahora exigen `enrollment.status === completed`; no basta el progreso enviado o un boolean legacy.

Seguridad Firestore:
- Reglas explícitas de denegación para las colecciones snake_case académicas y agregados.
- Los endpoints usan Firebase ID Token y control de administrador existente; permisos granulares activos quedan para Fase D.
- Se amplió lectura de sesiones/asistencia/evaluaciones con paginación de Firestore para no truncar silenciosamente a 200 documentos.

**Limitación actual:** el chequeo de solapamiento de sesiones es una validación previa basada en el inventario actual de sesiones, no una reserva serializable de agenda. Antes de considerar calendario de alta concurrencia listo, debe añadirse un bloqueo transaccional por coach/fecha y sala/fecha. La UI de estos subnodos y la integración de Coaching aún no están terminadas.
