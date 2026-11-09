# ADR-0006 — Contratos privados e invoices idempotentes

- **Estado:** Implementado en rama de auditoría; pendiente E2E con proveedores sandbox
- **Fecha:** 2026-11-08

## Contexto
Las matrículas necesitan contrato verificable y un libro de cuotas mensual. Los importes, pagos y firmas no pueden depender del navegador.

## Decisión
1. PDF de contrato generado server-side, guardado en Firebase Storage privado, referenciado por `gs://bucket/path` y protegido por SHA-256.
2. Solo el alumno dueño de la matrícula puede aceptar y firmar; backend registra `contractSignedAt` y HMAC-SHA256 del hash con `KIRA_CERT_SECRET`.
3. El certificado reutiliza el endpoint existente y exige `enrollment.status=completed`.
4. Factura determinista por `enrollmentId_periodLabel`; numeración global mediante transacción Firestore sobre contador.
5. Factura solo pasa a `paid` desde webhook de gateway validado. `invoice_payment_claims/{invoiceId}` evita liquidación doble.
6. `fulfillOrder` usa una transacción Firestore para leer orden, evento del proveedor, pago, factura/claim y entidades de acceso antes de escribir; la orden, transacción, evento, factura, matrícula, entitlement, auditoría y outbox se confirman atómicamente.
7. `paymentEvents/{provider_eventId}` deduplica el evento y `transactions/{provider_paymentId}` deduplica el pago aunque el proveedor entregue IDs de evento diferentes. Una orden pagada con otro paymentId se escala como posible doble cobro.
8. Dunning crea recordatorio pendiente, notificación y outbox; proveedor de entrega debe procesar esos eventos.
9. Jobs de cron protegidos por secreto server-only; Cloud Scheduler se configura fuera del repositorio.

## Consecuencias
- Firestore es la única fuente de verdad; no hay SQL ni entidades duplicadas.
- Precio de cuota requiere configuración mensual o cantidad de cuotas; nunca se presume que el precio total del curso sea mensual.
- Refunds, tax invoices, payouts y entrega externa de dunning siguen fuera de alcance de esta fase.
- Reconciliación compara facturas pagadas con transacciones persistidas; debe ejecutarse en sandbox y producción después de configurar Scheduler.
- La atomicidad Firestore evita estados parciales internos; no sustituye pruebas E2E reales de Stripe/Mercado Pago ni resuelve contracargos.
