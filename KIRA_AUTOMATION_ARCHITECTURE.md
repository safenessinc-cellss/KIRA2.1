# Arquitectura de Automatización Kira Coach: Flujo Lógico y Triggers Conductuales

Como CTO de Kira Coach, presento el diseño de la arquitectura y flujo de datos para el módulo de "Automatización" del Super Admin. El objetivo de este sistema no es reemplazar la intervención humana, sino orquestarla con precisión quirúrgica basada en insights de IA en tiempo real.

## 1. Triggers Conductuales (Motor de Reglas Basado en IA)

El motor de automatización escucha pasivamente el análisis psicológico generado por Gemini (guardado en documentos de sesión o diario) y dispara Webhooks o Alertas al Staff cuando se cumplen ciertas condiciones.

### Los 5 Eventos (Triggers) Principales:

1.  **Detección de Riesgo de Burnout (Alerta Roja):**
    *   **Condición:** `aiAnalysis.stressLevel > 85` sostenido en 3 sesiones/diarios consecutivos.
    *   **Acción:** Se añade al usuario a la cola de "Intervención Urgente" en el CRM de Coaches, disparando una notificación push al Coach asignado.
2.  **Incongruencia de Valores (Alerta de Autosabotaje):**
    *   **Condición:** Los objetivos declarados (`user.profile.goals`) entran en conflicto semántico directo con las transcripciones de las sesiones ("Quiero pasar más tiempo con mi familia" vs. "Ayer trabajé hasta las 3 am").
    *   **Acción:** Dispara un *Kira Nudge* (Notificación in-app) automatizado preguntando sobre la paradoja, y agenda una alerta para la próxima sesión en vivo con el Coach.
3.  **Victoria Silenciosa (Logro de Meta a Largo Plazo):**
    *   **Condición:** La IA detecta un cambio de estado persistente de "buscando solución" a "estado de calma y control" respecto a un tema etiquetado como `long_term_goal`.
    *   **Acción:** Desbloquea automáticamente la medalla "Maestría de [Tema]" y notifica al Coach para que envíe un correo de felicitación personalizado.
4.  **Aislamiento Social Detectado (Alerta de Desconexión):**
    *   **Condición:** Reducción drástica (ej. -60%) en menciones a "equipo", "socios", "familia" o "amigos" en los diarios durante 15 días, combinado con un tono melancólico.
    *   **Acción:** Sugiere automáticamente en el Dashboard del alumno el curso de "Inteligencia Interpersonal" y notifica al Staff de Soporte Comunitario.
5.  **Pico de "Flow" Relacional (Alerta de Momentum):**
    *   **Condición:** La IA detecta lenguaje altamente resolutivo, creativo y enmarcado en soluciones (`sentiment: ultra-positive`).
    *   **Acción:** Es el momento óptimo de ventas. Se le muestra al usuario una invitación exclusiva al programa Premium Elite o a un Retiro de Inmersión.

---

## 2. Panel de "Salud de la IA"

Para garantizar que Kira sea efectiva y humana, medimos constantemente el equilibrio de sus interacciones. El widget de Salud de IA es un scatter plot o cuadrante mágico.

### El Cuadrante Empatía vs Resolución

*   **Eje X (Nivel de Empatía):** Alimentado por el NLP de Gemini respecto a cómo estructura sus oraciones ("Entiendo lo que dices", "Debe ser difícil").
*   **Eje Y (Nivel de Resolución):** Medido por la sugerencia de tácticas procesables ("Intenta escribir...", "Configura este límite horario").
*   **Feedback del Usuario (Z / Color del punto):** Tras cada interacción, el usuario da un ✅ o ❌ (Pulgar arriba/abajo).
*   **El Insight:**
    *   Alta Empatía / Baja Resolución: *Efecto "Hombro para llorar"*. Consuela, pero no lidera.
    *   Baja Empatía / Alta Resolución: *Efecto "Robot Clínico"*. Eficiente, pero alienante.
    *   **Zona Dorada (Arriba a la derecha):** Alta Empatía y Alta Resolución.

*Flujo:* Las respuestas de la IA se evalúan y promedian semanalmente, ajustando los "System Prompts" de Gemini dinámicamente si el modelo se desvía de la Zona Dorada.

---

## 3. Conexión CMS-BI: Motor de Promoción Predictiva

El CMS no debe ser estático. Si la comunidad sufre hiper-estrés generalizado en noviembre, la plataforma y el contenido deben adaptarse en tiempo real.

### Lógica de Sugerencia Automática:

1.  **Extracción Bi-Semanal:** Una Cloud Function consolida los `aiExtractedTopics` de toda la colección `sessionIntelligence` y `journals`.
2.  **Identificación de Trend (Topic Clustering):** Gemini agrupa y resume los conceptos en una gran macrotendencia (Ej: *"Incertidumbre financiera y recortes de personal"*).
3.  **Búsqueda Vectorial/Semántica en el CMS:** El sistema busca en el catálogo de Cursos (`availableCourses`) y Especialidades de Coaches el metadata que mejor coincida con esa macrotendencia.
4.  **Actualización Dinámica de Home:** El curso o los perfiles de los Coaches ganadores se marcan con una flag booleana `isFeaturedByAI: true` (o se eleva su ranking). El Dashboard de los alumnos consulta los ítems `isFeaturedByAI` y los pone en el carrusel de recomendación superior.

---

## 4. Flujo de Datos Global (Data Flow Blueprint)

1.  **Ingesta de Datos:**
    *   *Usuario -> `journals` / `messages` -> Dispara Cloud Function (o hook).*
2.  **Procesamiento IA (Gemini):**
    *   *Cloud Function hace un Request a **Gemini API** con el texto.*
    *   *Gemini devuelve un JSON estructurado con `sentiment`, `stressLevel`, `topics`, `anomalies`.*
3.  **Almacenamiento Inteligente:**
    *   *El JSON se guarda en `sessionIntelligence` o `aiInsights` emparejado con el `userId`.*
4.  **Evaluación de Triggers (Motor de Reglas):**
    *   *Un Firestore Listener (Trigger OnCreate/OnUpdate) evalúa el nuevo documento de insight.*
    *   *Si `stressLevel > 85`, escribe un nuevo documento en `systemAlerts`.*
5.  **Consumo del Admin / Staff Dashboard:**
    *   *El Dashboard del Super Admin (Frontend) está suscrito vía `onSnapshot` a `systemAlerts`, mostrando la alerta en la Pestaña "Automatización" o "Seguridad" en tiempo real.*
6.  **Acción del Usuario o Coach:**
    *   *El Coach resuelve la alerta -> Actualiza el estado a `resolved` -> Limpia la interfaz del dashboard.*
