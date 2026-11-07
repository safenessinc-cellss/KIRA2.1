import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { generateGemini } from '../lib/gemini';
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
  } | null;
  sugerencia_proxima_sesion: string;
  metrics?: {
    confidence: number | null;
    clarity: number | null;
    energy: number | null;
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
  const score = (value: any): number | null =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(10, Math.max(0, value))
      : null;
  const rawHeatmap = analysis.focus_heatmap;
  let focusHeatmap: LongitudinalAnalysis['focus_heatmap'] = null;
  if (rawHeatmap && ['pasado_problemas', 'presente', 'futuro_soluciones'].every(key => typeof rawHeatmap[key] === 'number' && Number.isFinite(rawHeatmap[key]))) {
    const values = [
      Math.max(0, rawHeatmap.pasado_problemas),
      Math.max(0, rawHeatmap.presente),
      Math.max(0, rawHeatmap.futuro_soluciones),
    ];
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total > 0) {
      const normalized = values.map(value => Math.round(value / total * 100));
      normalized[2] += 100 - normalized.reduce((sum, value) => sum + value, 0);
      focusHeatmap = {
        pasado_problemas: normalized[0],
        presente: normalized[1],
        futuro_soluciones: normalized[2],
      };
    }
  }
  return {
    ...analysis,
    progreso_metas_anteriores: sanitizeArray(analysis.progreso_metas_anteriores),
    patrones_detectados: sanitizeArray(analysis.patrones_detectados),
    inconsistencias_detectadas: sanitizeArray(analysis.inconsistencias_detectadas),
    roleplay_scenarios: sanitizeArray(analysis.roleplay_scenarios),
    nuevos_compromisos: Array.isArray(analysis.nuevos_compromisos) ? analysis.nuevos_compromisos : [],
    focus_heatmap: focusHeatmap,
    metrics: {
      confidence: score(analysis.metrics?.confidence),
      clarity: score(analysis.metrics?.clarity),
      energy: score(analysis.metrics?.energy),
    },
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
  
  const [sessionMode, setSessionMode] = useState<'live' | 'form'>('form');
  const [clientName, setClientName] = useState('');
  const [sessionTopic, setSessionTopic] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState<'positivo' | 'neutral' | 'estrés' | 'motivación' | 'duda' | ''>('');
  const [manualConfidence, setManualConfidence] = useState(0);
  const [manualClarity, setManualClarity] = useState(0);
  const [manualEnergy, setManualEnergy] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const messagesRef = useRef<Message[]>([]);
  const insightCounterRef = useRef(0);
  messagesRef.current = messages;

  useEffect(() => {
    fetchLastSession();
  }, [user]);

  const fetchLastSession = async () => {
    if (!user) return;
    try {
      const [byUser, byCoach] = await Promise.all([
        getDocs(query(collection(db, 'sessions'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'sessions'), where('coachId', '==', user.uid))),
      ]);
      const uniqueDocs = Array.from(new Map(
        [...byUser.docs, ...byCoach.docs].map(sessionDoc => [sessionDoc.id, sessionDoc])
      ).values());
      const sorted: any[] = uniqueDocs.map(sessionDoc => ({
        id: sessionDoc.id,
        ...sessionDoc.data(),
      })).sort((left: any, right: any) => {
        const timeLeft = left.createdAt?.seconds || 0;
        const timeRight = right.createdAt?.seconds || 0;
        return timeRight - timeLeft;
      });
      setLastSession(sorted.length ? sanitizeAnalysis(sorted[0].analysis) : null);
    } catch (error) {
      console.error('Error fetching session history:', error);
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

      const raw = await generateGemini({ model: "gemini-3.5-flash", contents: prompt, config: { responseMimeType: "application/json", maxOutputTokens: 256 } });
      const data = JSON.parse(raw);
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
      const prompt = `Eres Kira Coach, una mentora profesional de coaching y bienestar; no eres una profesional clínica ni debes diagnosticar. 
      Lee la siguiente conversación de coaching en progreso y escribe una única respuesta breve, empática, profunda y relevante de máximo 2 oraciones para guiar al Cliente o responder al Coach.
      No agregues explicaciones, responde directamente en español de manera profesional y sumamente humana.

      CONVERSACIÓN EN PROGRESO:
      ${history}

      Kira Coach:`;

      const aiText = (await generateGemini({ model: "gemini-3.5-flash", contents: prompt, config: { maxOutputTokens: 512 } })).trim();
      if (aiText) {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const aiMessage = { id: crypto.randomUUID(), speaker: 'Coach' as const, text: aiText, timestamp: now };
        messagesRef.current = [...messagesRef.current, aiMessage];
        setMessages(messagesRef.current);
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
        alert("La transcripción de voz no está soportada en este navegador. Usa Chrome, Safari o Edge.");
        return;
      }

      messagesRef.current = [];
      setMessages([]);
      setInsights([]);
      setAnalysis(null);
      insightCounterRef.current = 0;
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
        recognitionRef.current = null;
        console.error("Speech recognition error:", event.error);
        if (event.error === 'not-allowed') {
          alert("Acceso al micrófono denegado. Habilita los permisos en la configuración del navegador.");
        }
        setIsRecording(false);
        setStatus('idle');
      };

      recognition.onend = () => {
        if (recognitionRef.current === recognition) recognitionRef.current = null;
        setIsRecording(false);
        setInterimTranscript('');
        setStatus(current => current === 'running' ? 'idle' : current);
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
              const message = { id: crypto.randomUUID(), speaker: activeSpeaker, text: cleanText, timestamp: now };
              messagesRef.current = [...messagesRef.current, message];
              setMessages(messagesRef.current);
              insightCounterRef.current += 1;
              if (insightCounterRef.current % 4 === 0) triggerRealtimeInsight(cleanText);
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

  const stopSession = async () => {
    setStatus('summarizing');
    const recognition = recognitionRef.current;
    if (recognition) {
      await new Promise<void>(resolve => {
        const previousOnEnd = recognition.onend;
        recognition.onend = (event: any) => {
          previousOnEnd?.(event);
          resolve();
        };
        try { recognition.stop(); } catch { resolve(); }
      });
    }
    setIsRecording(false);
    await generateSummary(messagesRef.current);
  };

  const generateSummary = async (customMessages?: Message[]) => {
    const listToUse = customMessages || messagesRef.current;
    if (!user) return;
    if (listToUse.length === 0) {
      alert("No se ha registrado ninguna transcripción para analizar.");
      setStatus('idle');
      return;
    }
    
    setStatus('summarizing');
    setAnalysis(null);

    const lastSessionSafe = lastSession ? sanitizeAnalysis(lastSession) : null;
    
    const prompt = `Actúa como analista profesional de coaching. Resume evidencias de la transcripción; no hagas diagnósticos clínicos ni afirmes hechos no expresados.
    
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
    3. PROSODIA: No evaluable; solo hay texto, no audio. No infieras tono ni estados clínicos.
    4. ESCENARIOS DE ROLEPLAY: Propón un escenario de simulación.
    5. MANTRA PERSONALIZADO: Genera una frase de poder única.
    6. MAPA DE CALOR DE ENFOQUE: Estima la distribución temática del texto y aclara que no es una medición objetiva.\n    No inventes métricas de confianza, claridad o energía: devuelve null si no fueron evaluadas directamente por el coach.

    Responde ESTRICTAMENTE en este formato JSON:
    {
      "resumen_ejecutivo": "string",
      "progreso_metas_anteriores": ["string"],
      "nuevos_compromisos": [{"tarea": "string", "deadline": "string", "priority": "alta|media|baja"}],
      "patrones_detectados": ["string"],
      "inconsistencias_detectadas": ["string"],
      "prosodic_inference": "No evaluable a partir de texto",
      "roleplay_scenarios": ["string"],
      "personal_mantra": "string",
      "focus_heatmap": { "pasado_problemas": number, "presente": number, "futuro_soluciones": number },
      "metrics": { "confidence": number|null, "clarity": number|null, "energy": number|null },
      "sugerencia_proxima_sesion": "string"
    }`;

    try {
      const raw = await generateGemini({ model: "gemini-3.5-flash", contents: prompt, config: { responseMimeType: "application/json", maxOutputTokens: 1800 } });
      const data = JSON.parse(raw) as LongitudinalAnalysis;
      const sanitizedData = sanitizeAnalysis(data);
      setAnalysis(sanitizedData);
      
      await addDoc(collection(db, 'sessions'), {
        userId: user.uid,
        coachId: user.uid,
        transcript: listToUse,
        analysis: sanitizedData,
        createdAt: serverTimestamp()
      });

      await fetchLastSession();
      setStatus('idle');
    } catch (e) {
      console.error("Error parsing analysis:", e);
      setStatus('idle');
    }
  };

  const handleAnalyzeManualSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!manualTranscript.trim()) {
      alert("Por favor introduce la transcripción real de la sesión.");
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
      - Sentimiento informado por el coach: ${selectedSentiment || 'No informado'}
      - Métricas estimadas por el coach (0 = no evaluada): Confianza: ${manualConfidence || 'No evaluada'}, Claridad: ${manualClarity || 'No evaluada'}, Energía: ${manualEnergy || 'No evaluada'}. Si se informaron, devuelve exactamente esos valores; si no, devuelve null.

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
      3. PROSODIA: No evaluable a partir de texto; no inventes tono ni estados clínicos.
      4. ESCENARIOS DE ROLEPLAY: Propón un escenario de simulación.
      5. MANTRA PERSONALIZADO: Genera una frase de poder única.
      6. MAPA DE CALOR DE ENFOQUE: Estima la distribución temática del texto, no una medición objetiva.\n      No inventes métricas: devuelve null si no fueron evaluadas por el coach.

      Responde ESTRICTAMENTE en este formato JSON:
      {
        "resumen_ejecutivo": "string (debe incluir el hallazgo emocional principal y referirse al cliente por su nombre: ${clientName})",
        "progreso_metas_anteriores": ["string"],
        "nuevos_compromisos": [{"tarea": "string", "deadline": "string", "priority": "alta|media|baja"}],
        "patrones_detectados": ["string"],
        "inconsistencias_detectadas": ["string"],
        "prosodic_inference": "No evaluable con texto",
        "roleplay_scenarios": ["string"],
        "personal_mantra": "string",
        "focus_heatmap": { "pasado_problemas": number, "presente": number, "futuro_soluciones": number },
        "metrics": { "confidence": number|null, "clarity": number|null, "energy": number|null },
        "sugerencia_proxima_sesion": "string"
      }`;

      const raw = await generateGemini({ model: "gemini-3.5-flash", contents: prompt, config: { responseMimeType: "application/json", maxOutputTokens: 1800 } });
      const data = JSON.parse(raw) as LongitudinalAnalysis;
      const sanitizedData = sanitizeAnalysis(data);
      setAnalysis(sanitizedData);
      
      await addDoc(collection(db, 'sessions'), {
        userId: user.uid,
        clientName,
        sessionTopic,
        coachId: user.uid,
        sessionMode: 'manual',
        transcript: manualTranscript.split('\n').map((line, index) => {
          const value = line.trim();
          const match = value.match(/^(Coach|Cliente|Alumno):\s*(.*)$/i);
          if (!value) return null;
          return { id: 'manual-' + index, speaker: match && match[1].toLowerCase() === 'coach' ? 'Coach' : 'Cliente', text: match ? match[2] : value, timestamp: '' };
        }).filter(Boolean),
        analysis: sanitizedData,
        createdAt: serverTimestamp()
      });

    } catch (e: any) {
      console.error("Error parsing analysis:", e);
      alert("Hubo un error al procesar el análisis: " + e.message);
      await fetchLastSession();
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
        
        {/* HEADER */}
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

        {/* SELECTOR DE MODO */}
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

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMNA IZQUIERDA: Transcripción */}
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
                        <option value="">No informado</option>\n                        <option value="estrés">Estrés</option>
                        <option value="positivo">Positivo</option>
                        <option value="neutral">Neutral</option>
                        <option value="motivación">Motivación</option>
                        <option value="duda">Duda</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Confianza ({manualConfidence || "No evaluada"})</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="10" 
                        value={manualConfidence} 
                        onChange={e => setManualConfidence(Number(e.target.value))} 
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Claridad ({manualClarity || "No evaluada"})</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="10" 
                        value={manualClarity} 
                        onChange={e => setManualClarity(Number(e.target.value))} 
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Energía ({manualEnergy || "No evaluada"})</label>
                      <input 
                        type="range" 
                        min="0" 
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
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                    <div 
                      key={m.id}
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
                    </div>
                  ))}
                  {isRecording && (
                    <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce" />
                      <div className="text-xs text-indigo-700 font-medium">
                        {interimTranscript ? `"${interimTranscript}"` : `Escuchando a ${activeSpeaker}...`}
                      </div>
                    </div>
                  )}
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

          {/* COLUMNA DERECHA: Insights */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-3xl p-5 shadow-xl text-white">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-indigo-400">
                <Sparkles size={18} />
                Insights en Tiempo Real
                <span className="ml-auto text-[10px] text-slate-500 font-medium">{insights.length}</span>
              </h3>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {insights.map((insight, idx) => (
                  <div 
                    key={idx}
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
                  </div>
                ))}
                {insights.length === 0 && (
                  <div className="py-8 text-center text-slate-600">
                    <p className="text-sm">Esperando hallazgos...</p>
                    <p className="text-xs text-slate-700 mt-1">Los insights aparecerán aquí automáticamente</p>
                  </div>
                )}
              </div>
            </div>

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
                  <div className="mt-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
                    <p><span className="font-bold">Resumen:</span> {lastSession.resumen_ejecutivo}</p>
                    <p><span className="font-bold">Patrones:</span> {safeJoin(lastSession.patrones_detectados) || 'Ninguno'}</p>
                  </div>
                )}
              </div>
            </div>

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

        {/* ANÁLISIS COMPLETO */}
        {analysis && (
          <div className="space-y-6">
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
                        <div className="text-lg font-black text-slate-800">{m.val === null || m.val === undefined ? "No evaluado" : `${m.val}/10`}</div>
                        <div className={`text-[10px] font-bold uppercase ${m.color}`}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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

              {analysis.personal_mantra && (
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl lg:col-span-2 text-center">
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-200 mb-2">✨ Mantra de Poder Personal</h3>
                  <p className="text-2xl font-serif italic">"{analysis.personal_mantra}"</p>
                </div>
              )}

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
          </div>
        )}

        {status === 'summarizing' && !analysis && (
          <div className="bg-white rounded-3xl p-12 border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <div>
              <p className="font-bold text-slate-800 text-lg">Generando Análisis</p>
              <p className="text-sm text-slate-500">Kira AI está analizando la sesión en profundidad...</p>
            </div>
          </div>
        )}

        <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-100">
          <p>Kira Coach • Inteligencia de Sesión v2.0 • {new Date().getFullYear()}</p>
        </footer>
      </div>
    </div>
  );
}
