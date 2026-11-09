# KIRA 2.1 — Especificación maestra de módulos y criterios de aceptación

**Estado:** especificación de implementación; no equivale a certificación funcional.  
**Rama base:** `audit/kira-real-modules-security-commerce`  
**Stack obligatorio:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Motion + Recharts; Node.js + Express (`server.ts`); Firebase Authentication, Firestore y Firebase Storage; Google Gen AI SDK; Stripe Checkout y modo simulador seguro. Firestore es la única fuente de verdad. No introducir PostgreSQL ni otra base primaria.

## 1. Roles y límites de acceso

- **Alumno/Cliente:** catálogo, matrículas, progreso, energía, journal privado, biblioteca élite y reseñas.
- **Coach/Mentor:** dashboard académico y financiero propio, cursos, alumnos asignados, sesiones y análisis de coaching.
- **HR Manager B2B:** únicamente métricas agregadas de su organización, licencias y utilización. No puede leer journals, transcripciones, notas ni sesiones individuales.
- **Super Admin:** configuración global, RBAC/MFA, facturación, auditoría, soporte, integraciones y marca blanca.

Toda autorización debe comprobarse en servidor y Firestore Rules; ocultar una opción en la interfaz no constituye control de acceso. Aplicar tenant scoping por organización y mínimo privilegio.

## 2. Portal del alumno — `/dashboard`

- Plan Maestro con cursos inscritos, progreso y catálogo.
- Energía: Bronce 0–500; Plata 501–1.500; Oro 1.501–5.000; Platino >5.000.
- Kira Predictive Insights y Nudges: sugerencias explicables basadas en actividad y progreso; no inventar eventos ni métricas.
- Journal en `/dashboard/journal`: entradas privadas en `journal_entries`, con acceso del propio alumno y servicios IA autorizados.
- Biblioteca Élite en `/dashboard/elite-library`: recursos públicos/premium; desbloqueo y puntos ejecutados en servidor mediante transacción atómica e idempotente. No descontar puntos desde el cliente.
- Reseñas de coaches: una valoración de 1–5, vinculada a interacción/matrícula válida y protegida contra duplicados/abuso.

## 3. Portal Coach — `/coach`

- Dashboard operativo: alumnos activos, cursos publicados e ingresos netos reconciliados con el ledger.
- Membresía de coach: Stripe Checkout, estado activado únicamente por webhook verificado.
- Nexus: alumnos asignados y trazabilidad de progreso, con alcance limitado al coach autorizado.
- Editor curricular `/coach/courses`: módulos/lecciones drag-and-drop accesibles con @dnd-kit, editor enriquecido y medios en Firebase Storage; guardar orden y metadatos en Firestore.
- Session Intelligence `/coach/session`: captura de audio solo con consentimiento explícito y controles visibles de grabación/parada; transcripción y análisis multimodal mediante backend. Registrar momentos Aha, compromisos, foco temporal y resumen longitudinal. Separar datos medidos de inferencias IA; no presentar estados emocionales ni burnout como diagnóstico clínico. Proteger transcripciones y limitar acceso a coach/participantes autorizados.

## 4. Super Admin — `/admin`

- Ventas brutas por ventanas 24h/7d/30d/90d; DAU/WAU, churn y métricas de retención calculadas desde eventos verificables.
- Split configurado por política: especificación solicitada 70% plataforma (Kira Net Revenue) / 30% coach payouts. Implementar como configuración versionada, no como porcentaje disperso hardcodeado. Conciliar órdenes, comisiones, refunds y liquidaciones antes de mostrar netos.
- Kira Business Insights: recomendaciones IA basadas en datos agregados y trazables; no fabricar predicciones.
- Riesgo de deserción/sobrecarga: indicadores orientativos, no diagnósticos ni decisiones automatizadas adversas.
- White-label: `settings/website`, colores globales CSS, validación de valores, auditoría de cambios y rollback.
- Permisos/MFA: acciones privilegiadas protegidas server-side y step-up MFA reciente.

## 5. Portal corporativo B2B — `/hr`

- Panel de cultura y salud laboral con métricas agregadas y utilización de licencias.
- No exponer journals, notas privadas, audio, transcripciones ni datos individuales.
- Aplicar umbral mínimo de agregación configurable para impedir reidentificación; ocultar cohortes pequeñas.
- Verificar reglas Firestore y endpoints con pruebas negativas de aislamiento entre empresas y entre HR y usuarios.

## 6. Kira AI Suite

- AIChat contextual persistente: contexto de ruta y rol; solo información autorizada para el usuario. No enviar journals ni datos de terceros salvo acción explícita y autorizada.
- Modelos Gemini declarados por el proyecto: Gemini 3.1 Pro Preview y Gemini 2.5 Flash. La selección de modelo y claves permanecen en backend; nunca exponer secretos Gemini al navegador.
- Nudge & Predictive Insights: disparadores basados en eventos reales, límites de frecuencia, opt-out y registro de origen.
- Audio multimodal: consentimiento, minimización, retención y borrado definidos; resultados etiquetados como inferencias IA.

## 7. Modelo Firestore canónico

Colecciones principales: `users`, `courses`, `enrollments`, `sessions`, `journal_entries`, `transactions`, `settings/website`.  
Colecciones de dominio adicionales cuando corresponda: `orders`, `paymentEvents`, `paymentAudit`, `certificates`, `certificatePublic`, `certificate_audit`, `outbox`, `companies/{companyId}/members`, `companies/{companyId}/wellbeingAggregates`.

Invariantes:
1. Webhooks de pago firmados, idempotentes y con importe/moneda/orden/usuario coincidentes.
2. Matrículas, progreso, puntos, certificados, reembolsos y liquidaciones validados en servidor.
3. Ningún secreto en frontend, repositorio, logs o campos `VITE_*`.
4. Archivos multimedia en Firebase Storage; Firestore guarda metadatos y permisos.
5. Eventos críticos con auditoría, correlación e idempotencia.
6. Firestore Rules deniegan por defecto y aíslan usuarios, coaches y organizaciones.

## 8. Criterios de aceptación y gates de publicación

- **G0 Identidad y seguridad:** RBAC/ABAC por endpoint y recurso, MFA para administración, aislamiento multi-tenant, reglas Firestore/Storage probadas.
- **G1 Académico:** curso → matrícula → progreso → asistencia/finalización con transacciones y pruebas.
- **G2 Alumno:** journal privado, puntos, biblioteca y reseñas con reglas y pruebas de abuso.
- **G3 Coach:** editor, subida de medios, alumnos asignados y sesiones con consentimiento y persistencia.
- **G4 Monetización:** checkout sandbox, webhooks válidos/invalidos/repetidos, refunds y conciliación.
- **G5 Certificados:** pago/matrícula elegibles → emisión PDF firmada → QR público mínimo → revocación; E2E completo.
- **G6 B2B:** agregación con umbral, pruebas de no exposición individual y aislamiento por empresa.
- **G7 IA:** Gemini solo desde backend, rutas contextuales, límites, privacidad y fallbacks.
- **G8 Operación:** outbox durable con reintentos/DLQ, notificaciones, auditoría, observabilidad y recuperación.
- **G9 Producción:** typecheck, lint, tests unitarios, Firestore Rules tests, build, CI verde, Preview READY del SHA exacto y smoke/E2E de flujos críticos antes de promover a producción.

## 9. Estado inicial observado en la auditoría

El inventario existente marca los módulos como existentes pero parciales en varios puntos. Se deben reutilizar los componentes actuales y completar sus contratos; no duplicar pantallas. Entre los pendientes ya identificados: MFA y permisos homogéneos; reglas de finalización y asistencia; refunds, facturas/impuestos, suscripciones y payouts; E2E de certificados; outbox/notificaciones; reconciliación analítica; retención/antivirus de medios; pruebas de privacidad B2B y pruebas de integración IA/audio.

**Regla de comunicación:** una ruta o componente existente no significa que el módulo esté terminado. Cada gate debe enlazar pruebas y evidencia de ejecución. No declarar “completo” ni promover cambios que no hayan superado los gates correspondientes.
