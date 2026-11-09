# ADR-0003: límites de dominio, transacciones e integración por outbox

- Estado: Propuesto para implementación en rama de auditoría.
- Fecha: 2026-11-08.

## Contexto

KIRA usa React/Vite, Express y Firestore. Los webhooks de pago actualizan órdenes, transacciones, matrículas y notificaciones. La emisión de certificados genera un PDF, guarda activos y registra la firma. Los consumidores asíncronos todavía no cuentan con un outbox/worker durable completo.

## Decisión

1. Mantener bounded contexts separados: Identity, Courses, Enrollment, Payments, Certificates, Notifications, Configuration, Storage, Audit y Analytics.
2. Los contextos no importan servicios internos de otros contextos. Se comunican mediante interfaces de aplicación y eventos versionados.
3. Toda transición crítica de estado usa transacción Firestore con lectura/validación/escritura atómica. Los batches solo se usan para escrituras que no dependen de lecturas concurrentes.
4. Cada evento de dominio se persiste en la colección `outbox` dentro de la misma transacción que confirma el cambio del agregado.
5. Un worker reclama eventos con lease, procesa idempotentemente, registra intentos, aplica backoff exponencial y envía a DLQ tras el máximo configurable.
6. El webhook entrante valida firma y timestamp antes de aceptar el evento; guarda un ID de proveedor único y responde idempotentemente a duplicados.
7. Payments emite `payment.succeeded.v1`; Enrollment consume el evento y concede entitlement. Certificates solo consume `enrollment.completed.v1` y valida el pago según la política efectiva. Payments nunca llama a Certificates.
8. Reembolsos son agregados propios. Solo el evento confirmado `payment.refunded.v1` puede iniciar la política de suspensión/revocación.
9. Configuración se versiona con optimistic concurrency (`expectedVersion`). Rollback crea una versión nueva y nunca elimina el historial.
10. Los secretos usan AES-256-GCM con key version y AAD; la clave maestra se provisiona fuera de Firestore. Se planifica migración a KMS para rotación administrada.

## Consecuencias

- Mejora la consistencia frente a webhooks duplicados/concurrentes y fallos parciales.
- Añade colecciones, worker y observabilidad; no debe implementarse un worker in-memory en un despliegue multi-instancia.
- Firestore no ofrece transacciones distribuidas con Stripe/Mercado Pago: se necesita saga/outbox y reconciliación.
- La generación PDF/Storage debe ser reintentable y separada de la transacción de emisión.
- El rollout exige emulador Firestore, pruebas de carrera, replay y E2E sandbox.

## Alternativas descartadas

- SQL/PostgreSQL añadido solo para satisfacer el formato del requisito: duplicaría el dominio sin necesidad validada.
- Llamadas directas Payments → Certificates: acoplamiento y riesgo de emitir/revocar fuera de la política académica.
- Batch Firestore como sustituto de transacción read-modify-write: no evita carreras.
- Efectos secundarios síncronos sin outbox: pueden perderse si la instancia cae después del commit.
