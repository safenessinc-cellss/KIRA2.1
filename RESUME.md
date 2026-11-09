# RESUME — Admin Expanded v1

1. Rama `release/admin-expanded-v1` creada desde `main`.
2. No se modificó `main`.
3. Se preservó la estructura principal React 19 + Vite + TypeScript.
4. Se añadieron rutas admin para Usuarios y detalle.
5. Se añadió ruta Coach Approvals.
6. Se añadió ruta Certificate Approvals.
7. Se añadió ruta Pagos y Pasarela.
8. Se añadió menú de módulos admin y drawer móvil “Más”.
9. Se conectaron Branding, Analytics, Insights IA y Moderación al menú actual.
10. Analytics dejó de leer journals desde el navegador.
11. Analytics consume agregados numéricos server-side.
12. Los detalles de usuario muestran metadata, transacciones, certificados y sesiones.
13. Se añadieron acciones ban/unban, reasignar coach, puntos y reset de membresía.
14. Se añadieron acciones de aprobación/rechazo/solicitud de información de coach.
15. La aprobación asigna rol coach, perfil público y trial de 30 días.
16. Se extendió el ciclo de certificados manteniendo la firma heredada.
17. Se añadieron reembolsos por Stripe y Mercado Pago respetando proveedor/moneda.
18. Se añadieron registros de payout manual, eventos de webhook e idempotencia.
19. Se añadieron reglas, índices, logger, migración dry-run y documentación.
20. Monitorear CI, rate limits, reprocess de webhooks, email y signed URLs antes de producción.
