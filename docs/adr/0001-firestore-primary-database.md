# ADR-0001: Firestore como persistencia primaria de KIRA

- Estado: Aceptado para esta implementación.
- Fecha: 2026-11-08.
- Contexto: El repositorio ejecuta React/Vite + Express y utiliza Firebase Authentication, Firestore REST y Firebase Storage. No hay una base PostgreSQL configurada en esta arquitectura.
- Decisión: Mantener Firestore como fuente de verdad. Los modelos SQL de referencia se traducen a colecciones/documentos con Firebase Auth UID como identidad. Los cambios sensibles se realizan mediante API Express con service account y reglas de cliente deny-by-default.
- Consecuencias: No ejecutar SQL ni crear migraciones PostgreSQL ficticias. Las escrituras críticas se auditan y se diseñan para idempotencia; para invariantes multi-documento complejas se debe usar transacción Firestore o un mecanismo idempotente equivalente.
- Seguridad: secretos de pasarela cifrados AES-256-GCM con clave externa al repositorio/Firestore. Las reglas impiden leer ciphertext desde el cliente.
- Alternativas descartadas: añadir PostgreSQL solo para satisfacer el ejemplo SQL, duplicando usuarios/cursos/matrículas y creando consistencia distribuida innecesaria.
- Pendientes: evaluar Firestore transactions para concurrencia de cupones y emisión, y Cloud KMS para rotación/gestión de claves.
