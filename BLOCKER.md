# BLOCKER — Release Admin Expanded v1

Fecha: 2026-11-09
Rama: `release/admin-expanded-v1`

## Bloqueadores de release

1. **Vercel deployment API quota:** Vercel confirmó HTTP 402 `payment_required`, recurso `api-deployments-free-per-day`, límite superado en más de 100 deployments y `retryAfter=86400`. Un intento anterior creó un deployment desde un commit documental que quedó `CANCELED` por el Ignored Build Step. El intento forzado con la rama actual fue rechazado por cuota; no hay Preview listo ni producción desplegada. El CLI no está instalado y no hay checkout local para usar el fallback. No se cambió el plan ni la facturación.
2. **Build / lint / tests sin resultado confirmado:** no se pudo ejecutar un checkout local en este entorno. Se añadieron `.github/workflows/ci.yml` y `admin-expanded-quality.yml` para npm ci, typecheck/lint, build, pruebas Firestore Emulator y escaneos básicos de secretos. El workflow nuevo debe completar en GitHub; su mera creación no equivale a validación.
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

## Bloqueos externos

- **Vercel deployment quota (externo):** el proveedor rechazó deployments con HTTP 402 `api-deployments-free-per-day`. Opciones: esperar reset de cuota, cambiar de plan mediante decisión del propietario, o mantener CI independiente en GitHub Actions y posponer Preview/producción hasta recuperar cuota. No se cambió facturación ni se intentó un deploy alternativo.
- **Ejecución local (limitación del entorno):** no hay checkout local disponible ni conectividad para clonar el repositorio en esta sesión. Por tanto, `npm ci`, `npm run lint`, `npm run build`, grep y emuladores no se han ejecutado localmente.

## Acción para cerrar

1. Confirmar que el workflow `CI` ejecuta y pasa en GitHub.
2. Resolver cualquier fallo de CI.
3. Resolver los bloqueos de código/seguridad de los puntos 3–10; no promover mientras rate limiting distribuido, reprocess real de webhooks, URLs firmadas y cobertura funcional sigan pendientes.
4. Ejecutar pruebas de aceptación con mocks/stubs y Emulator; completar smoke tests por rol en Preview cuando Vercel permita deployments.
5. Solo entonces preparar aprobación y merge del PR.
