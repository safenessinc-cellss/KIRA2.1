# ADR-0002: configuración de pagos administrada desde servidor

- Estado: Aceptado en rama de auditoría; requiere validación de despliegue.
- Fecha: 2026-11-08.
- Contexto: Stripe y Mercado Pago ya tienen checkout y webhooks entrantes en Express, pero la configuración se encontraba principalmente en variables de entorno.
- Decisión: ofrecer configuración desde el panel de superadministrador y persistir settings, pasarelas, planes, cupones y auditoría en Firestore. Las claves privadas se cifran AES-256-GCM y se devuelven al navegador solo como indicadores enmascarados.
- Secretos: KIRA_CONFIG_ENCRYPTION_KEY se mantiene en variables de servidor; no se persiste en Firestore ni se envía a la UI. Se conservan las variables legacy como fallback para transición.
- Autorización: el backend exige email de superadmin verificado y perfil Firebase con role=admin. Las reglas cliente niegan acceso a las colecciones sensibles.
- Consecuencias: cambios de credenciales no requieren redeploy una vez configurada la clave de cifrado; el proveedor puede necesitar validar la clave al realizar el primer pago/webhook.
- Limitaciones conocidas: reembolsos, facturas fiscales, dunning, payouts, renovación de suscripciones, webhook saliente y worker durable no quedan completos con este ADR.
- Riesgos: rotación de clave de cifrado requiere migración/cifrado de secretos; no rotar KIRA_CONFIG_ENCRYPTION_KEY sin procedimiento de re-encriptación.
