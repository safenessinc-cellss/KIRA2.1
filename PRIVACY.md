# Privacidad y aislamiento B2B — KIRA

## Garantías de diseño
- HR B2B recibe únicamente indicadores agregados por organización, nunca el contenido de journals, transcripciones, mensajes, notas privadas ni evaluaciones individuales.
- Los diarios personales permanecen accesibles únicamente al propietario. Los roles admin, coach, hr_admin y company_admin no reciben acceso general a su contenido.
- El portal HR no debe listar nombres, correos, identificadores, departamentos individuales ni estados individuales a partir de documentos de miembros. La pantalla consume agregados aprobados por backend/reglas.
- Los agregados deben suprimir grupos pequeños; no publicar celdas con menos de cinco personas ni combinaciones que permitan reidentificación.
- Los datos de bienestar se presentan como indicadores organizacionales descriptivos, no como diagnóstico médico.
- La IA recibe únicamente el contenido mínimo necesario para la función solicitada y no debe registrar prompts sensibles en logs.
- Los tokens, claves API y credenciales de proveedores son exclusivamente server-side.

## Reglas y controles
- Firestore rules deben denegar HR acceso a `journals`, `journal_entries`, `sessions` privadas y subcolecciones privadas.
- `wellbeingAggregates` solo lectura de usuarios autorizados de la organización; escritura exclusiva backend confiable.
- No aceptar `companyId`/ `orgId` arbitrario del cliente como autorización. Derivar tenant desde el perfil autenticado y verificarlo en servidor/reglas.
- Pruebas negativas obligatorias: HR no puede leer journal ajeno, sesión privada, mensajes ni documentos de otra organización.
- Acceso de soporte/admin a datos personales no se habilita por el mero rol; requiere una capacidad explícita, auditada y de mínimo privilegio.

## Incidente / solicitudes
Las solicitudes de acceso, corrección o eliminación deben resolverse mediante procedimientos autenticados y auditables, preservando obligaciones legales y registros de pago.
