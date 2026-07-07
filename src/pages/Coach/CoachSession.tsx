// src/pages/coach/CoachSession.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { db } from '@/src/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { 
  Mic, MicOff, Loader2, Brain, FileText, Clock, Users, 
  ArrowLeft, Download, Share2, Sparkles, AlertCircle,
  CheckCircle2, XCircle, Play, Pause, Volume2, VolumeX
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/hooks/useToast';

interface TranscriptSegment {
  speaker: 'coach' | 'student';
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
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Estados de transcripción
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [keyTopics, setKeyTopics] = useState<string[]>([]);
  const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estado del micrófono
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  // Estado de la sesión
  const [sessionTitle, setSessionTitle] = useState('');
  const [studentName, setStudentName] = useState('');
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Simular transcripción en tiempo real durante la grabación
  useEffect(() => {
    if (isRecording && !isPaused) {
      transcriptIntervalRef.current = setInterval(() => {
        const mockPhrases = [
          'Coach: ¿Cómo te sientes hoy con respecto a tu progreso?',
          'Alumno: Me siento bien, pero creo que podría avanzar más rápido.',
          'Coach: ¿Qué crees que te está frenando?',
          'Alumno: A veces me distraigo con otras tareas.',
          'Coach: Es normal. Vamos a crear un plan de acción.',
          'Alumno: Me gustaría tener más estructura en mi día.',
          'Coach: Excelente. Vamos a trabajar en eso.',
          'Alumno: ¿Qué técnica de enfoque recomiendas?',
          'Coach: La técnica Pomodoro podría funcionar muy bien para ti.'
        ];
        
        const randomPhrase = mockPhrases[Math.floor(Math.random() * mockPhrases.length)];
        const isCoach = randomPhrase.startsWith('Coach:');
        
        setTranscript(prev => [
          ...prev,
          {
            speaker: isCoach ? 'coach' : 'student',
            text: randomPhrase.replace(/^(Coach|Alumno): /, ''),
            timestamp: sessionDuration
          }
        ]);
        
        setCurrentTranscript(randomPhrase);
      }, 3000);
    } else {
      if (transcriptIntervalRef.current) {
        clearInterval(transcriptIntervalRef.current);
        transcriptIntervalRef.current = null;
      }
    }
    
    return () => {
      if (transcriptIntervalRef.current) {
        clearInterval(transcriptIntervalRef.current);
      }
    };
  }, [isRecording, isPaused, sessionDuration]);

  // Timer de duración
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setSessionDuration(prev => prev + 1);
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
      
      // Iniciar grabación
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // Procesar audio al detener
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleSessionComplete(audioBlob);
      };
      
      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsSessionStarted(true);
      toastSuccess('Sesión iniciada. ¡Habla con claridad!');
    } catch (error) {
      console.error("Error starting session:", error);
      toastError('Error al iniciar la sesión. Verifica los permisos del micrófono.');
    }
  };

  const pauseSession = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        toastSuccess('Sesión reanudada');
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        toastSuccess('Sesión pausada');
      }
    }
  };

  const stopSession = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      toastSuccess('Sesión finalizada. Analizando con IA...');
    }
  };

  const handleSessionComplete = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    
    try {
      // Simular análisis de IA
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const analysisResult = {
        summary: 'Sesión enfocada en gestión del tiempo y productividad personal. El alumno muestra conciencia sobre sus distracciones y está abierto a implementar nuevas estrategias.',
        keyTopics: ['Gestión del tiempo', 'Productividad', 'Técnica Pomodoro', 'Distracciones', 'Estructura diaria'],
        sentiment: 'positive' as const,
        recommendations: [
          'Implementar la técnica Pomodoro (25 min de trabajo, 5 de descanso)',
          'Crear un sistema de recompensas por objetivos cumplidos',
          'Establecer metas diarias específicas y medibles',
          'Realizar una auditoría de distracciones digitales'
        ],
        nextSteps: 'Agendar sesión de seguimiento en 5 días para evaluar avances y ajustar estrategias.'
      };
      
      setAnalysis(analysisResult.summary);
      setKeyTopics(analysisResult.keyTopics);
      setSentiment(analysisResult.sentiment);
      
      // Guardar en Firestore
      if (sessionId) {
        await updateDoc(doc(db, 'sessions', sessionId), {
          status: 'completed',
          completedAt: new Date(),
          duration: sessionDuration,
          transcript: transcript,
          analysis: analysisResult,
          audioUrl: null // En producción, subir a Storage
        });
      }
      
      toastSuccess('¡Análisis completado! Revisa los insights generados.');
    } catch (error) {
      console.error("Error analyzing session:", error);
      toastError('Error al analizar la sesión');
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
                    {isRecording && !isPaused ? 'Grabando...' : 
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

            {/* Nivel de audio */}
            {isRecording && !isPaused && (
              <div className="mt-4">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-kirateal to-teal-400 transition-all duration-100"
                    style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
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
              <p className="text-slate-400 text-sm italic">Esperando transcripción...</p>
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
                      {segment.speaker === 'coach' ? '👤 Coach' : '🎓 Alumno'}
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

              {/* Acciones */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-indigo-100">
                <button className="px-4 py-2 bg-kirateal text-white rounded-xl font-bold text-sm hover:bg-kirateal-dark transition-all flex items-center gap-2">
                  <Download size={16} />
                  Guardar Sesión
                </button>
                <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                  <Share2 size={16} />
                  Compartir con Alumno
                </button>
                <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                  <FileText size={16} />
                  Exportar PDF
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
