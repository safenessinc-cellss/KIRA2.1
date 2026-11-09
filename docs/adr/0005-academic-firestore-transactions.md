# ADR-0005 — Vertical académica en Firestore

- **Estado:** Aprobado para implementación en rama de auditoría
- **Fecha:** 2026-11-08

## Contexto
KIRA usa Firebase/Firestore como única fuente de verdad. El flujo académico debe coordinar grupos, sesiones, matrícula, asistencia, evaluaciones, finalización y emisión de certificados sin duplicar entidades ni usar bloqueos SQL.

## Decisión
1. Los grupos, sesiones, asistencias, evaluaciones y proyecciones se almacenan en Firestore.
2. La reserva de cupo usa transacción Firestore: leer grupo, alumno, curso y matrícula; verificar capacidad; incrementar contador y crear enrollment en el mismo commit.
3. La asistencia usa ID determinista `{sessionId}_{studentId}` y creación condicional para idempotencia.
4. Los cambios relevantes escriben audit log y evento outbox en el mismo commit cuando la operación es transaccional.
5. `student_performance` es una proyección derivada, nunca una fuente editable desde cliente; los eventos de asistencia/evaluación se consumen desde outbox con lease, reintentos y deduplicación.
6. Solo `enrollment.status=completed` permite emitir certificado; finalización requiere pago confirmado y umbrales académicos.
7. Las colecciones operativas nuevas se deniegan a clientes en Firestore Rules; el backend Express aplica autenticación y autorización.

8. Los locks `schedule_locks` reservan intervalos por coach/sala y día UTC dentro de una transacción; el uso de buckets UTC evita divergencias entre zonas horarias de grupos.

## Consecuencias y límites
- No se usa PostgreSQL, SQL, SELECT FOR UPDATE ni colección paralela para coaching.
- Firestore transactions serializan el contador de cupos; los conflictos se deben reintentar desde cliente con idempotency key en una mejora posterior.
- El control de solapamiento combina prevalidación de conflictos existentes con `schedule_locks` transaccionales por recurso y día UTC para cerrar la carrera entre creaciones concurrentes.
- La proyección se recalcula desde el consumidor outbox Express; el endpoint interno protegido debe programarse con Cloud Scheduler usando `KIRA_OUTBOX_CRON_SECRET` para recuperar eventos pendientes tras caídas.
- CI debe validar el flujo con emulator tests concurrentes antes de habilitar nodos UI.
