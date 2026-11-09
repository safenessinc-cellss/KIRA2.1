# BLOCKER — Release Admin Expanded v1

Fecha: 2026-11-09
Rama: `release/admin-expanded-v1`

## Bloqueadores de release (no de pérdida irreversible)

1. **Vercel deployment API quota:** Vercel rechazó la creación de Preview con HTTP 402 `api-deployments-free-per-day` y `retryAfter=86400` (límite diario superado). No fue posible crear ni verificar Preview ni desplegar producción. No se cambió el plan ni la configuración de facturación.
2. **Build / lint / tests sin resultado:** el repositorio se modificó mediante GitHub API, sin checkout ejecutable en esta sesión. Se añadió un workflow de GitHub Actions para `npm ci`, `npm run lint`, `npm run build` y pruebas de reglas en Emulator, pero no se dispone de un resultado de ejecución confirmado.
3. **Rate limiting distribuido:** los límites de refund/payout implementados usan memoria de instancia. En Vercel serverless no garantizan un límite global entre instancias. Antes de producción deben migrarse a un contador atómico persistente (Firestore transaction/Redis).
4. **Reprocesamiento de webhooks:** el endpoint de reproceso registra una solicitud, pero no vuelve a ejecutar la validación/finalización del proveedor. No debe presentarse como reproceso completo hasta implementar una cola durable/handler idempotente.
5. **Notificaciones por email:** los flujos generan notificaciones in-app; no se identificó ni conectó un proveedor de email transaccional para aprobar/rechazar coaches, aprobar/revocar certificados o reembolsos.
6. **Signed URLs de documentos:** la cola de coaches aún no emite URLs firmadas de corta duración para documentos acreditativos.
7. **Cobertura del logger:** login/logout, creación de journal (solo metadata), review, enrollment, payment y certificate tienen eventos conectados. Deben conectarse también lesson_completed, journal_deleted, message_sent, calm_activated y report_filed en sus puntos de dominio reales.
8. **Paginación / escala:** listados administrativos consultan colecciones con un límite de lectura por página de Firestore REST y todavía no exponen cursor de paginación completo en todas las tablas. Validar con volúmenes reales.
9. **Migración:** `scripts/migrate-certificate-admin-status.mjs` se entrega en dry-run por defecto; no se ejecutó ni se aplicó sobre datos de producción.
10. **Reglas e índices:** los archivos están versionados en la rama, pero no se desplegaron a Firebase. Se requieren pruebas del Emulator antes de publicar.

## Seguridad y datos

- No se ejecutaron reembolsos, cambios de membresía ni migraciones en datos de producción.
- No se modificaron claves ni variables de Vercel.
- No se cambió `main` ni se promovió ningún deployment.
- No se borraron documentos ni se hizo una migración destructiva.

## Acción necesaria para cerrar

Esperar a que Vercel libere el límite diario o habilitar una vía autorizada de deployment; ejecutar el workflow y resolver los fallos; completar los puntos 3–10; desplegar reglas/índices en Firebase; ejecutar Preview smoke tests por rol; luego PR, merge, tag y smoke test de producción.
