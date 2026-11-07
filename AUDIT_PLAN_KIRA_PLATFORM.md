# KIRA Coach — Auditoría integral y plan de arquitectura

**Rama:** `audit/kira-coach-platform-review`  
**Referencia de producción:** `main` (no modificar durante esta auditoría)  
**Responsable de producto/plataforma:** KIRA Coach  
**Desarrollo:** SAFENESS.INC

## Visión de producto
KIRA Coach será una plataforma de coaching y formación con IA, marketplace de cursos/libros/mentorías, perfiles públicos de coaches, comunidad, pagos centralizados a KIRA, liquidación de comisiones, gestión financiera/operativa y certificados verificables.

## Principios
- UX consistente, responsive, inspirada en iOS/macOS contemporáneo: superficies claras, jerarquía tipográfica, motion discreto, accesibilidad y navegación predecible.
- Backend como fuente de verdad: cliente nunca decide roles, comisiones, pagos, certificaciones ni privilegios.
- Zero Trust: autorización por UID/claims y reglas explícitas por entidad; denegar por defecto.
- Integridad financiera: eventos idempotentes, ledger inmutable, webhooks verificados y conciliación.
- Certificados verificables: ID único, QR/URL pública de verificación, logo KIRA, watermark y datos del coach/curso/alumno.
- No borrar módulos funcionales sin evidencia; migraciones pequeñas y reversibles.

## Hallazgos preliminares (lectura estática del repositorio)
1. `.env` aparece como archivo versionado en el repositorio público. Tratar cualquier secreto que contenga como potencialmente expuesto; no imprimirlo. Retirar el archivo del historial/árbol público y rotar inmediatamente las credenciales.
2. El alta permite solicitar rol coach desde el cliente; la creación de perfil puede registrar role=coach. Debe tratarse únicamente como solicitud y la aprobación/rol efectivo debe ser autoridad backend, nunca un valor controlado por el usuario.
3. El hook de autenticación del frontend fuerza role=admin para el correo de propietario en cliente y luego intenta actualizar Firestore. El privilegio absoluto debe ser una política de servidor/Firestore segura y no depender de código frontend.
4. La regla de lectura de `users` permite a cualquier usuario autenticado leer todos los perfiles. Revisar minimización de PII y separar perfil público de datos privados.
5. En reglas de Firestore se ven operaciones de creación/actualización de enrollments y datos de progreso con posibilidad de intervención de cliente. Revisar ownership, límites de coach y writes de backend.
6. La documentación de arquitectura describe comisiones y balances con valores derivados de ventas. Estos cálculos no pueden confiar en campos enviados por cliente; requieren webhook validado y ledger transaccional.
7. `server.ts` contiene endpoint de configuración Gemini que reporta configured=true de forma fija; revisar exactitud de estado y no exponer secretos ni habilitar mocks como si fueran IA real.

## Fases de auditoría
1. Seguridad: Auth, RBAC, Firestore/Storage rules, secretos, API/server, logs, rate limits, privacidad.
2. UX/UI: landing, responsive, navegación, tokens de color/tipografía, estados vacíos/errores/carga, accesibilidad.
3. Dominio funcional: coach profile, cursos, libros, links sociales, comunidad, alumno, CRM de coaching, IA.
4. Marketplace/finanzas: checkout, pagos, fees, ledger, reembolsos, impuestos, payout y conciliación.
5. Certificados: plantillas, watermark, seriales, validación pública, revocación y auditoría.
6. Administración: superadmin propietario, aprobación de coaches, configuración global, permisos, reporting, costos.
7. Integración y pruebas: rutas, reglas, build/lint, pruebas unitarias/integración/e2e, deploy preview y smoke tests.

## Arquitectura objetivo
- Firebase Auth para identidad; Custom Claims + documento de usuario controlado por backend para autorización.
- Firebase/Firestore con reglas de acceso mínimo y Cloud Functions/servidor para mutaciones privilegiadas.
- Stripe Connect (o arquitectura equivalente validada) para pagos y payouts; la plataforma cobra, retiene fee y liquida al coach según términos/región. No almacenar PAN/CVV.
- Modelo de datos sugerido: users, coachProfiles, courses, books, products, enrollments, orders, paymentEvents, ledgerEntries, coachBalances (derivado), payouts, certificates, certificateRevocations, auditLogs, platformCosts, settings.
- Comisiones configurables versionadas por transacción; registrar gross, platform fee, processor fee, taxes/refunds y net coach amount.
- IA: servicio server-side con autorización, cuotas, consentimientos y controles de privacidad; mostrar cuándo es respuesta IA y evitar claims clínicos.

## Criterios de aceptación
- Ningún usuario puede elevar su rol/approval/fee/payout/certificate status por manipulación del cliente.
- Todos los endpoints y reglas validan permisos y ownership.
- Build + lint + pruebas pasan; rutas críticas tienen pruebas.
- No publicar cambios de producción sin preview, smoke tests y aprobación final.
- No declarar validación o despliegue si no se ejecutaron realmente.
