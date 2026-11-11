# KIRA 2.1 — Plan de cierre operativo e integración

**Estado:** plan de ejecución; no es una declaración de que todas las funciones estén terminadas.
**Rama de trabajo:** `feat/kira-operational-platform-completion`.
**Fuente de verdad:** Firebase Authentication, Firestore y Firebase Storage. No introducir una segunda base de datos primaria.

## Principio de producto

Cada acción visible debe ejecutar un proceso real, autorizado, persistido y trazable. No se aceptan métricas ficticias, botones decorativos, estados de pago inferidos desde el navegador, certificados simulados ni respuestas IA inventadas. Si una dependencia no está configurada, el módulo debe indicarlo y bloquear la operación con un estado claro, nunca fingir éxito.

## Fases de implementación

1. **Identidad, seguridad y aislamiento**
   - Propietario único verificado `safeness.c.a@gmail.com`; privilegios de propietario no editables desde perfiles.
   - Administradores delegados con permisos granulares y firmados, sin comodines globales.
   - Revisión de todas las rutas Express, Firestore Rules, Storage Rules, WebSockets, tareas programadas y acceso multiempresa.
   - Protección reforzada de diarios, chats, audios, transcripciones y datos de bienestar.
2. **Pagos y ledger**
   - Configuración de Stripe y Mercado Pago desde Admin > Centro de pagos.
   - Secretos cifrados AES-256-GCM en Firestore mediante clave server-only; nunca exponer claves en el navegador.
   - Prueba de conexión sin cobro, validación de modo test/live, webhook firmado, deduplicación, idempotencia, conciliación y trazabilidad de pedido → pago → matrícula/entitlement → ledger.
   - Implementar y probar cancelaciones, reembolsos, contracargos, suscripciones, impuestos, facturas y liquidaciones antes de habilitarlos.
3. **Ciclo Alumno**
   - Registro/aprobación cuando corresponda, catálogo, checkout, matrícula, acceso, progreso, tareas, feedback, puntos, certificado y soporte.
   - Cada transición se deriva de eventos confirmados del backend.
4. **Ciclo Coach**
   - Aprobación, membresía, perfil, CRM, leads, agenda, sesiones, tareas, revisión, informes, ingresos y liquidaciones.
   - Datos e ingresos limitados al coach y a los alumnos asignados.
5. **HR y B2B**
   - Alta/baja de empresas y empleados, licencias, facturación y administración por tenant.
   - Indicadores de bienestar solo agregados, con consentimiento y umbral mínimo; jamás diarios ni transcripciones individuales.
6. **IA y comunicaciones**
   - Gemini exclusivamente desde backend autenticado; límites por usuario/tenant y control de costo.
   - Consentimiento específico para audio/transcripción; retención, borrado y registro de acceso.
   - Email, WhatsApp, notificaciones y outbox con reintentos, deduplicación y evidencia de entrega.
7. **Administración, UX y observabilidad**
   - Centro de configuración, auditoría, incidencias, reportes, branding y políticas.
   - Estados de carga/vacío/error/pendiente/completado en todos los módulos.
   - Monitoreo, backups, recuperación, accesibilidad y PWA real.
8. **Aceptación y lanzamiento**
   - TypeScript, unit tests, Firestore Rules tests, build, PWA verification y E2E por rol.
   - Pruebas negativas de permisos, concurrencia, pagos duplicados, fallos de webhook, aislamiento de tenants y recuperación.
   - Staging aislado de Firebase producción y credenciales sandbox.
   - No promover hasta aprobación explícita del propietario.

## Matriz de configuración administrativa

| Dominio | Editable desde Dashboard | Secreto/infraestructura que permanece server-only |
|---|---|---|
| Stripe / Mercado Pago | Proveedor, habilitación, modo, prioridad, clave API, secreto webhook, monedas, planes y cupones; prueba de conexión | Clave AES-256 de cifrado y configuración de URL/backend |
| KIRA AI / Gemini | Modelo permitido, límites, disponibilidad por rol/tenant, presupuesto y políticas de uso | `GEMINI_API_KEY`, credenciales de proveedor y límites de infraestructura |
| Firebase | Estado de servicios, políticas de acceso y parámetros funcionales | Cuenta de servicio, claves privadas, dominios OAuth y configuración del proyecto |
| CRM | Campos, etapas, reglas de asignación, retención y permisos | Clave de cifrado PII |
| Certificados | Plantillas, reglas de elegibilidad, marca y revocación | Clave HMAC de firma y acceso a Storage |
| HR / B2B | Umbral mínimo de cohortes, métricas permitidas, frecuencia, licencias y políticas de empresa | Credenciales de Scheduler/cron y cuenta de servicio |
| Mensajería | Plantillas, canales activos, reglas de reintento y preferencias | Tokens API, secretos de webhook y credenciales SMTP/WhatsApp |
| Almacenamiento | Políticas funcionales, límites y retención | Bucket, IAM y credenciales de servicio |
| Legal / privacidad | Identidad del controlador, contacto, versiones, retención, consentimientos y documentos | Llaves de cifrado, configuración de proveedor y registros de infraestructura |
| Outbox / automatizaciones | Frecuencia, políticas de reintento, tipos de eventos y estado | Tokens de cron, colas y permisos de ejecución |
| Branding / PWA | Logo, colores, nombre, manifest y accesos | Dominio, certificados TLS y configuración del hosting |

Los secretos de servicio no se deben capturar en campos web genéricos ni almacenar en texto plano en Firestore. Cuando el proveedor permita rotación segura desde el Dashboard, el backend debe cifrar el valor, ocultarlo tras guardar y auditar actor/fecha/resultado. La clave maestra de cifrado nunca se administra desde el propio Dashboard.

## Estado de configuración de pagos

El Centro de pagos ya dispone de interfaz para Stripe y Mercado Pago. Esta rama añade validación de correspondencia test/live, exige clave API y secreto webhook para activar una pasarela, permite probar conectividad sin cobrar y convierte la configuración del Dashboard en la fuente de verdad del checkout. Antes de habilitar cobros reales deben cargarse credenciales sandbox, verificar webhooks desde los portales de proveedor y completar pruebas E2E con cuentas de prueba.

## Criterios de aceptación global

- Una operación se considera completa solo si backend, persistencia, permisos, UI y auditoría están conectados.
- No se considera integrado un módulo porque exista una ruta o una tarjeta en el Dashboard.
- Los estados de pago se derivan de webhooks verificados y conciliación, nunca del retorno del navegador.
- Cada matrícula/entitlement requiere una orden pagada cuando el producto tiene precio.
- Los importes se almacenan en unidades menores enteras y con moneda explícita.
- Las acciones sensibles son idempotentes y tienen actor, fecha, entidad, resultado y correlación.
- Los datos de demo se mantienen separados y de solo lectura; nunca se mezclan con producción.
- Los errores de configuración se muestran como pendientes y no se convierten en datos ficticios.
