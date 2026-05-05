# Kira Coach - Especificaciones de Inteligencia (BI) Dashboard para Super Admins

Como Product Owner de Kira Coach, he diseñado la pestaña **"Inteligencia (BI)"** para transformar la data bruta en **insights operacionales** que le permitan al equipo de Super Admins y Coaches tomar decisiones predictivas y estratégicas. A continuación, presento la estructura lógica de los widgets requeridos, enfocándonos en la extracción ética y analítica de datos.

---

## 1. KPI de Bienestar Comunitario (Felicidad vs. Estrés)
**Objetivo:** Monitorear el pulso emocional general de la comunidad en tiempo real para predecir tasas de burnout y ajustar el tono de las interacciones.
* **Tipo de Gráfica:** Gráfico de Líneas de doble eje (Dual-axis Line Chart) a lo largo del tiempo (7 días / 30 días).
* **Métricas a mostrar:**
  * Línea Verde: Índice promedio de felicidad/motivación.
  * Línea Roja: Índice promedio de estrés/tensión.
* **Datos a extraer de Firestore:**
  * **Colecciones:** `journals` (entradas diarias) y `mentoringSessions` (sesiones de coaching).
  * **Campos:** `sentiment` (positive, neutral, negative), `aiAnalysis.stressLevel` (para sesiones de IA).
  * **Cálculo:** Agrupar por `createdAt` (fecha), contar el ratio de positivos vs. negativos, y promediar los niveles de estrés detectados por la IA.

## 2. Índice de Retención por Insight (Action Rate)
**Objetivo:** Medir si las intervenciones de Kira ("Nudges" o "Desafíos Maestros") realmente generan un cambio en el comportamiento del usuario. ¿La inteligencia artificial es convincente o es ignorada?
* **Tipo de Gráfica:** Gráfico de Embudo (Funnel Chart) o Gauge de Conversión.
* **Métricas a mostrar:**
  * Tasa de Conversión (% de Nudges marcados como "Completados" o "Actuados").
  * Tiempo promedio de acción desde que la sugerencia fue emitida.
* **Datos a extraer de Firestore:**
  * **Colección:** `aiInsights` o `userNudges`.
  * **Campos:** `status` (pending, completed, ignored), `insightType`, `createdAt`, `completedAt`.
  * **Cálculo:** `(Count de Nudges Completed / Count de Todos los Nudges) * 100`.

## 3. Alertas de Riesgo y Protocolo de Calma
**Objetivo:** Gestión de crisis. Garantizar que cuando Kira detecta lenguaje de alto riesgo (burnout severo o emergencia), el equipo humano responde en tiempo y forma.
* **Tipo de Gráfica:** 
  * Tabla de Registro de Alertas Activas (Data Grid con banderas de urgencia).
  * Indicador de "SLA Abordaje Humano" (ej: "Tiempo promedio de respuesta: 14 min").
* **Métricas a mostrar:**
  * Volumen total de Alertas de Riesgo ("Modo de Emergencia") en la semana.
  * *Response Time* (Tiempo transcurrido desde la alerta hasta que un especialista interviene).
* **Datos a extraer de Firestore:**
  * **Colección:** `systemAlerts` / `emergencyModes`.
  * **Campos:** `severity`, `triggeredAt`, `resolvedAt`, `assignedToStaff`.
  * **Cálculo:** Diferencia de tiempo temporal entre `triggeredAt` y `resolvedAt`.

## 4. Mapa de Temas y Nube de Conceptos (Topic Cluster)
**Objetivo:** Entender "De qué se está hablando en la oscuridad". Brindar a los coaches material real sobre las preocupaciones dominantes del mes, salvaguardando la privacidad y el anonimato.
* **Tipo de Gráfica:** Nube de Palabras Dinámica (Word Cloud) o un *Treemap* de Categorías de Conversación.
* **Métricas a mostrar:**
  * Top 5 conceptos más discutidos (Ej: "Miedo al despido" - 35% de menciones, "Búsqueda de propósito" - 20%).
  * Tendencia (Flechas arriba/abajo indicando si el tema creció con respecto al mes anterior).
* **Datos a extraer de Firestore:**
  * **Colección:** `sessionIntelligence` (análisis generados por AI) y `journals`.
  * **Campos:** `aiExtractedTopics` o `keyThemes` (Arrays de strings).
  * **Tratamiento Ético:** La data debe ser *anonimizada*, contando solo frecuencias relativas del campo de temas en toda la comunidad, sin relacionarlos al `userId`.

---
*Diseñado por el equipo de Producto para la Re-Evolución Consciente.*
