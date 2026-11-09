# BLOCKER — Release Admin Expanded v1

Fecha: 2026-11-09
Rama: `release/admin-expanded-v1`

## Bloqueadores de release

1. **Vercel deployment API quota:** Vercel rechazó la creación de Preview con HTTP 402 `api-deployments-free-per-day` y `retryAfter=86400` (límite diario superado). No fue posible crear ni verificar Preview ni desplegar producción. No se cambió el plan ni la facturación.
2. **Build / lint / tests sin resultado:** no hubo checkout ejecutable en esta sesión. Se añadió workflow GitHub Actions para npm ci, lint, build y pruebas Firestore Emulator, pero no se dispone de resultado confirmado.
3. **Rate limiting distribuido:** límites refund/payout usan memoria de instancia; en Vercel serverless no garantizan límite global. Migrar a contador atómico persistente antes de producción.
4. **Reprocesamiento de webhooks:** el endpoint registra una solicitud, pero no reejecuta la validación/finalización del proveedor. Requiere cola durable/handler idempotente.
5. **Email transaccional:** flujos generan notificaciones in-app; no se identificó proveedor conectado para emails de coach, certificados o refunds.
6. **Signed URLs:** cola de coaches aún no emite URLs firmadas de corta duración para documentos acreditativos.
7. **Cobertura logger:** login/logout, journal_created (metadata), review_created, course_enrolled, payment_succeeded y certificate_issued están conectados. Faltan lesson_completed, journal_deleted, message_sent, calm_activated y report_filed en sus puntos reales.
8. **Paginación/escala:** listados admin aún no exponen cursor completo en todas las tablas.
9. **Migración:** el script de certificados está en dry-run por defecto; no se ejecutó ni aplicó en producción.
10. **Reglas e índices:** versionados en rama, no desplegados a Firebase. Ejecutar pruebas Emulator y revisar consultas antes de publicar.

## Seguridad y datos

- No se ejecutaron reembolsos, cambios de membresía ni migraciones sobre datos de producción.
- No se modificaron claves ni variables Vercel.
- No se cambió main ni se promovió deployment.
- No se borraron documentos ni se ejecutó migración destructiva.

## Acción para cerrar
Esperar liberación de cuota Vercel; ejecutar workflow y corregir fallos; completar puntos 3–10; desplegar reglas/índices; smoke tests por rol en Preview; luego PR, merge, tag y smoke test de producción.
