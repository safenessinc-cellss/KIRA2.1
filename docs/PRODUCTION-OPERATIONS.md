# KIRA 2.1 — configuración de producción y controles operativos

## Estado de esta integración

La rama de trabajo incorpora:
- Checkout con precios consultados por el servidor desde Firestore.
- Creación de órdenes pendientes antes de redirigir al proveedor.
- Webhooks firmados de Stripe y Mercado Pago.
- Reconciliación de importe, moneda, proveedor, usuario y orden antes de conceder accesos.
- Matrículas de cursos y membresías generadas únicamente por el backend después del pago aprobado.
- Libro de transacciones, eventos idempotentes, auditoría y notificaciones.
- Emisión de certificados desde el backend, firma HMAC-SHA256, número de registro y validación pública.
- Roles empresariales y aislamiento por companyId; el portal HR consume roster de la empresa y agregados, no diarios privados.

**No se deben habilitar pagos en producción hasta configurar todos los secretos y probar webhooks en modo de prueba.** La aplicación no puede cobrar ni emitir credenciales firmadas si faltan las claves; debe fallar de forma cerrada.

## Secretos obligatorios en Vercel

Configurar en el proyecto Vercel kira2-1-g0 (Production y Preview cuando corresponda):

| Variable | Uso |
|---|---|
| FIREBASE_SERVICE_ACCOUNT_JSON | JSON completo de una cuenta de servicio del proyecto kira2-a6a20; solo backend |
| FIREBASE_PROJECT_ID | kira2-a6a20 |
| STRIPE_SECRET_KEY | Clave secreta Stripe del entorno correspondiente |
| STRIPE_WEBHOOK_SECRET | Secreto whsec_ del endpoint Stripe |
| MERCADOPAGO_ACCESS_TOKEN | Access token privado de Mercado Pago |
| MERCADOPAGO_WEBHOOK_SECRET | Clave secreta de firma de webhooks de Mercado Pago |
| KIRA_CERTIFICATE_SIGNING_SECRET | Secreto aleatorio de al menos 32 caracteres |
| KIRA_APP_URL | https://kira.coach |

No usar prefijo VITE_ en claves privadas. No guardar JSON de servicio, tokens ni secretos en GitHub, en el frontend o en archivos públicos.

Crear el secreto de firma de certificados en un entorno seguro, por ejemplo:
openssl rand -hex 32

La cuenta de servicio necesita permisos de lectura y escritura de Firestore en el proyecto KIRA. Verificar que su project_id sea exactamente kira2-a6a20.

## Configuración de webhooks

### Stripe
- URL: https://kira.coach/api/webhooks/stripe
- Eventos mínimos: checkout.session.completed y checkout.session.async_payment_succeeded
- Copiar el signing secret whsec_ a STRIPE_WEBHOOK_SECRET.
- Probar pagos aprobados, cancelados, fallidos y reintentos del webhook en modo de prueba antes de activar Live.

### Mercado Pago
- URL: https://kira.coach/api/webhooks/mercadopago
- Suscribir notificaciones de pagos.
- Copiar el secreto de firma del panel de desarrolladores a MERCADOPAGO_WEBHOOK_SECRET.
- Verificar aprobación, rechazo, pendiente, reembolso y reintento en credenciales de prueba.

Los parámetros de retorno del navegador nunca confirman un pago. Solo una consulta autenticada al proveedor, junto con su webhook firmado, actualiza el libro y los permisos.

## Catálogo y matrículas

Los productos vendibles deben existir en una de estas colecciones de Firestore:
- courses
- books
- products
- membershipPlans
- marketplace

Cada producto debe tener title (o name), price numérico mayor que cero, currency ISO (por ejemplo brl o usd) y estado publicable (status: published, o no estar en borrador/archivado). El servidor ignora el precio y el usuario enviados por el navegador.

Para un curso, el tipo se deriva de la colección courses; la matrícula se crea después del pago confirmado. Para un plan, usar type: membership o la colección membershipPlans.

## Certificados

- Configurar KIRA_CERTIFICATE_SIGNING_SECRET.
- Cada curso debe tener hours (o durationHours) positivo, un coachId válido y alumnos con matrícula completada.
- En cursos de pago, la matrícula debe incluir paymentStatus: paid, generado por el webhook.
- El administrador aprueba la solicitud; el endpoint verifica matrícula, curso, coach, alumno y pago antes de emitir.
- Validación pública: /validar-certificado/:code; la página consulta el endpoint del backend que recalcula la firma HMAC contra el registro privado.

La firma HMAC acredita integridad y origen dentro de KIRA; no equivale por sí sola a una firma digital cualificada ni a una certificación ICP-Brasil.

## Empresas y privacidad

Cada usuario de empresa debe tener companyId asignado por administración y un rol hr_admin o company_admin. Los miembros se registran en companies/{companyId}/members/{uid}. Los datos agregados de bienestar se publican en companies/{companyId}/wellbeingAggregates/{periodId} mediante un proceso de backend autorizado.

No escribir diarios, conversaciones, respuestas psicométricas individuales ni datos clínicos en el roster de empresa. El portal HR no debe consultar la colección global users para construir una lista de empleados.

## Despliegue y validación

1. Ejecutar CI y corregir todos los errores TypeScript/build.
2. Probar reglas Firestore con Firebase Emulator antes de desplegarlas.
3. Configurar secretos en Preview y validar pagos sandbox.
4. Verificar que los webhooks creen una sola transacción y una sola matrícula ante eventos duplicados.
5. Probar certificado inválido, alterado, revocado/no existente y vigente.
6. Verificar roles de alumno, coach, admin, HR y company admin con cuentas separadas.
7. Confirmar vistas móviles y escritorio.
8. Solo entonces fusionar y promover el deployment revisado a Production.

No desplegar reglas nuevas ni promover producción mientras el control de calidad o los tests de seguridad estén pendientes.
