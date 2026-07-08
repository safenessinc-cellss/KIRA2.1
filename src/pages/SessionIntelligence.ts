import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  Mic, MicOff, Brain, Sparkles, AlertCircle, FileText, 
  Activity, User, MessageSquare, Target, TrendingUp, Zap, 
  History, Loader2, RefreshCw, ChevronDown, ChevronUp,
  Clock, CheckCircle, XCircle, Award, Star, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// INTERFACES
// ============================================
interface Insight {
  type: 'moment' | 'action' | 'sentiment' | 'pattern';
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

// ============================================
// FUNCIONES HELPER
// ============================================
const sanitizeArray = (value: any, defaultValue: string[] = []): string[] => {
  return Array.isArray(value) ? value : defaultValue;
};

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

const safeJoin = (arr: any[] | undefined, separator: string = ', '): string => {
  if (!arr || !Array.isArray(arr)) return '';
  return arr.join(separator);
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function SessionIntelligence() {
  const { user } = useAuth();
  
  // Estados principales
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [analysis, setAnalysis] = useState<LongitudinalAnalysis | null>(null);
  const [lastSession, setLastSession] = useState<LongitudinalAnalysis | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'summarizing'>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState<'Coach' | 'Cliente'>('Cliente');
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Estados del formulario manual
  const [sessionMode, setSessionMode] = useState<'live' | 'form'>('form');
  const [clientName, setClientName] = useState('Sofía Ramírez');
  const [sessionTopic, setSessionTopic] = useState('Gestión de Estrés Laboral');
  const [manualTranscript, setManualTranscript] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState<'positivo' | 'neutral' | 'estrés' | 'motivación' | 'duda'>('estrés');
  const [manualConfidence, setManualConfidence] = useState(7);
  const [manualClarity, setManualClarity] = useState(6);
  const [manualEnergy, setManualEnergy] = useState(5);
  
  const recognitionRef = useRef<any>(null);

  // ============================================
  // EFECTOS
  // ============================================
  useEffect(() => {
    fetchLastSession();
  }, [user]);

  // ============================================
  // FUNCIONES DE ANÁLISIS
  // ============================================
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
        const rawAnalysis = sorted[0].analysis;
        setLastSession(sanitizeAnalysis(rawAnalysis));
      }
    } catch (e) {
      console.error("Error fetching last session:", e);
    }
  };

  const addInsight = (insight: Insight) => {
    setInsights(prev => [insight, ...prev]);
  };

  const triggerRealtimeInsight = async (sentence: string) => {
    try {
      const prompt = `Analiza la siguiente intervención de una sesión de coaching y detecta UN hito, sentimiento o acción futura en formato JSON breve.
      Intervención: "${sentence}"
      
      Responde ESTRICTAMENTE en este formato JSON:
      {
        "type": "moment" | "action" | "sentiment" | "pattern",
        "content": "Frase corta de 10 palabras o menos en español resumiendo el hallazgo",
        "sentiment": "estrés" | "positivo" | "neutral" | "motivación" | "duda"
      }`;

      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-2.0-flash-exp",
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
          model: "gemini-2.0-flash-exp",
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

  // ============================================
  // FUNCIONES DE VOZ (Live Mode)
  // ============================================
  const startSession = async () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("La transcripción de voz no está soportada en este navegador. Usa Chrome, Safari o Edge.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onstart = () => {
        setIsRecording(true);
        setStatus('running');
        setInterimTranscript('');
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'not-allowed') {
          alert("Acceso al micrófono denegado. Habilita los permisos en la configuración del navegador.");
        }
        setIsRecording(false);
        setStatus('idle');
      };

      recognition.onend = () => {
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
              setMessages(prev => [
                ...prev,
                {
                  id: Math.random().toString(36).substring(2, 9),
                  speaker: activeSpeaker,
                  text: cleanText,
                  timestamp: now,
                  sentiment: 'neutral'
                } as any
              ]);
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

  // ============================================
  // FUNCIÓN PARA GENERAR RESUMEN
  // ============================================
  const generateSummary = async (customMessages?: Message[]) => {
    const listToUse = customMessages || messages;
    if (!user) return;
    if (listToUse.length === 0) {
      alert("No se ha registrado ninguna transcripción para analizar.");
      setStatus('idle');
      return;
    }
    
    setStatus('summarizing');
    setAnalysis(null);

    const lastSessionSafe = lastSession ? sanitizeAnalysis(lastSession) : null;
    
    const prompt = `Actúa como un Psicólogo Organizacional y Coach de Alto Rendimiento. Analiza esta sesión de coaching de Kira Coach.
    
    HISTORIAL PREVIO (Contexto):
    ${lastSessionSafe ? JSON.stringify({
      ...lastSessionSafe,
      progreso_metas_anteriores: sanitizeArray(lastSessionSafe.progreso_metas_anteriores),
      patrones_detectados: sanitizeArray(lastSessionSafe.patrones_detectados)
    }) : 'Sin historial.'}

    TRANSCRIPCIÓN ACTUAL:
    ${listToUse.map(m => `[${(m as any).sentiment || 'neutral'}] ${m.speaker}: ${m.text}`).join('\n')}

    TAREA ANALÍTICA INTEGRAL:
    1. TRAYECTORIA EMOCIONAL: Analiza cómo cambió el sentimiento del cliente.
    2. IDENTIFICACIÓN DE INCONGRUENCIAS: Compara objetivos con quejas recurrentes.
    3. ANÁLISIS PROSÓDICO SIMULADO: Infiere niveles de duda/seguridad.
    4. ESCENARIOS DE ROLEPLAY: Propón un escenario de simulación.
    5. MANTRA PERSONALIZADO: Genera una frase de poder única.
    6. MAPA DE CALOR DE ENFOQUE: Calcula el % de la conversación.

    Responde ESTRICTAMENTE en este formato JSON:
    {
      "resumen_ejecutivo": "string",
      "progreso_metas_anteriores": ["string"],
      "nuevos_compromisos": [{"tarea": "string", "deadline": "string", "priority": "alta|media|baja"}],
      "patrones_detectados": ["string"],
      "inconsistencias_detectadas": ["string"],
      "prosodic_inference": "string",
      "roleplay_scenarios": ["string"],
      "personal_mantra": "string",
      "focus_heatmap": { "pasado_problemas": number, "presente": number, "futuro_soluciones": number },
      "metrics": { "confidence": number, "clarity": number, "energy": number },
      "sugerencia_proxima_sesion": "string"
    }`;

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-2.0-flash-exp",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        })
      });
      const dataJson = await response.json();
      if (dataJson.error) throw new Error(dataJson.error);

      const data = JSON.parse(dataJson.text) as LongitudinalAnalysis;
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
      setStatus('idle');
    }
  };

  // ============================================
  // MANEJO DEL FORMULARIO MANUAL
  // ============================================
  const handleAnalyzeManualSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!manualTranscript.trim()) {
      alert("Por favor escribe o genera un diálogo de ejemplo.");
      return;
    }
    setIsAnalyzing(true);
    setStatus('summarizing');
    setAnalysis(null);
    
    try {
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
      1. TRAYECTORIA EMOCIONAL: Analiza cómo cambió el sentimiento del cliente.
      2. IDENTIFICACIÓN DE INCONGRUENCIAS: Compara objetivos con quejas recurrentes.
      3. ANÁLISIS PROSÓDICO SIMULADO: Infiere niveles de duda/seguridad.
      4. ESCENARIOS DE ROLEPLAY: Propón un escenario de simulación.
      5. MANTRA PERSONALIZADO: Genera una frase de poder única.
      6. MAPA DE CALOR DE ENFOQUE: Calcula el % de la conversación.

      Responde ESTRICTAMENTE en este formato JSON:
      {
        "resumen_ejecutivo": "string (debe incluir el hallazgo emocional principal y referirse al cliente por su nombre: ${clientName})",
        "progreso_metas_anteriores": ["string"],
        "nuevos_compromisos": [{"tarea": "string", "deadline": "string", "priority": "alta|media|baja"}],
        "patrones_detectados": ["string"],
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
          model: "gemini-2.0-flash-exp",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        })
      });
      const dataJson = await response.json();
      if (dataJson.error) throw new Error(dataJson.error);

      const data = JSON.parse(dataJson.text) as LongitudinalAnalysis;
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
      alert("Hubo un error al procesar el análisis: " + e.message);
    } finally {
      setIsAnalyzing(false);
      setStatus('idle');
    }
  };

  // ============================================
  // RENDERIZADO - UI COMPLETO
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ========== HEADER ========== */}
        <header className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Brain size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                Inteligencia de Sesión
                <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                  Kira AI
                </span>
              </h1>
              <p className="text-slate-500 text-sm">
                Transcripción y análisis IA en tiempo real para sesiones de coaching
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {status === 'running' && (
              <span className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl text-sm font-medium">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Sesión activa
              </span>
            )}
            {status === 'summarizing' && (
              <span className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl text-sm font-medium">
                <Loader2 className="animate-spin" size={16} />
                Analizando...
              </span>
            )}
          </div>
        </header>

        {/* ========== SELECTOR DE MODO ========== */}
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
          <button 
            type="button"
            onClick={() => { setSessionMode('form'); setAnalysis(null); setInsights([]); }}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              sessionMode === 'form' 
                ? "bg-indigo-600 text-white shadow-md" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <FileText size={16} /> Formulario Manual
          </button>
          <button 
            type="button"
            onClick={() => { setSessionMode('live'); setAnalysis(null); setInsights([]); }}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              sessionMode === 'live' 
                ? "bg-indigo-600 text-white shadow-md" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Mic size={16} /> En Vivo (Micrófono)
          </button>
        </div>

        {/* ========== GRID PRINCIPAL ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ===== COLUMNA IZQUIERDA: Transcripción ===== */}
          <div className="lg:col-span-2">
            
            {/* MODO FORMULARIO */}
            {sessionMode === 'form' && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <Sparkles className="text-indigo-600" size={20} />
                  <h3 className="font-bold text-slate-800 text-lg">Formulario de Sesión</h3>
                  <span className="text-xs text-slate-400 ml-auto">Ingresa los datos de la sesión</span>
                </div>

                <form onSubmit={handleAnalyzeManualSession} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Nombre del Cliente
                      </label>
                      <input 
                        type="text" 
                        required 
                        value={clientName} 
                        onChange={e => setClientName(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Tema de la Sesión
                      </label>
                      <input 
                        type="text" 
                        required 
                        value={sessionTopic} 
                        onChange={e => setSessionTopic(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all outline-none" 
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Transcripción de la Sesión
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setManualTranscript(`Coach: Hola ${clientName}, ¿cómo te sientes hoy?
Cliente: Hola Coach, la verdad es que me siento abrumada. En el trabajo todo el mundo me pide cosas y no sé cómo decir que no.
Coach: Entiendo. ¿Qué temores surgen cuando piensas en decir "no"?
Cliente: Siento que si digo que no, van a pensar que no soy capaz o que no estoy comprometida.
Coach: ¿Y qué límites consideras que podrías empezar a poner esta semana?
Cliente: Podría empezar por silenciar Slack a las 7 PM y no responder correos hasta el día siguiente.`)}
                        className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all"
                      >
                        <Sparkles size={12} /> Cargar Ejemplo
                      </button>
                    </div>
                    <textarea 
                      required 
                      value={manualTranscript} 
                      onChange={e => setManualTranscript(e.target.value)} 
                      rows={8} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all outline-none resize-none leading-relaxed" 
                      placeholder="Escribe o pega el diálogo de la sesión aquí..."
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sentimiento</label>
                      <select 
                        value={selectedSentiment} 
                        onChange={e => setSelectedSentiment(e.target.value as any)} 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none"
                      >
                        <option value="estrés">Estrés</option>
                        <option value="positivo">Positivo</option>
                        <option value="neutral">Neutral</option>
                        <option value="motivación">Motivación</option>
                        <option value="duda">Duda</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Confianza ({manualConfidence})</label>
                      <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={manualConfidence} 
                        onChange={e => setManualConfidence(Number(e.target.value))} 
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Claridad ({manualClarity})</label>
                      <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={manualClarity} 
                        onChange={e => setManualClarity(Number(e.target.value))} 
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Energía ({manualEnergy})</label>
                      <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={manualEnergy} 
                        onChange={e => setManualEnergy(Number(e.target.value))} 
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2" 
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button 
                      type="submit" 
                      disabled={isAnalyzing || !manualTranscript.trim()}
                      className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 flex items-center gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          Analizando con Kira AI...
                        </>
                      ) : (
                        <>
                          <Brain size={16} />
                          Analizar Sesión
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* MODO EN VIVO */}
            {sessionMode === 'live' && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[550px]">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-2">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <MessageSquare size={18} className="text-indigo-500" />
                    Transcripción en Vivo
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {isRecording && (
                      <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 border border-indigo-100">
                        <span className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
                        Hablando como:
                        <select 
                          value={activeSpeaker} 
                          onChange={e => setActiveSpeaker(e.target.value as any)}
                          className="bg-transparent border-none outline-none font-bold text-indigo-800 cursor-pointer"
                        >
                          <option value="Cliente" className="bg-white text-slate-700">Cliente</option>
                          <option value="Coach" className="bg-white text-slate-700">Coach</option>
                        </select>
                      </div>
                    )}
                    {messages.length > 0 && !isRecording && (
                      <button
                        type="button"
                        disabled={isGeneratingReply}
                        onClick={generateAIPly}
                        className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isGeneratingReply ? (
                          <Loader2 className="animate-spin" size={12} />
                        ) : (
                          <Sparkles size={12} />
                        )}
                        Kira Responde
                      </button>
                    )}
                    {!isRecording && messages.length === 0 && (
                      <button
                        type="button"
                        onClick={startSession}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                      >
                        <Mic size={16} /> Iniciar Sesión
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                  <AnimatePresence>
                    {messages.length === 0 && !isRecording && (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                        <div className="p-6 bg-slate-50 rounded-full">
                          <Mic size={40} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 text-center max-w-sm">
                          Presiona "Iniciar Sesión" para comenzar a transcribir con tu micrófono.
                        </p>
                      </div>
                    )}
                    {messages.map((m) => (
                      <motion.div 
                        key={m.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${m.speaker === 'Coach' ? '' : 'flex-row-reverse'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          m.speaker === 'Coach' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {m.speaker === 'Coach' ? <Brain size={14} /> : <User size={14} />}
                        </div>
                        <div className={`max-w-[75%] ${m.speaker === 'Coach' ? '' : 'text-right'}`}>
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {m.speaker} • {m.timestamp}
                          </div>
                          <div className={`p-3 rounded-2xl text-sm leading-relaxed mt-1 ${
                            m.speaker === 'Coach' 
                              ? 'bg-indigo-50 text-indigo-900 rounded-tl-none' 
                              : 'bg-amber-50 text-amber-900 rounded-tr-none'
                          }`}>
                            {m.text}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {isRecording && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-center gap-3"
                      >
                        <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce" />
                        <div className="text-xs text-indigo-700 font-medium">
                          {interimTranscript ? `"${interimTranscript}"` : `Escuchando a ${activeSpeaker}...`}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {isRecording && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <span className="text-xs text-slate-500">Grabando en tiempo real</span>
                    <button 
                      onClick={stopSession}
                      className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-rose-200 flex items-center gap-2"
                    >
                      <MicOff size={16} /> Finalizar Sesión
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== COLUMNA DERECHA: Insights ===== */}
          <div className="space-y-6">
            {/* Panel de Insights */}
            <div className="bg-slate-900 rounded-3xl p-5 shadow-xl text-white">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-indigo-400">
                <Sparkles size={18} />
                Insights en Tiempo Real
                <span className="ml-auto text-[10px] text-slate-500 font-medium">{insights.length}</span>
              </h3>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                <AnimatePresence>
                  {insights.map((insight, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-xl border ${
                        insight.type === 'moment' ? 'border-indigo-500/30 bg-indigo-500/10' :
                        insight.type === 'action' ? 'border-emerald-500/30 bg-emerald-500/10' :
                        insight.type === 'pattern' ? 'border-purple-500/30 bg-purple-500/10' :
                        'border-amber-500/30 bg-amber-500/10'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          insight.type === 'moment' ? 'bg-indigo-500 text-white' :
                          insight.type === 'action' ? 'bg-emerald-500 text-white' :
                          insight.type === 'pattern' ? 'bg-purple-500 text-white' :
                          'bg-amber-500 text-white'
                        }`}>
                          {insight.type === 'moment' ? 'Momento' :
                           insight.type === 'action' ? 'Acción' :
                           insight.type === 'pattern' ? 'Patrón' : 'Sentimiento'}
                        </span>
                        <span className="text-[9px] text-slate-500">{insight.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {insight.content}
                      </p>
                    </motion.div>
                  ))}
                  {insights.length === 0 && (
                    <div className="py-8 text-center text-slate-600">
                      <p className="text-sm">Esperando hallazgos...</p>
                      <p className="text-xs text-slate-700 mt-1">Los insights aparecerán aquí automáticamente</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Estado de la sesión */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Estado de la Sesión</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Mensajes</span>
                  <span className="font-bold text-slate-800">{messages.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Insights</span>
                  <span className="font-bold text-slate-800">{insights.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Estado</span>
                  <span className={`font-bold ${
                    status === 'running' ? 'text-emerald-600' :
                    status === 'summarizing' ? 'text-indigo-600' :
                    'text-slate-400'
                  }`}>
                    {status === 'running' ? '● Activo' :
                     status === 'summarizing' ? '◉ Analizando' :
                     '○ Inactivo'}
                  </span>
                </div>
                {lastSession && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center justify-center gap-1 py-2 border-t border-slate-100"
                  >
                    {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showHistory ? 'Ocultar' : 'Ver'} sesión anterior
                  </button>
                )}
                {showHistory && lastSession && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1"
                  >
                    <p><span className="font-bold">Resumen:</span> {lastSession.resumen_ejecutivo}</p>
                    <p><span className="font-bold">Patrones:</span> {safeJoin(lastSession.patrones_detectados) || 'Ninguno'}</p>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Indicador de sesión anterior */}
            {lastSession && !showHistory && (
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-center">
                <p className="text-xs text-indigo-600 font-medium">
                  📚 Hay una sesión anterior disponible
                </p>
                <p className="text-[10px] text-indigo-400 mt-1">Haz clic en "Ver sesión anterior"</p>
              </div>
            )}
          </div>
        </div>

        {/* ========== ANÁLISIS COMPLETO ========== */}
        <AnimatePresence>
          {analysis && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Encabezado del análisis */}
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-6 text-white shadow-xl flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Brain size={24} />
                    Análisis de Sesión
                  </h2>
                  <p className="text-indigo-200 text-sm">Resumen ejecutivo y métricas de evolución</p>
                </div>
                <button
                  onClick={() => setAnalysis(null)}
                  className="text-white/70 hover:text-white text-sm font-medium bg-white/20 px-4 py-2 rounded-xl transition"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Resumen Ejecutivo */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <FileText size={18} className="text-indigo-600" />
                    Resumen Ejecutivo
                  </h3>
                  <p className="text-slate-600 leading-relaxed text-sm italic">
                    "{analysis.resumen_ejecutivo}"
                  </p>
                  
                  {analysis.metrics && (
                    <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-slate-100">
                      {[
                        { label: 'Confianza', val: analysis.metrics.confidence, color: 'text-blue-600' },
                        { label: 'Claridad', val: analysis.metrics.clarity, color: 'text-indigo-600' },
                        { label: 'Energía', val: analysis.metrics.energy, color: 'text-amber-600' }
                      ].map((m, i) => (
                        <div key={i} className="text-center">
                          <div className="text-lg font-black text-slate-800">{m.val}/10</div>
                          <div className={`text-[10px] font-bold uppercase ${m.color}`}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mapa de Calor */}
                {analysis.focus_heatmap && (
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <TrendingUp size={18} className="text-indigo-600" />
                      Mapa de Calor de Enfoque
                    </h3>
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex mb-3">
                      <div style={{ width: `${analysis.focus_heatmap.pasado_problemas}%` }} className="bg-rose-400 h-full" />
                      <div style={{ width: `${analysis.focus_heatmap.presente}%` }} className="bg-amber-400 h-full" />
                      <div style={{ width: `${analysis.focus_heatmap.futuro_soluciones}%` }} className="bg-emerald-400 h-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-bold">
                      <div className="flex items-center gap-1 text-rose-600">
                        <div className="w-2 h-2 bg-rose-400 rounded-full" /> Pasado ({analysis.focus_heatmap.pasado_problemas}%)
                      </div>
                      <div className="flex items-center gap-1 text-amber-600">
                        <div className="w-2 h-2 bg-amber-400 rounded-full" /> Presente ({analysis.focus_heatmap.presente}%)
                      </div>
                      <div className="flex items-center gap-1 text-emerald-600">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full" /> Futuro ({analysis.focus_heatmap.futuro_soluciones}%)
                      </div>
                    </div>
                  </div>
                )}

                {/* Compromisos */}
                {analysis.nuevos_compromisos.length > 0 && (
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Zap size={18} className="text-emerald-600" />
                      Compromisos y Acciones
                    </h3>
                    <div className="space-y-2">
                      {analysis.nuevos_compromisos.map((c, i) => (
                        <div key={i} className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-emerald-900">{c.tarea}</p>
                            <p className="text-[10px] text-emerald-500">📅 {c.deadline}</p>
                          </div>
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${
                            c.priority === 'alta' ? 'bg-emerald-600 text-white' : 'bg-emerald-200 text-emerald-700'
                          }`}>
                            {c.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Patrones */}
                {analysis.patrones_detectados.length > 0 && (
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <History size={18} className="text-amber-600" />
                      Patrones Detectados
                    </h3>
                    <ul className="space-y-2">
                      {analysis.patrones_detectados.map((p, i) => (
                        <li key={i} className="text-sm text-slate-600 flex gap-2 p-2 bg-amber-50 rounded-xl border border-amber-100">
                          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Mantra */}
                {analysis.personal_mantra && (
                  <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl lg:col-span-2 text-center">
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-200 mb-2">✨ Mantra de Poder Personal</h3>
                    <p className="text-2xl font-serif italic">"{analysis.personal_mantra}"</p>
                  </div>
                )}

                {/* Sugerencia próxima sesión */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm lg:col-span-2">
                  <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Star size={18} className="text-amber-500" />
                    Sugerencia para la Próxima Sesión
                  </h3>
                  <p className="text-slate-600 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {analysis.sugerencia_proxima_sesion}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========== LOADING ========== */}
        {status === 'summarizing' && !analysis && (
          <div className="bg-white rounded-3xl p-12 border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <div>
              <p className="font-bold text-slate-800 text-lg">Generando Análisis</p>
              <p className="text-sm text-slate-500">Kira AI está analizando la sesión en profundidad...</p>
            </div>
          </div>
        )}

        {/* ========== FOOTER ========== */}
        <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-100">
          <p>Kira Coach • Inteligencia de Sesión v2.0 • {new Date().getFullYear()}</p>
        </footer>
      </div>
    </div>
  );
}