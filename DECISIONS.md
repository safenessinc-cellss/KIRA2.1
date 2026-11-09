# DECISIONS — KIRA 2.1 Admin Expanded

Fecha: 2026-11-09
Rama: `release/admin-expanded-v1`

1. Mantener React 19, Vite, TypeScript, Tailwind v4, Firebase, Express/Vercel, Stripe y Mercado Pago.
2. Preservar AdminMonitor y los componentes existentes. Las nuevas páginas se mantienen en archivos dedicados.
3. Todas las rutas `/api/admin/*` pasan por verificación de Firebase ID token y rol Firestore admin.
4. Analytics no lee journals; se apoya en agregados server-side.
5. activity_logs es append-only. Metadata sin contenido de journals ni cuerpos de mensajes.
6. No reutilizar silenciosamente auditLogs/logs como sustituto de activity_logs.
7. La excepción de moderación solo aplica a mensajes vinculados a un reporte con status pending.
8. coach_applications es expediente; users/{uid} sigue siendo fuente de rol.
9. Aprobación coach asigna rol coach, perfil público y trial de 30 días.
10. Mantener certificados heredados y su firma HMAC.
11. Los estados de revisión nuevos se guardan en adminStatus para no alterar payloads firmados legacy. status=issued se mantiene para compatibilidad.
12. La firma HMAC excluye únicamente metadata nueva de revisión (adminStatus, requiresManualApproval, reviewedBy, reviewedAt, revokeReason).
13. El backfill idempotente añade adminStatus=active y requiresManualApproval=false; dry-run es el modo predeterminado.
14. La validación pública sigue comprobando certificatePublic y la firma HMAC.
15. Mantener orders, transactions, paymentEvents y los webhooks actuales.
16. Refund distingue Stripe y Mercado Pago; usa el payment reference original y la moneda original.
17. Los totales se agrupan por moneda; nunca sumar monedas diferentes.
18. Refund actualiza el ledger y revoca enrollment/certificados relacionados cuando hay courseId.
19. Payouts manuales v2.1; Stripe Connect queda fuera de alcance.
20. Los límites de refund/payout aún son memoria por instancia; no bastan para garantía distribuida en Vercel.
21. Reprocess de webhook queda como solicitud registrada hasta incorporar cola durable y reejecución real.
22. Notificaciones in-app están implementadas donde procede; email transaccional requiere proveedor conectado.
23. Signed URLs para documentos de coach siguen pendientes.
24. No ejecutar migraciones, reembolsos ni cambios de roles sobre datos reales durante pruebas.
25. No promover a producción sin CI verde, reglas desplegadas, Preview validado y smoke tests por rol.


26. Diagnóstico PR #25 (2026-11-09): GitHub Compare reporta `main...release/admin-expanded-v1` como `ahead`, 71 commits ahead y 0 behind; `merge_base_commit` coincide con `main`. Esto no muestra divergencia de historia ni evidencia de conflictos de contenido en el compare. El campo `mergeable=false` del PR no basta para concluir que existan conflictos; se debe volver a consultar después de que GitHub recalcule el estado y revisar checks requeridos. No se ejecutó `git fetch/merge` porque esta sesión no dispone de checkout local.
27. Se eligió CI alternativo (Opción A): workflow `.github/workflows/ci.yml` añadido para typecheck/lint, build, Firestore Emulator y escaneos de secretos/env. No se modificó branch protection; no se dispone de evidencia de permisos ni de CI verde.
28. `TEST_REPORT.md` distingue los escenarios ejecutados de los no ejecutados. No se marcan como verdes las pruebas de integración que aún no existen o no se ejecutaron.
