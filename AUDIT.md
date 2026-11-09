# AUDIT — Admin Ampliado KIRA 2.1

Fecha: 2026-11-09
Repositorio: `safenessinc-cellss/KIRA2.1`
Base: `main` @ `08da3f67e003e87c26e80c17dab7479f39a14dce`
Implementación: `release/admin-expanded-v1`

## Estado por módulo

| Módulo | Estado | Resultado |
|---|---|---|
| Analytics | ⚠️ | El cliente dejó de leer journals; endpoint server-side devuelve agregados y metadata de actividad. Falta CI y validación real. |
| Branding | ⚠️ | Se conectó el componente WebsiteConfigView existente; no se reescribió. |
| Insights IA | ⚠️ | Se hizo accesible desde el menú reutilizando la vista ejecutiva; la tarjeta IA sigue siendo contenido estático. |
| Moderación | ⚠️ | Cola metadata-only para reports y urgent escalations; la excepción de mensajes requiere report pending. Falta validar flujo real. |
| User Activity Center | ⚠️ | Rutas, API, feed metadata-only, resumen, transacciones, certificados, sesiones, ban/unban, coach assignment, puntos, reset membership y CSV. Faltan paginación completa y algunos eventos. |
| Coach Approvals | ⚠️ | Colección, cola, approve/reject/request-info, rol coach, perfil público, trial 30d y notificaciones in-app. Faltan email y signed URLs. |
| Certificate Approvals | ⚠️ | Revisión retrocompatible, aprobación/revocación, emisión manual y validación pública conservada. Backfill dry-run creado, no ejecutado. Faltan email y preview PDF embebido. |
| Payment Console | ⚠️ | Stripe status/test, transacciones, refunds, payouts manuales, webhooks y totales por moneda. Reprocess no ejecuta la repetición real; rate limit no distribuido. |

## Seguridad y privacidad

- [x] Capa común `/api/admin/*` verifica Firebase ID token y `users/{uid}.role === admin`.
- [x] No hay lecturas directas de `journals` en `src/pages/Admin.tsx`.
- [x] Analytics obtiene agregados server-side; no retorna documentos journal.
- [x] Logs de actividad no incluyen texto de journal ni cuerpos de mensajes.
- [x] Reglas activity_logs: lectura admin, creación autenticada con metadata permitida, update/delete denegados.
- [x] Reglas para coach_applications, refunds, payouts, webhook_events y transactions_processed.
- [x] Admin no tiene lectura global de mensajes; excepción requiere report vinculado con status pending.
- [x] Estado Stripe no expone secretos.
- [x] Refund distingue Stripe/Mercado Pago y conserva la moneda original.
- [ ] Rate limits distribuidos y atómicos.
- [ ] Reprocess durable de webhook.
- [ ] Signed URLs de documentos de coaches.
- [ ] Email transaccional.
- [ ] Paginación/filtros completos en datasets grandes.

## Verificación y despliegue

- [x] Rama release creada desde main.
- [x] Workflow CI agregado para lint, build y Firestore Emulator.
- [ ] Resultado del workflow no disponible/verificado.
- [ ] npm run lint / npm run build no ejecutados en entorno local.
- [ ] Reglas e índices no desplegados a Firebase.
- [ ] Preview no creado: Vercel devolvió HTTP 402 api-deployments-free-per-day, retryAfter 86400.
- [ ] Smoke tests por rol no ejecutados.
- [ ] PR a main no abierto porque Preview no superó pruebas.
- [ ] Producción no desplegada.
- [ ] Tag v2.1.0-admin-expanded no creado.

## Conclusión

La rama contiene una implementación parcial sustancial, pero no debe promocionarse a producción hasta cerrar los blockers de BLOCKER.md, obtener CI verde, validar reglas/índices y ejecutar los smoke tests de Preview.
