# PRIVACY — KIRA COACH

## Privacidad de journals y mensajes

- Los diarios personales almacenados en `journals` son privados para su propietario.
- Los administradores, coaches, HR y otros usuarios no tienen acceso de lectura al texto de journals.
- Analytics administrativo consume agregados numéricos generados en servidor; nunca descarga documentos de journals al navegador.
- Los registros de actividad guardan acciones, referencias y metadata técnica mínima. No deben almacenar texto de journals, cuerpos de mensajes, prompts, contraseñas, tokens ni secretos.
- Los mensajes privados solo son visibles para los participantes de la conversación.
- Excepción de moderación: un administrador puede inspeccionar el mensaje concreto vinculado a un reporte cuyo estado sea exactamente `pending`, cuando el mensaje referencia ese reporte. No concede acceso general a chats ni a otras conversaciones.

## Datos de actividad y auditoría

- `activity_logs` es append-only: clientes autenticados pueden crear eventos permitidos; solo admins pueden leerlos; no se permite actualizar ni borrar.
- Las acciones administrativas se escriben desde el servidor con actor, IP, agente de usuario, acción, entidad y metadata filtrada.
- No incluir contenido privado dentro de `metadata`.

## Pagos y credenciales

- Los registros financieros se escriben únicamente desde backend confiable / Admin SDK.
- El estado de conexión Stripe no expone claves ni valores de configuración.
- Los certificados públicos exponen solo datos de verificación y estado, nunca notas administrativas privadas.

## Solicitudes de coaches

- Cada solicitante puede leer su propia solicitud.
- Solo administradores pueden leer todas las solicitudes y revisar el estado.
- Los documentos acreditativos deben servirse mediante URLs firmadas con expiración y control de acceso.
