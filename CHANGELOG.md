# CHANGELOG — Admin Expanded v1

## Implementación en release/admin-expanded-v1
- Se añadieron rutas /admin/users, /admin/users/:uid, /admin/coach-approvals, /admin/certificate-approvals y /admin/payments.
- Se conectaron Analytics, Branding, Insights IA y Moderación al menú actual sin borrar sus componentes.
- Se añadió drawer móvil “Más” exclusivo para admin.
- Se añadió middleware común de autenticación/rol para /api/admin/*.
- Se añadieron endpoints de usuarios, actividad, coaches, certificados, pagos, refunds, payouts, Stripe y webhooks.
- Analytics dejó de leer journals desde el navegador y usa agregados server-side.
- Se añadió useActivityLogger y se conectó a login/logout, journals (metadata only), reviews y enrollments.
- Se añadieron eventos server-side para pagos, enrollments, coach approvals y certificados.
- Se añadieron reglas Firestore para logs inmutables, coach applications, refunds, payouts, webhooks, reports, chats y subcolecciones de usuario.
- Se restringió la lectura administrativa general de mensajes.
- Se añadieron índices compuestos y migración idempotente de metadata de certificados en modo dry-run.
- Se añadió refund Stripe/Mercado Pago con moneda original y cascada de revocación de enrollment/certificado.
- Se añadieron payouts manuales y resúmenes agrupados por moneda.
- Se amplió la suite de reglas y se añadió workflow GitHub Actions.

## Pendiente
- Ejecutar y verificar CI, lint, build y tests.
- Persistir rate limiting distribuido.
- Implementar reprocess durable real, email transaccional y signed URLs.
- Completar todos los eventos de actividad, paginación y filtros.
- Desplegar reglas/índices y probar Preview antes de producción.

- Se documentó el bloqueo real de deployment: Vercel API quota `api-deployments-free-per-day` (HTTP 402, retryAfter 86400); el intento anterior de commit documental quedó cancelado por Ignored Build Step.
