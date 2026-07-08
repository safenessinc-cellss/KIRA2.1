import React, { useState, useEffect, useRef } from 'react';
// Client-side Gemini SDK removed. Requests proxied to the server.
import { collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { Mic, MicOff, Brain, Sparkles, AlertCircle, FileText, Activity, User, MessageSquare, Target, TrendingUp, Zap, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Interfaces for the Session Intelligence
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

export default function SessionIntelligence() {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isPremium, setIsPremium] = useState(true); // Activo por defecto para visualización completa y funcional
  const [messages, setMessages] = useState<Message[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [analysis, setAnalysis] = useState<LongitudinalAnalysis | null>(null);
  const [lastSession, setLastSession] = useState<LongitudinalAnalysis | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'summarizing'>('idle');
  
  // New manual form & simulator states
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
      const prompt = `Actúa como un Psicólogo Organizacional y Coach de Alto Rendimiento. Analiza esta sesión de coaching de Kira Coach.
      
      DATOS GENERALES:
      - Alumno/Cliente: ${clientName}
      - Tema/Intención de la Sesión: ${sessionTopic}
      - Sentimiento Predominante del Alumno: ${selectedSentiment}
      - Métricas estimadas por el coach (1-10): Confianza: ${manualConfidence}, Claridad: ${manualClarity}, Energía: ${manualEnergy}

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
      setAnalysis(data);
      
      // Guardar en Firestore para persistencia
      await addDoc(collection(db, 'sessions'), {
        userId: user.uid,
        clientName,
        sessionTopic,
        coachId: user.uid,
        transcript: manualTranscript,
        analysis: data,
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
        setLastSession(sorted[0].analysis);
      }
    } catch (e) {
      console.error("Error fetching last session:", e);
    }
  };

  // 1. ESTRATEGIA DE TRANSCRIPCIÓN: Configuración de Gemini Live
  const systemInstruction = `
    Eres Kira Coach Engine, un sistema de inteligencia artificial experto en coaching y análisis longitudinal.
    
    CONTEXTO HISTÓRICO:
    ${lastSession ? `
      - Metas anteriores: ${lastSession.progreso_metas_anteriores.join(', ')}
      - Resumen previo: ${lastSession.resumen_ejecutivo}
      - Patrones anteriores: ${lastSession.patrones_detectados.join(', ')}
      PUENTE DE CONTINUIDAD: Inicia la sesión conectando con esto de forma empática.
    ` : 'Esta es la primera sesión. Identifica metas base.'}

    TRANSCRIPCIÓN:
    - Proporciona una transcripción limpia, eliminando muletillas (eh, mm, este, o sea...).
    - Aplica puntuación gramatical automática.

    DIARIZACIÓN:
    - Identifica quién habla: "Coach" o "Cliente".
    - Devuelve el texto precedido por [COACH] o [CLIENTE].

    ANÁLISIS EN TIEMPO REAL:
    - [MOMENTO: descripicón] para hitos emocionales o descubrimientos.
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
    
    const prompt = `Actúa como un Psicólogo Organizacional y Coach de Alto Rendimiento. Analiza esta sesión de coaching de Kira Coach.
    
    HISTORIAL PREVIO (Contexto):
    ${lastSession ? JSON.stringify(lastSession) : 'Sin historial.'}

    TRANSCRIPCIÓN ACTUAL (Con etiquetas de sentimiento por intervención):
    ${messages.map(m => `[${(m as any).sentiment || 'neutral'}] ${m.speaker}: ${m.text}`).join('\n')}

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
      setAnalysis(data);
      
      // Guardar en Firestore
      await addDoc(collection(db, 'sessions'), {
        userId: user.uid,
        coachId: user.uid,
        transcript: messages,
        analysis: data,
        createdAt: serverTimestamp()
      });

      setStatus('idle');
    } catch (e) {
      console.error("Error parsing analysis:", e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 text-left">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Brain size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Inteligencia de Sesión</h1>
            <p className="text-slate-500 text-sm">Análisis y transcripción en tiempo real o simulado con Kira AI</p>
          </div>
        </div>
        
        {sessionMode === 'live' && (
          <button 
            onClick={isRecording ? stopSession : startSession}
            className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-bold transition-all ${
              isRecording 
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 animate-pulse' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200'
            }`}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            {isRecording ? 'Finalizar Sesión' : 'Iniciar Sesión'}
          </button>
        )}
      </header>

      {/* Selector de Modo */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit shadow-sm border border-slate-200/40">
        <button 
          type="button"
          onClick={() => { setSessionMode('form'); setAnalysis(null); }}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            sessionMode === 'form' 
              ? "bg-white text-indigo-600 shadow-sm border border-slate-200/10" 
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText size={14} /> Formulario de Sesión (Manual / Simulado)
        </button>
        <button 
          type="button"
          onClick={() => { setSessionMode('live'); setAnalysis(null); }}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            sessionMode === 'live' 
              ? "bg-white text-indigo-600 shadow-sm border border-slate-200/10" 
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Mic size={14} /> En Vivo (Micrófono)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Panel Izquierdo: Transcripción / Formulario */}
        <div className="lg:col-span-2 space-y-6">
          {sessionMode === 'form' ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col p-8">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <Sparkles className="text-indigo-600" size={20} />
                <h3 className="font-bold text-slate-800 text-lg">Formulario y Registro de Sesión</h3>
              </div>

              <form onSubmit={handleAnalyzeManualSession} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Nombre del Alumno / Cliente</label>
                    <input 
                      type="text" 
                      required 
                      value={clientName} 
                      onChange={e => setClientName(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-slate-800 font-medium" 
                      placeholder="Ej: Sofía Ramírez" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Tema Principal o Intención</label>
                    <input 
                      type="text" 
                      required 
                      value={sessionTopic} 
                      onChange={e => setSessionTopic(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-slate-800 font-medium" 
                      placeholder="Ej: Burnout, Autoestima, Inteligencia Emocional" 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5 px-1">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Diálogo / Transcripción de la Sesión</label>
                    <button 
                      type="button" 
                      onClick={() => setManualTranscript(`Coach: Hola ${clientName}, qué bueno verte hoy. Cuéntame, ¿cuál es el tema principal que te gustaría abordar en nuestra sesión?
Cliente: Hola Coach. La verdad es que me siento sumamente abrumada. En mi trabajo como líder de producto, todo el mundo me pide cosas constantemente, y no sé cómo decir que no. Siento que voy a explotar.
Coach: Lamento que te sientas así. Es un peso enorme. Cuando dices que "no sabes decir que no", ¿qué temores o pensamientos surgen en ti en ese instante?
Cliente: Siento que si digo que no, van a devaluar mi capacidad o mi compromiso. Pero por complacer a todos, me quedo trabajando hasta las 11 de la noche todos los días y mi energía está por el piso.
Coach: Entiendo perfectamente. Es el dilema clásico entre buscar validación externa y proteger tu bienestar. ¿Qué límites consideras que podrías empezar a ensayar esta semana para recuperar tu balance?
Cliente: Podría empezar por silenciar Slack a las 7:00 PM y comprometerme a no responder correos hasta el día siguiente. Es difícil, pero muy necesario.`)}
                      className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-100/50 flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-xl transition-all"
                    >
                      <Sparkles size={11} /> Cargar Diálogo de Ejemplo
                    </button>
                  </div>
                  <textarea 
                    required 
                    value={manualTranscript} 
                    onChange={e => setManualTranscript(e.target.value)} 
                    rows={10} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all outline-none resize-none leading-relaxed text-slate-700" 
                    placeholder="Escribe o pega el diálogo de la sesión aquí. También puedes usar el botón de ejemplo arriba..." 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Sentimiento</label>
                    <select 
                      value={selectedSentiment} 
                      onChange={e => setSelectedSentiment(e.target.value as any)} 
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none"
                    >
                      <option value="estrés">Estrés / Burnout</option>
                      <option value="positivo">Positivo / Optimista</option>
                      <option value="neutral">Neutral / Calmo</option>
                      <option value="motivación">Motivación / Alto</option>
                      <option value="duda">Duda / Incertidumbre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Confianza ({manualConfidence}/10)</label>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={manualConfidence} 
                      onChange={e => setManualConfidence(Number(e.target.value))} 
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-3" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Claridad ({manualClarity}/10)</label>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={manualClarity} 
                      onChange={e => setManualClarity(Number(e.target.value))} 
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-3" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Energía ({manualEnergy}/10)</label>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={manualEnergy} 
                      onChange={e => setManualEnergy(Number(e.target.value))} 
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-3" 
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    type="submit" 
                    disabled={isAnalyzing || !manualTranscript.trim()}
                    className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50 shadow-lg shadow-indigo-100 flex items-center gap-2"
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <Brain size={14} />}
                    {isAnalyzing ? 'Analizando con Kira AI...' : 'Analizar Sesión con Kira AI'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <MessageSquare size={18} className="text-indigo-500" />
                  Transcripción en Vivo
                </h3>
                <div className="flex items-center gap-2">
                  {isRecording && (
                    <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1 rounded-xl text-xs font-bold text-indigo-700 border border-indigo-100">
                      <span className="w-2 h-2 bg-indigo-600 rounded-full animate-ping shrink-0" />
                      Hablando como:
                      <select 
                        value={activeSpeaker} 
                        onChange={e => setActiveSpeaker(e.target.value as any)}
                        className="bg-transparent border-none outline-none font-black text-indigo-800 cursor-pointer p-0 ml-1"
                      >
                        <option value="Cliente" className="bg-white text-slate-700">Cliente (Alumno)</option>
                        <option value="Coach" className="bg-white text-slate-700">Coach (Tú)</option>
                      </select>
                    </div>
                  )}
                  {messages.length > 0 && (
                    <button
                      type="button"
                      disabled={isGeneratingReply}
                      onClick={generateAIPly}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-xl shadow-md shadow-indigo-100 hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isGeneratingReply ? (
                        <>
                          <Loader2 className="animate-spin" size={12} /> Kira pensando...
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} /> Kira Responde (IA)
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                <AnimatePresence>
                  {messages.length === 0 && !isRecording && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 py-20">
                      <div className="p-4 bg-slate-50 rounded-full">
                        <Mic size={32} />
                      </div>
                      <p className="text-sm font-medium text-slate-500 text-center px-6">
                        Presiona "Iniciar Sesión" para comenzar a transcribir con tu micrófono en tiempo real.
                      </p>
                      <button 
                        type="button"
                        onClick={startSession}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition-all shadow-xl shadow-indigo-100 flex items-center gap-2"
                      >
                        <Mic size={14} /> Activar Micrófono
                      </button>
                    </div>
                  )}
                  {messages.map((m) => (
                    <motion.div 
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-4 ${m.speaker === 'Coach' ? 'flex-row' : 'flex-row-reverse text-right'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        m.speaker === 'Coach' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {m.speaker === 'Coach' ? <Brain size={16} /> : <User size={16} />}
                      </div>
                      <div className="space-y-1 max-w-[80%]">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {m.speaker} • {m.timestamp}
                        </div>
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                          m.speaker === 'Coach' ? 'bg-indigo-50 text-indigo-900 rounded-tl-none text-left' : 'bg-amber-50 text-amber-900 rounded-tr-none text-left'
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
                      className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center gap-3 animate-pulse"
                    >
                      <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce shrink-0" />
                      <div className="text-xs text-indigo-700 font-bold italic">
                        {interimTranscript ? `Escuchando a ${activeSpeaker}: "${interimTranscript}"` : `Escuchando como ${activeSpeaker}... Di algo con tu micrófono.`}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Panel Derecho: Insights */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
            {!isPremium && (
              <div className="absolute inset-0 z-10 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 bg-kirateal rounded-full flex items-center justify-center mb-4 shadow-lg shadow-kirateal/20">
                   <Zap size={20} className="text-white" />
                </div>
                <h4 className="text-sm font-bold mb-2">Insights en Tiempo Real</h4>
                <p className="text-[10px] text-slate-400 mb-4 px-4">Detecta hitos psicológicos mientras hablas. Exclusivo para miembros Premium.</p>
                <button onClick={() => setIsPremium(true)} className="bg-kirateal text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Mejorar Plan</button>
              </div>
            )}
            <h3 className="font-bold mb-6 flex items-center gap-2 text-indigo-400">
              <Sparkles size={18} />
              Insights en Real Time
            </h3>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence>
                {insights.map((insight, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-4 rounded-2xl border ${
                      insight.type === 'moment' ? 'border-indigo-500/30 bg-indigo-500/10' :
                      insight.type === 'action' ? 'border-emerald-500/30 bg-emerald-500/10' :
                      'border-amber-500/30 bg-amber-500/10'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${
                         insight.type === 'moment' ? 'bg-indigo-500 text-white' :
                         insight.type === 'action' ? 'bg-emerald-500 text-white' :
                         'bg-amber-500 text-white'
                      }`}>
                        {insight.type === 'moment' ? 'Momento Clave' :
                         insight.type === 'action' ? 'Acción sugerida' : 'Sentimiento'}
                      </span>
                      <span className="text-[10px] text-slate-500">{insight.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {insight.content}
                    </p>
                  </motion.div>
                ))}
                {insights.length === 0 && (
                  <div className="py-12 text-center text-slate-600">
                    <p className="text-sm">Esperando hallazgos...</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Resumen Final & Análisis Longitudinal */}
          {analysis && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {/* Mantra de Poder */}
              {analysis.personal_mantra && (
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-center shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-20"><Sparkles size={40} /></div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-4">Mantra de Poder Personal</h4>
                  <p className="text-xl font-serif italic text-white leading-relaxed">
                    "{analysis.personal_mantra}"
                  </p>
                </div>
              )}

              {/* Mapa de Calor de Enfoque */}
              {analysis.focus_heatmap && (
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-indigo-100/10 relative overflow-hidden">
                  {!isPremium && (
                    <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex items-center justify-center">
                       <span className="bg-white/90 px-4 py-1.5 rounded-full border border-slate-100 text-[10px] font-bold text-slate-500 shadow-sm flex items-center gap-2">
                         <Zap size={10} className="text-kiragold" /> Mapa de Calor Premium
                       </span>
                    </div>
                  )}
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-indigo-600" />
                    Mapa de Calor de Enfoque
                  </h3>
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex mb-4">
                    <div style={{ width: `${analysis.focus_heatmap.pasado_problemas}%` }} className="bg-rose-400 h-full" title="Pasado/Problemas" />
                    <div style={{ width: `${analysis.focus_heatmap.presente}%` }} className="bg-amber-400 h-full" title="Presente" />
                    <div style={{ width: `${analysis.focus_heatmap.futuro_soluciones}%` }} className="bg-emerald-400 h-full" title="Futuro/Soluciones" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[9px] font-bold uppercase tracking-tighter">
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

              {/* Psicología Evolutiva */}
              <div className="bg-slate-900 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
                {!isPremium && (
                  <div className="absolute inset-0 z-10 bg-slate-900/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                    <Brain size={32} className="text-indigo-400 mb-4" />
                    <h4 className="text-sm font-bold mb-1">Análisis Psicodinámico</h4>
                    <p className="text-[9px] text-slate-400 mb-4">Descubre tus patrones invisibles y puntos ciegos.</p>
                    <button onClick={() => setIsPremium(true)} className="bg-white text-slate-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Activar Premium</button>
                  </div>
                )}
                <h3 className="font-bold mb-6 flex items-center gap-2 text-indigo-400">
                  <Brain size={18} />
                  Perfil Psicodinámico
                </h3>
                
                <div className="space-y-6">
                  {analysis.inconsistencias_detectadas && analysis.inconsistencias_detectadas.length > 0 && (
                    <div className="space-y-2">
                       <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                         <AlertCircle size={14} /> Puntos Ciegos
                       </h4>
                       {analysis.inconsistencias_detectadas.map((inc, i) => (
                         <p key={i} className="text-xs text-slate-300 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                           {inc}
                         </p>
                       ))}
                    </div>
                  )}

                  {analysis.prosodic_inference && (
                    <div className="space-y-2">
                       <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                         <Activity size={14} /> Análisis de Seguridad
                       </h4>
                       <p className="text-xs text-slate-300 italic">
                         "{analysis.prosodic_inference}"
                       </p>
                    </div>
                  )}

                  {analysis.roleplay_scenarios && analysis.roleplay_scenarios.length > 0 && (
                    <div className="space-y-2">
                       <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                         <User size={14} /> Preparación de Escenarios
                       </h4>
                       <div className="space-y-2">
                         {analysis.roleplay_scenarios.map((sc, i) => (
                           <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center text-xs">
                             <p>{sc}</p>
                             <button className="bg-indigo-600 px-3 py-1 rounded-lg font-bold text-[10px] hover:bg-indigo-500 transition">Simular</button>
                           </div>
                         ))}
                       </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Métricas de Bienestar */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-indigo-100/10">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Activity size={18} className="text-indigo-600" />
                  Métricas de Evolución
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Confianza', val: analysis.metrics?.confidence || 0, color: 'bg-blue-500' },
                    { label: 'Claridad', val: analysis.metrics?.clarity || 0, color: 'bg-indigo-500' },
                    { label: 'Energía', val: analysis.metrics?.energy || 0, color: 'bg-amber-500' }
                  ].map((m, i) => (
                    <div key={i} className="text-center space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">{m.label}</div>
                      <div className="relative h-12 w-12 mx-auto flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="24" cy="24" r="20" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                          <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={125.6} strokeDashoffset={125.6 * (1 - m.val / 10)} className={m.color.replace('bg-', 'text-')} />
                        </svg>
                        <span className="absolute text-xs font-black text-slate-700">{m.val}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen Ejecutivo */}
              <div className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-xl shadow-indigo-100/20">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-indigo-600" />
                  Memoria de Sesión
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed italic mb-4">
                  "{analysis.resumen_ejecutivo}"
                </p>

                <div className="space-y-4">
                  {analysis.nuevos_compromisos.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Zap size={14} /> Módulo de Acción Proactiva
                      </h4>
                      <div className="space-y-2">
                        {analysis.nuevos_compromisos.map((c, i) => (
                          <div key={i} className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center group">
                            <div className="flex-1">
                              <p className="text-xs font-bold text-emerald-900">{c.tarea}</p>
                              <p className="text-[10px] text-emerald-500">Deadline: {c.deadline}</p>
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
                    <div>
                      <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <History size={14} /> Patrones Detectados
                      </h4>
                      <ul className="space-y-2">
                        {analysis.patrones_detectados.map((p, i) => (
                          <li key={i} className="text-xs text-slate-600 flex gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                             <div className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 shrink-0" />
                             {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Sugerencia Próxima Sesión</h4>
                    <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {analysis.sugerencia_proxima_sesion}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {!analysis && status === 'summarizing' && (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <div>
                <p className="font-bold text-slate-800">Generando Memoria</p>
                <p className="text-xs text-slate-500">Destilando los puntos clave de la conversación...</p>
              </div>
            </div>
          )}
        </div>
      </div>
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
