import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { Mic, MicOff, Brain, Sparkles, AlertCircle, FileText, Activity, User, MessageSquare, Target, TrendingUp, Zap, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Interfaces para Session Intelligence
interface Insight {
  type: 'moment' | 'action' | 'sentiment';
  content: string;
  timestamp: string;
  sentiment?: 'positivo' | 'neutral' | 'estrés' | 'motivación' | 'duda';
}

interface Message {
  id: string;
  speaker: 'Coach' | 'Cliente';
  text: string;
  timestamp: string;
}

interface LongitudinalAnalysis {
  resumen_ejecutivo: string;
  progreso_metas_anteriores: string[];
  nuevos_compromisos: { tarea: string; deadline: string; priority: 'alta' | 'media' | 'baja' }[];
  patrones_detectados: string[];
  inconsistencias_detectadas?: string[];
  prosodic_inference?: string;
  roleplay_scenarios?: string[];
  personal_mantra?: string;
  focus_heatmap?: {
    pasado_problemas: number;
    presente: number;
    futuro_soluciones: number;
  };
  sugerencia_proxima_sesion: string;
  metrics?: {
    confidence: number;
    clarity: number;
    energy: number;
  };
}

// ✅ FUNCIÓN HELPER PARA SANITIZAR ARRAYS
const sanitizeArray = (value: any, defaultValue: string[] = []): string[] => {
  return Array.isArray(value) ? value : defaultValue;
};

// ✅ FUNCIÓN HELPER PARA SANITIZAR ANÁLISIS
const sanitizeAnalysis = (analysis: any): LongitudinalAnalysis | null => {
  if (!analysis) return null;
  
  return {
    ...analysis,
    progreso_metas_anteriores: sanitizeArray(analysis.progreso_metas_anteriores),
    patrones_detectados: sanitizeArray(analysis.patrones_detectados),
    inconsistencias_detectadas: sanitizeArray(analysis.inconsistencias_detectadas),
    roleplay_scenarios: sanitizeArray(analysis.roleplay_scenarios),
    nuevos_compromisos: Array.isArray(analysis.nuevos_compromisos) ? analysis.nuevos_compromisos : [],
    focus_heatmap: analysis.focus_heatmap || { pasado_problemas: 0, presente: 0, futuro_soluciones: 0 },
    metrics: analysis.metrics || { confidence: 0, clarity: 0, energy: 0 }
  };
};

// ✅ FUNCIÓN PARA FORMATEAR ARRAYS DE FORMA SEGURA
const safeJoin = (arr: any[] | undefined, separator: string = ', '): string => {
  if (!arr || !Array.isArray(arr)) return '';
  return arr.join(separator);
};

export default function SessionIntelligence() {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isPremium, setIsPremium] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [analysis, setAnalysis] = useState<LongitudinalAnalysis | null>(null);
  const [lastSession, setLastSession] = useState<LongitudinalAnalysis | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'summarizing'>('idle');
  
  const [sessionMode, setSessionMode] = useState<'live' | 'form'>('form');
  const [clientName, setClientName] = useState('Sofía Ramírez');
  const [sessionTopic, setSessionTopic] = useState('Gestión de Estrés Laboral y Síndrome de Burnout');
  const [manualTranscript, setManualTranscript] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState<'positivo' | 'neutral' | 'estrés' | 'motivación' | 'duda'>('estrés');
  const [manualConfidence, setManualConfidence] = useState(7);
  const [manualClarity, setManualClarity] = useState(6);
  const [manualEnergy, setManualEnergy] = useState(5);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState<'Coach' | 'Cliente'>('Cliente');
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const recognitionRef = useRef<any>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);

  useEffect(() => {
    fetchLastSession();
  }, [user]);

  const handleAnalyzeManualSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!manualTranscript.trim()) {
      alert("Por favor escribe o genera un diálogo de ejemplo para poder analizarlo.");
      return;
    }
    setIsAnalyzing(true);
    setStatus('summarizing');
    setAnalysis(null);
    
    try {
      // ✅ AHORA CON SANITIZACIÓN
      const lastSessionSafe = lastSession ? sanitizeAnalysis(lastSession) : null;
      
      const prompt = `Actúa como un Psicólogo Organizacional y Coach de Alto Rendimiento. Analiza esta sesión de coaching de Kira Coach.
      
      DATOS GENERALES:
      - Alumno/Cliente: ${clientName}
      - Tema/Intención de la Sesión: ${sessionTopic}
      - Sentimiento Predominante del Alumno: ${selectedSentiment}
      - Métricas estimadas por el coach (1-10): Confianza: ${manualConfidence}, Claridad: ${manualClarity}, Energía: ${manualEnergy}

      HISTORIAL PREVIO (Contexto):
      ${lastSessionSafe ? `
        - Metas anteriores: ${safeJoin(lastSessionSafe.progreso_metas_anteriores)}
        - Resumen previo: ${lastSessionSafe.resumen_ejecutivo || 'Sin resumen previo'}
        - Patrones anteriores: ${safeJoin(lastSessionSafe.patrones_detectados)}
      ` : 'Esta es la primera sesión. Identifica metas base.'}

      TRANSCRIPCIÓN DE LA CONVERSACIÓN:
      ${manualTranscript}

      TAREA ANALÍTICA INTEGRAL:
      1. TRAYECTORIA EMOCIONAL: Analiza cómo cambió el sentimiento del cliente desde el inicio hasta el final basado en el diálogo.
      2. IDENTIFICACIÓN DE INCONGRUENCIAS: Compara los objetivos declarados con quejas recurrentes o sentimientos negativos expresados.
      3. ANÁLISIS PROSÓDICO SIMULADO: Infiere niveles de duda/seguridad basados en el diálogo y flujo del texto.
      4. ESCENARIOS DE ROLEPLAY: Propón un escenario de simulación/roleplay relevante para que el coach lo use con el cliente.
      5. MANTRA PERSONALIZADO: Genera una frase de poder única basada en las fortalezas detectadas y el cambio emocional positivo.
      6. MAPA DE CALOR DE ENFOQUE: Calcula el % de la conversación en [Pasado/Problemas], [Presente], [Futuro/Soluciones].

      Responde ESTRICTAMENTE en este formato JSON:
      {
        "resumen_ejecutivo": "string (debe incluir el hallazgo emocional principal y referirse al cliente por su nombre: ${clientName})",
        "progreso_metas_anteriores": ["string"],
        "nuevos_compromisos": [{"tarea": "string", "deadline": "string", "priority": "alta|media|baja"}],
        "patrones_detectados": ["string (incluir patrones emocionales como 'resiliencia ante críticas' o 'evitación de conflicto')"],
        "inconsistencias_detectadas": ["string"],
        "prosodic_inference": "string",
        "roleplay_scenarios": ["string"],
        "personal_mantra": "string",
        "focus_heatmap": { "pasado_problemas": number, "presente": number, "futuro_soluciones": number },
        "metrics": { "confidence": number, "clarity": number, "energy": number },
        "sugerencia_proxima_sesion": "string"
      }`;

      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        })
      });
      const dataJson = await response.json();
      if (dataJson.error) throw new Error(dataJson.error);

      const data = JSON.parse(dataJson.text) as LongitudinalAnalysis;
      // ✅ SANITIZAR DATOS RECIBIDOS
      const sanitizedData = sanitizeAnalysis(data);
      setAnalysis(sanitizedData);
      
      await addDoc(collection(db, 'sessions'), {
        userId: user.uid,
        clientName,
        sessionTopic,
        coachId: user.uid,
        transcript: manualTranscript,
        analysis: sanitizedData,
        createdAt: serverTimestamp()
      });

    } catch (e: any) {
      console.error("Error parsing analysis:", e);
      alert("Hubo un error al procesar el análisis de la sesión: " + e.message);
    } finally {
      setIsAnalyzing(false);
      setStatus('idle');
    }
  };

  const fetchLastSession = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'sessions'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const sorted: any[] = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        // ✅ SANITIZAR DATOS DE LA ÚLTIMA SESIÓN
        const rawAnalysis = sorted[0].analysis;
        setLastSession(sanitizeAnalysis(rawAnalysis));
      }
    } catch (e) {
      console.error("Error fetching last session:", e);
    }
  };

  // ✅ SISTEMA DE INSTRUCCIÓN CORREGIDO
  const systemInstruction = `
    Eres Kira Coach Engine, un sistema de inteligencia artificial experto en coaching y análisis longitudinal.
    
    CONTEXTO HISTÓRICO:
    ${lastSession ? `
      - Metas anteriores: ${safeJoin(lastSession.progreso_metas_anteriores)}
      - Resumen previo: ${lastSession.resumen_ejecutivo || 'Sin resumen previo'}
      - Patrones anteriores: ${safeJoin(lastSession.patrones_detectados)}
      PUENTE DE CONTINUIDAD: Inicia la sesión conectando con esto de forma empática.
    ` : 'Esta es la primera sesión. Identifica metas base.'}

    TRANSCRIPCIÓN:
    - Proporciona una transcripción limpia, eliminando muletillas (eh, mm, este, o sea...).
    - Aplica puntuación gramatical automática.

    DIARIZACIÓN:
    - Identifica quién habla: "Coach" o "Cliente".
    - Devuelve el texto precedido por [COACH] o [CLIENTE].

    ANÁLISIS EN TIEMPO REAL:
    - [MOMENTO: descripción] para hitos emocionales o descubrimientos.
    - [ACCIÓN: tarea] para compromisos expresados.
    - [SENTIMIENTO: tono] para estrés, motivación, duda, etc.
    - Alerta de [PATRÓN: descripción] si detectas bloqueos recurrentes o contradicciones.
  `;

  const triggerRealtimeInsight = async (sentence: string) => {
    try {
      const prompt = `Analiza la siguiente intervención de una sesión de coaching y detecta UN hito, sentimiento o acción futura en formato JSON breve.
      Intervención: "${sentence}"
      
      Responde ESTRICTAMENTE en este formato JSON:
      {
        "type": "moment" | "action" | "sentiment",
        "content": "Frase corta de 10 palabras o menos en español resumiendo el hallazgo, ej: 'Expresa fuerte tensión por sobrecarga laboral' o 'Compromiso de apagar notificaciones'",
        "sentiment": "estrés" | "positivo" | "neutral" | "motivación" | "duda"
      }`;

      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        })
      });
      const dataJson = await response.json();
      if (dataJson.error) return;
      const data = JSON.parse(dataJson.text);
      if (data.content) {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        addInsight({
          type: data.type || 'sentiment',
          content: data.content,
          timestamp: now,
          sentiment: data.sentiment || 'neutral'
        });
      }
    } catch (err) {
      console.error("Error generating realtime insight:", err);
    }
  };

  const generateAIPly = async () => {
    if (messages.length === 0) {
      alert("Por favor di algo primero antes de solicitar la respuesta de Kira AI.");
      return;
    }
    setIsGeneratingReply(true);
    try {
      const history = messages.map(m => `${m.speaker}: ${m.text}`).join('\n');
      const prompt = `Eres Kira Coach, una mentora de bienestar y psicóloga de alto rendimiento de Kira AI. 
      Lee la siguiente conversación de coaching en progreso y escribe una única respuesta breve, empática, profunda y relevante de máximo 2 oraciones para guiar al Cliente o responder al Coach.
      No agregues explicaciones, responde directamente en español de manera profesional y sumamente humana.

      CONVERSACIÓN EN PROGRESO:
      ${history}

      Kira Coach:`;

      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-3.5-flash",
          contents: prompt
        })
      });
      const dataJson = await response.json();
      if (dataJson.error) throw new Error(dataJson.error);

      const aiText = dataJson.text?.trim() || "";
      if (aiText) {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            speaker: 'Coach',
            text: aiText,
            timestamp: now,
            sentiment: 'neutral'
          } as any
        ]);
        triggerRealtimeInsight(aiText);
      }
    } catch (err: any) {
      console.error("Error generating AI Coach response:", err);
      alert("Error al generar respuesta de Kira AI: " + err.message);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const startSession = async () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("La transcripción de voz por micrófono no está soportada en este navegador. Por favor usa Google Chrome, Safari o Microsoft Edge.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onstart = () => {
        console.log("Speech recognition started");
        setIsRecording(true);
        setStatus('running');
        setInterimTranscript('');
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'not-allowed') {
          alert("Acceso al micrófono denegado o bloqueado. Por favor, habilita los permisos de micrófono en la configuración de tu navegador.");
        }
        setIsRecording(false);
        setStatus('idle');
      };

      recognition.onend = () => {
        console.log("Speech recognition ended");
        setIsRecording(false);
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcriptSegment = result[0].transcript;
          if (result.isFinal) {
            const cleanText = transcriptSegment.trim();
            if (cleanText) {
              const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              setMessages(prev => {
                const updated = [
                  ...prev,
                  {
                    id: Math.random().toString(36).substring(2, 9),
                    speaker: activeSpeaker,
                    text: cleanText,
                    timestamp: now,
                    sentiment: 'neutral'
                  } as any
                ];
                return updated;
              });

              triggerRealtimeInsight(cleanText);
            }
          } else {
            interim += transcriptSegment;
          }
        }
        setInterimTranscript(interim);
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (error: any) {
      console.error("Error iniciando micrófono:", error);
      alert("Error al iniciar el micrófono: " + error.message);
    }
  };

  const stopSession = () => {
    setIsRecording(false);
    setStatus('summarizing');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Error stopping recognition:", err);
      }
    }
    generateSummary(messages);
  };

  const processIAMessage = (text: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (text.includes('[MOMENTO:')) {
      const content = text.match(/\[MOMENTO: (.*?)\]/)?.[1];
      if (content) addInsight({ type: 'moment', content, timestamp: now });
    }
    if (text.includes('[ACCIÓN:')) {
      const content = text.match(/\[ACCIÓN: (.*?)\]/)?.[1];
      if (content) addInsight({ type: 'action', content, timestamp: now });
    }
    if (text.includes('[SENTIMIENTO:')) {
      const content = text.match(/\[SENTIMIENTO: (.*?)\]/)?.[1];
      if (content) {
        addInsight({ type: 'sentiment', content, timestamp: now });
      }
    }
  };

  const processUserTranscription = (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      speaker: 'Cliente',
      text: cleanText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sentiment: 'neutral'
    } as any]);
  };

  const addInsight = (insight: Insight) => {
    setInsights(prev => [insight, ...prev]);
  };

  // ✅ GENERATE SUMMARY CORREGIDO
  const generateSummary = async (customMessages?: Message[]) => {
    const listToUse = customMessages || messages;
    if (!user) return;
    if (listToUse.length === 0) {
      alert("No se ha registrado ninguna transcripción para analizar. Por favor habla por el micrófono o usa el Formulario Manual.");
      setStatus('idle');
      return;
    }
    
    setStatus('summarizing');
    setAnalysis(null);

    const fullTranscript = listToUse.map(m => `${m.speaker}: ${m.text}`).join('\n');
    
    // ✅ SANITIZAR ÚLTIMA SESIÓN
    const lastSessionSafe = lastSession ? sanitizeAnalysis(lastSession) : null;
    
    const prompt = `Actúa como un Psicólogo Organizacional y Coach de Alto Rendimiento. Analiza esta sesión de coaching de Kira Coach.
    
    HISTORIAL PREVIO (Contexto):
    ${lastSessionSafe ? JSON.stringify({
      ...lastSessionSafe,
      progreso_metas_anteriores: sanitizeArray(lastSessionSafe.progreso_metas_anteriores),
      patrones_detectados: sanitizeArray(lastSessionSafe.patrones_detectados)
    }) : 'Sin historial.'}

    TRANSCRIPCIÓN ACTUAL (Con etiquetas de sentimiento por intervención):
    ${listToUse.map(m => `[${(m as any).sentiment || 'neutral'}] ${m.speaker}: ${m.text}`).join('\n')}

    TAREA ANALÍTICA INTEGRAL:
    1. TRAYECTORIA EMOCIONAL: Analiza cómo cambió el sentimiento del cliente desde el inicio hasta el final.
    2. IDENTIFICACIÓN DE INCONGRUENCIAS: Compara los objetivos declarados con quejas recurrentes o sentimientos negativos persistentes.
    3. ANÁLISIS PROSÓDICO SIMULADO: Infiere niveles de duda/seguridad basados en la puntuación y flujo del texto.
    4. ESCENARIOS DE ROLEPLAY: Si se menciona un conflicto futuro, propón un escenario de simulación.
    5. MANTRA PERSONALIZADO: Genera una frase de poder única basada en las fortalezas detectadas y el cambio emocional positivo.
    6. MAPA DE CALOR DE ENFOQUE: Calcula el % de la conversación en [Pasado/Problemas], [Presente], [Futuro/Soluciones].

    Responde ESTRICTAMENTE en este formato JSON:
    {
      "resumen_ejecutivo": "string (debe incluir el hallazgo emocional principal)",
      "progreso_metas_anteriores": ["string"],
      "nuevos_compromisos": [{"tarea": "string", "deadline": "string", "priority": "alta|media|baja"}],
      "patrones_detectados": ["string (incluir patrones emocionales como 'resiliencia ante críticas' o 'evitación de conflicto')"],
      "inconsistencias_detectadas": ["string"],
      "prosodic_inference": "string",
      "roleplay_scenarios": ["string"],
      "personal_mantra": "string",
      "focus_heatmap": { "pasado_problemas": number, "presente": number, "futuro_soluciones": number },
      "metrics": { "confidence": number, "clarity": number, "energy": number },
      "sugerencia_proxima_sesion": "string"
    }`;

    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      })
    });
    const dataJson = await response.json();
    if (dataJson.error) throw new Error(dataJson.error);

    try {
      const data = JSON.parse(dataJson.text) as LongitudinalAnalysis;
      // ✅ SANITIZAR DATOS RECIBIDOS
      const sanitizedData = sanitizeAnalysis(data);
      setAnalysis(sanitizedData);
      
      await addDoc(collection(db, 'sessions'), {
        userId: user.uid,
        coachId: user.uid,
        transcript: listToUse,
        analysis: sanitizedData,
        createdAt: serverTimestamp()
      });

      setStatus('idle');
    } catch (e) {
      console.error("Error parsing analysis:", e);
    }
  };

  // Resto del código de renderizado igual...
  // (El JSX permanece igual, solo se actualizan las funciones)

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 text-left">
      {/* ... todo el JSX igual ... */}
    </div>
  );
}

function Loader2({ className, size = 24 }: { className?: string, size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
