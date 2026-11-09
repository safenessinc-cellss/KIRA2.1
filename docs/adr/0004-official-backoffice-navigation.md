# ADR-0004: árbol oficial del backoffice y vertical CRM inicial

- Estado: Aceptado para la rama de auditoría; rollout a producción no autorizado.
- Fecha: 2026-11-08.

## Contexto

El cliente define un árbol de navegación único para Dashboard, CRM, Cursos, Alumnos, Finanzas y Configuración. KIRA utiliza React/Vite + Express + Firebase Authentication + Firestore. La navegación legacy mezclaba módulos y permisos por pestañas.

## Decisión

1. La sidebar del administrador replica el árbol oficial y cada elemento tiene clave de permiso.
2. Los nodos sin backend funcional se muestran bloqueados, no como pantallas simuladas.
3. Dashboard y CRM se implementan como un vertical server-side inicial.
4. Los datos CRM se almacenan en Firestore con PII cifrada en el backend; el navegador no lee colecciones CRM.
5. La conversión lead→enrollment se realiza con una transacción Firestore y crea auditoría + evento outbox en el mismo commit.
6. Dashboard consulta datos reales existentes, pero no se denomina vista materializada ni promete SLA hasta tener agregadores programados.
7. El RBAC legacy \`staffPermissions\` sirve como puente; la matriz versionada \`rolePermissions\` y MFA step-up siguen pendientes.
8. Firestore permanece como única fuente de verdad. No se crean migraciones PostgreSQL paralelas.

## Consecuencias

- Los nodos faltantes no pueden abrirse hasta disponer de API, persistencia, reglas, permisos y pruebas.
- Se añade la variable server-only \`KIRA_CRM_PII_ENCRYPTION_KEY\`.
- La deduplicación usa HMAC determinista; la rotación de clave exige reindexación coordinada.
- La entrega de eventos requiere un worker durable que todavía no está en este cambio.
- La aceptación final requiere pruebas de emulador, transacciones concurrentes y E2E de CRM.

## Alternativas descartadas

- Crear pantallas placeholder habilitadas sin backend.
- Conectar React directamente a colecciones CRM con PII.
- Ejecutar SQL en PostgreSQL sin migrar identidad y dominio desde Firebase.
- Tratar una especificación OpenAPI como prueba de que todos los endpoints están desplegados.
