# ADR-0007 — Webhooks firmados y matriz RBAC activa

- Estado: Implementación en rama de auditoría; requiere pruebas de integración y configuración de secretos.
- Fecha: 2026-11-08.

## Decisión
1. Los webhooks entrantes se autentican mediante HMAC-SHA256 sobre timestamp + bytes exactos del cuerpo; se rechazan timestamps con más de cinco minutos de desviación.
2. Cada evento válido utiliza una clave de deduplicación por proveedor e identificador de evento; el inbox es privado y no accesible desde Firebase Client SDK.
3. Los formularios públicos aplican honeypot, límite por IP, configuración activa por slug y verificación CAPTCHA server-side cuando está habilitada.
4. La matriz role_permissions/{role} es la fuente activa de permisos; la semilla se transforma a map<string,bool>. El acceso a cambios críticos exige superadministrador verificado y MFA reciente.
5. Durante la migración, los endpoints existentes pueden usar staffPermissions únicamente cuando aún no existe documento RBAC para el rol; después de ejecutar la semilla debe retirarse el fallback.

## Operación
- No guardar secretos en Firestore. Los secretos de proveedor se configuran server-only.
- Los registros de webhook inválidos se conservan para auditoría, sin procesarlos.
- La rotación de HMAC admite ventana temporal de claves anterior/nueva; nunca registrar secretos ni firmas completas.
