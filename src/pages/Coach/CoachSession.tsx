// src/pages/coach/CoachSession.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { db } from '@/src/firebase';
import { generateGemini } from '@/src/lib/gemini';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Mic, MicOff, Loader2, Brain, FileText, Clock, Users, 
  ArrowLeft, Download, Share2, Sparkles, AlertCircle,
  CheckCircle2, XCircle, Play, Pause, Volume2, VolumeX
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/hooks/useToast';

interface TranscriptSegment {
  speaker: 'coach' | 'student' | 'unknown';
  text: string;
  timestamp: number;
}

export function CoachSession() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  
  // Estados de grabación
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [transcriptionError, setTranscriptionError] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  
  // Estados de transcripción
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [keyTopics, setKeyTopics] = useState<string[]>([]);
  const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  
  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const transcriptRef = useRef<TranscriptSegment[]>([]);
  const currentTranscriptRef = useRef('');
  const manualNotesRef = useRef('');
  const sessionDurationRef = useRef(0);
  
  // Estado del micrófono
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  
  // Estado de la sesión
  const [sessionTitle, setSessionTitle] = useState('');
  const [studentName, setStudentName] = useState('');
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Keep current values available to asynchronous recorder callbacks.
  transcriptRef.current = transcript;
  currentTranscriptRef.current = currentTranscript;
  manualNotesRef.current = manualNotes;
  sessionDurationRef.current = sessionDuration;

  useEffect(() => () => {
    try { speechRecognitionRef.current?.stop(); } catch {}
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // Timer de duración
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setSessionDuration(prev => {
          const next = prev + 1;
          sessionDurationRef.current = next;
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Solicitar permiso del micrófono al montar
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMicPermission(true);
        stream.getTracks().forEach(track => track.stop());
      } catch {
        setHasMicPermission(false);
      }
    };
    checkMicPermission();
  }, []);

  const startSpeechRecognition = () => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setTranscriptionError('Este navegador no ofrece transcripción automática. Puedes escribir notas manuales debajo.');
      return;
    }
    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'es-ES';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        let interim = '';
        const finalSegments: TranscriptSegment[] = [];
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const spokenText = String(result?.[0]?.transcript || '').trim();
          if (!spokenText) continue;
          if (result.isFinal) {
            finalSegments.push({
              speaker: 'unknown',
              text: spokenText,
              timestamp: sessionDurationRef.current,
            });
          } else {
            interim += spokenText + ' ';
          }
        }
        if (finalSegments.length) {
          transcriptRef.current = [...transcriptRef.current, ...finalSegments];
          setTranscript(transcriptRef.current);
        }
        currentTranscriptRef.current = interim.trim();
        setCurrentTranscript(currentTranscriptRef.current);
      };
      recognition.onerror = (event: any) => {
        if (event?.error && event.error !== 'no-speech' && event.error !== 'aborted') {
          setTranscriptionError('La transcripción automática se interrumpió. Puedes continuar con notas manuales.');
        }
      };
      recognition.onend = () => {
        if (speechRecognitionRef.current === recognition) speechRecognitionRef.current = null;
      };
      speechRecognitionRef.current = recognition;
      recognition.start();
      setTranscriptionError('');
    } catch (error) {
      console.error('Speech recognition could not start:', error);
      setTranscriptionError('No fue posible iniciar la transcripción automática. Puedes escribir notas manuales.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = async () => {
    if (!sessionTitle.trim()) {
      toastError('Por favor, ingresa un título para la sesión');
      return;
    }

    try {
      // Crear sesión en Firestore
      const sessionData = {
        coachId: user?.uid,
        coachName: user?.displayName || 'Coach',
        title: sessionTitle,
        studentName: studentName || 'Alumno',
        status: 'in_progress',
        startedAt: new Date(),
        transcript: [],
        analysis: null,
        createdAt: new Date()
      };
      
      const docRef = await addDoc(collection(db, 'sessions'), sessionData);
      setSessionId(docRef.id);
      sessionIdRef.current = docRef.id;
      
      // Reset session-local state before enabling browser speech recognition.
      setSessionDuration(0);
      sessionDurationRef.current = 0;
      setTranscript([]);
      transcriptRef.current = [];
      setCurrentTranscript('');
      currentTranscriptRef.current = '';
      setManualNotes('');
      manualNotesRef.current = '';
      setAnalysis('');
      setKeyTopics([]);
      setSentiment('neutral');
      setAnalysisError('');
      setTranscriptionError('');
      setIsRecording(true);
      setIsPaused(false);
      setIsSessionStarted(true);
      startSpeechRecognition();
      toastSuccess('Sesión iniciada. ¡Habla con claridad!');
    } catch (error) {
      console.error("Error starting session:", error);
      toastError('Error al iniciar la sesión. Verifica los permisos del micrófono.');
    }
  };

  const pauseSession = () => {
    if (!isRecording) return;
    if (isPaused) {
      setIsPaused(false);
      startSpeechRecognition();
      toastSuccess('Sesión reanudada');
    } else {
      speechRecognitionRef.current?.stop();
      setIsPaused(true);
      toastSuccess('Sesión pausada');
    }
  };

  const stopSession = async () => {
    if (!isRecording) return;
    const recognition = speechRecognitionRef.current;
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
    setIsPaused(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    toastSuccess('Sesión finalizada. Preparando el análisis de la transcripción.');
    await handleSessionComplete();
  };

  const handleSessionComplete = async () => {
    setIsAnalyzing(true);
    setAnalysisError('');
    const savedTranscript = [...transcriptRef.current];
    const interimText = currentTranscriptRef.current.trim();
    if (interimText) {
      savedTranscript.push({ speaker: 'unknown', text: 'Transcripción parcial: ' + interimText, timestamp: sessionDurationRef.current });
    }
    const notes = manualNotesRef.current.trim();
    if (notes) {
      savedTranscript.push({
        speaker: 'unknown',
        text: 'Notas del coach: ' + notes,
        timestamp: sessionDurationRef.current,
      });
    }
    transcriptRef.current = savedTranscript;
    setTranscript(savedTranscript);
    setCurrentTranscript('');
    currentTranscriptRef.current = '';
    const transcriptText = savedTranscript.map(segment => segment.text).join('\n');

    try {
      if (!transcriptText.trim()) {
        setAnalysisError('No se generó análisis: no hay transcripción ni notas de la sesión. El registro se guardó sin inventar contenido.');
        if (sessionIdRef.current) {
          await updateDoc(doc(db, 'sessions', sessionIdRef.current), {
            status: 'completed',
            completedAt: new Date(),
            duration: sessionDurationRef.current,
            transcript: savedTranscript,
            analysis: null,
            audioUrl: null,
            analysisStatus: 'no_transcript',
          });
        }
        return;
      }

      const prompt = `Analiza esta transcripción real de una sesión de coaching. No inventes intervenciones, hechos, diagnósticos ni resultados que no aparezcan en el texto. Si algo no se puede determinar, indícalo. Devuelve únicamente JSON válido con esta estructura: {"summary":"...","keyTopics":["..."],"sentiment":"positive|neutral|negative","recommendations":["..."],"nextSteps":"..."}. Mantén el resumen objetivo y las recomendaciones vinculadas a lo dicho.

TRANSCRIPCIÓN:
${transcriptText}`;

      const raw = await generateGemini({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: { temperature: 0.2, maxOutputTokens: 1800 },
      });

      let parsed: any;
      try {
        const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        parsed = JSON.parse(jsonText);
      } catch {
        parsed = {
          summary: raw.trim(),
          keyTopics: [],
          sentiment: 'neutral',
          recommendations: [],
          nextSteps: 'Revisar manualmente la transcripción y acordar el siguiente paso con el alumno.',
        };
      }

      const analysisResult = {
        summary: String(parsed.summary || raw || 'No se pudo generar un resumen.'),
        keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics.map(String).slice(0, 12) : [],
        sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String).slice(0, 8) : [],
        nextSteps: String(parsed.nextSteps || 'Revisar la transcripción y definir el seguimiento.'),
      };

      setAnalysis(analysisResult.summary);
      setKeyTopics(analysisResult.keyTopics);
      setSentiment(analysisResult.sentiment as 'positive' | 'neutral' | 'negative');

      if (sessionIdRef.current) {
        await updateDoc(doc(db, 'sessions', sessionIdRef.current), {
          status: 'completed',
          completedAt: new Date(),
          duration: sessionDurationRef.current,
          transcript: savedTranscript,
          analysis: analysisResult,
          audioUrl: null,
          analysisStatus: 'completed',
          transcriptionSource: 'browser_speech_recognition_and_manual_notes',
        });
      }
      toastSuccess('Análisis generado a partir de la transcripción real.');
    } catch (error) {
      console.error('Error analyzing real session transcript:', error);
      setAnalysisError('La transcripción quedó disponible, pero KIRA AI no pudo generar el análisis. Puedes intentarlo nuevamente más tarde.');
      if (sessionIdRef.current) {
        try {
          await updateDoc(doc(db, 'sessions', sessionIdRef.current), {
            status: 'completed',
            completedAt: new Date(),
            duration: sessionDurationRef.current,
            transcript: savedTranscript,
            analysis: null,
            audioUrl: null,
            analysisStatus: 'failed',
          });
        } catch (saveError) {
          console.error('Could not save completed session transcript:', saveError);
        }
      }
      toastError('No se pudo completar el análisis con IA.');
    } finally {
      setIsAnalyzing(false);

    }
  };

  const getSentimentEmoji = () => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😟';
      default: return '😐';
    }
  };

  const getSentimentColor = () => {
    switch (sentiment) {
      case 'positive': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'negative': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in">
      {/* Botón de volver */}
      <button
        onClick={() => navigate('/coach')}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-6 text-sm font-medium"
      >
        <ArrowLeft size={16} />
        Volver al Panel
      </button>

      {/* Cabecera */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-kirateal to-teal-500 flex items-center justify-center shadow-lg shadow-kirateal/20">
          <Brain size={28} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sesión Inteligente</h1>
          <p className="text-slate-500 text-sm">Transcripción y análisis en tiempo real con IA</p>
        </div>
      </div>

      {/* Verificar permisos del micrófono */}
      {hasMicPermission === false && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
          <AlertCircle className="text-amber-600" size={20} />
          <div>
            <p className="text-sm font-bold text-amber-700">Permiso de micrófono requerido</p>
            <p className="text-xs text-amber-600">Habilita el acceso al micrófono en la configuración de tu navegador</p>
          </div>
        </div>
      )}

      {/* Configuración de la sesión */}
      {!isSessionStarted ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Configurar Sesión</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Título de la Sesión *
              </label>
              <input
                required
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-kirateal/20 outline-none transition-all"
                placeholder="Ej: Seguimiento de progreso - Semana 3"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Nombre del Alumno (opcional)
              </label>
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-kirateal/20 outline-none transition-all"
                placeholder="Ingresa el nombre del alumno"
              />
            </div>

            <button
              onClick={startSession}
              disabled={!hasMicPermission || !sessionTitle.trim()}
              className="w-full py-4 bg-gradient-to-r from-kirateal to-teal-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-kirateal/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mic size={24} />
              Iniciar Sesión
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Estado de la sesión en vivo */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-4 h-4 rounded-full",
                  isRecording && !isPaused ? "bg-rose-500 animate-pulse" : 
                  isPaused ? "bg-amber-500" : "bg-emerald-500"
                )} />
                <div>
                  <span className="font-bold text-slate-900">
                    {isRecording && !isPaused ? 'Transcribiendo...' : 
                     isPaused ? 'Pausado' : 'Sesión finalizada'}
                  </span>
                  <p className="text-xs text-slate-500">{sessionTitle}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock size={16} />
                  <span className="font-mono font-bold">{formatTime(sessionDuration)}</span>
                </div>
                
                {isRecording && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={pauseSession}
                      className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                    >
                      {isPaused ? <Play size={20} className="text-slate-600" /> : <Pause size={20} className="text-slate-600" />}
                    </button>
                    <button
                      onClick={stopSession}
                      className="p-3 bg-rose-100 hover:bg-rose-200 rounded-xl transition-all"
                    >
                      <XCircle size={20} className="text-rose-600" />
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Transcripción en vivo */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm mb-6 max-h-80 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={18} className="text-kirateal" />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Transcripción en Vivo</h3>
              {isRecording && !isPaused && (
                <span className="ml-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </div>
            
            {transcript.length === 0 ? (
              <p className="text-slate-400 text-sm italic">Esperando voz o notas de la sesión. No se genera contenido de ejemplo.</p>
            ) : (
              <div className="space-y-3">
                {transcript.map((segment, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "p-3 rounded-xl",
                      segment.speaker === 'coach' 
                        ? "bg-kirateal/5 border border-kirateal/10" 
                        : "bg-slate-50 border border-slate-100"
                    )}
                  >
                    <span className="text-xs font-bold text-slate-500">
                      {segment.speaker === 'coach' ? '👤 Coach' : segment.speaker === 'student' ? '🎓 Alumno' : '🗣️ Voz / nota'}
                      <span className="font-normal text-slate-400 ml-2">
                        {formatTime(segment.timestamp)}
                      </span>
                    </span>
                    <p className="text-sm text-slate-700 mt-1">{segment.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentTranscript && (
            <div className="mb-4 rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm text-teal-800">
              <span className="font-semibold">En curso:</span> {currentTranscript}
            </div>
          )}
          {transcriptionError && (
            <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {transcriptionError}
            </div>
          )}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Notas manuales (opcional)</label>
            <textarea
              value={manualNotes}
              onChange={(event) => setManualNotes(event.target.value)}
              rows={3}
              maxLength={12000}
              placeholder="Añade acuerdos, observaciones o puntos que la transcripción automática no haya captado."
              className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
            />
            <p className="mt-2 text-xs text-slate-500">El navegador realiza la transcripción automática; KIRA no almacena la grabación original. Se guardan la transcripción y el análisis textual.</p>
          </div>

          {analysisError && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{analysisError}</div>}

          {/* Análisis de IA */}
          {isAnalyzing ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center">
              <Loader2 className="animate-spin text-kirateal mx-auto mb-4" size={40} />
              <p className="text-slate-600 font-medium">Analizando la sesión con IA...</p>
              <p className="text-xs text-slate-400 mt-1">Esto puede tomar unos segundos</p>
            </div>
          ) : analysis && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl border border-indigo-100 p-6 shadow-sm animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-indigo-600" />
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest">Análisis de Kira AI</h3>
              </div>

              {/* Sentimiento */}
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4 border",
                getSentimentColor()
              )}>
                {getSentimentEmoji()}
                Sentimiento: {sentiment === 'positive' ? 'Positivo' : sentiment === 'negative' ? 'Negativo' : 'Neutral'}
              </div>

              {/* Resumen */}
              <div className="mb-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Resumen</h4>
                <p className="text-sm text-slate-700 leading-relaxed">{analysis}</p>
              </div>

              {/* Temas clave */}
              {keyTopics.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Temas Clave</h4>
                  <div className="flex flex-wrap gap-2">
                    {keyTopics.map((topic, index) => (
                      <span key={index} className="px-3 py-1 bg-white border border-indigo-200 rounded-full text-xs font-bold text-indigo-700">
                        #{topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}


            </div>
          )}
        </>
      )}
    </div>
  );
}
