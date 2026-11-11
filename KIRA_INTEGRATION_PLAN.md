# KIRA 2.1 — Plan de integración del prototipo AI Studio

## Regla principal
La integración es aditiva: NO eliminar módulos, páginas, datos, permisos, rutas ni capacidades existentes. Unificar las dos implementaciones conservando la funcionalidad válida de ambas y resolviendo duplicidades mediante componentes compartidos, navegación coherente y contratos de datos compatibles.

## Fuentes
- Rama de trabajo: `integration/kira-port-v1` (parte de `main`).
- Prototipo recibido: `remix_-kira2.1.zip` (AI Studio; extraído y revisado localmente).
- El ZIP contiene portales separados para alumno, coach y administración, además de páginas `AdminModeration`, `AdminUsers`, `AdminCoachApprovals`, `AdminPayments`, `AdminInsights` y chat para alumno/coach.
- La administración del repositorio ya tiene vistas internas de gestión de coaches y alumnos, y rutas de moderación. No deben sustituirse ni perder sus capacidades.

## Experiencia requerida del Dashboard Admin
Mantener un centro de administración único con accesos visibles y coherentes:
1. **Coaches**: listado, perfil, estado, aprobación, actividad, asignaciones, cursos/sesiones y métricas.
2. **Alumnos**: listado, perfil, estado, progreso, cursos, coach asignado, incidencias y actividad.
3. **Chat y moderación**: bandeja de conversaciones alumno↔coach, filtros por usuario/coach/estado/fecha, alertas y reportes, contexto de conversación, historial de moderación y acciones autorizadas (marcar/revisar/escalar/cerrar). La vista debe permitir supervisar qué ocurre sin exponer innecesariamente datos privados.
4. **Resumen de actividad**: eventos recientes y señales operativas que enlacen a la ficha del alumno, coach o conversación correspondiente.

## Reglas funcionales y de seguridad
- Reutilizar rutas, componentes, colecciones y APIs existentes cuando sean válidos; evitar crear sistemas paralelos.
- No inventar conversaciones ni datos: mostrar estados vacíos cuando no existan registros.
- Los datos del chat se consultan desde el servidor/Firestore con paginación y límites; no descargar conversaciones completas de forma indiscriminada.
- Registrar cada acción de moderación en auditoría con actor, fecha, motivo, objeto y resultado.
- Permisos mínimos: moderador puede revisar y escalar; solo roles autorizados pueden suspender, borrar o modificar cuentas. El propietario `safeness.c.a@gmail.com` conserva privilegios exclusivos de propietario y ningún administrador delegado puede elevarlos.
- Las reglas de Firestore y endpoints del servidor deben aplicar autorización; ocultar botones en UI no es control de seguridad.
- Respetar privacidad: acceso al contenido de mensajes solo para casos y roles justificados, con trazabilidad y minimización de datos.
- Conservar los portales actuales de alumno y coach y asegurar que sus enlaces al chat correspondan a la misma conversación y participantes.

## Criterios de aceptación de integración
- No se elimina ningún módulo existente del repositorio ni del prototipo sin una justificación técnica documentada y aprobación explícita.
- El Admin puede abrir Coach, Alumno y Chat/Moderación desde el mismo dashboard.
- Las fichas enlazan a sus cursos, progreso, asignaciones y conversaciones existentes.
- Un alumno y su coach ven la misma conversación autorizada; el moderador la puede revisar bajo permisos y auditoría.
- Búsqueda, filtros, estados vacíos, errores, carga, paginación y actualización en tiempo real están cubiertos.
- Las reglas Firestore y las APIs rechazan accesos no autorizados.
- Lint, build, pruebas de reglas y pruebas funcionales pasan antes de solicitar revisión.
- No se fusiona a `main`, no se publica a producción y no se ejecuta `vercel --prod` durante esta misión.

## Estado
Este documento fija el criterio funcional de la integración; no afirma que los módulos estén ya implementados o probados. La integración de código requiere aplicar los cambios sobre un checkout completo del repositorio y ejecutar las validaciones.