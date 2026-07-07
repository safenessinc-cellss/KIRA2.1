// src/pages/coach/CoachSession.tsx
import React, { useState } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { Brain, Mic, Loader2, FileText, Clock, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';

export function CoachSession() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Simulación de grabación y análisis
  const startSession = () => {
    setIsRecording(true);
    setTranscript('');
    setAnalysis('');
    setSessionDuration(0);

    // Simular duración de la sesión
    const interval = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);

    // Simular transcripción después de 3 segundos
    setTimeout(() => {
      setTranscript(
        'Coach: ¿Cómo te sientes hoy con respecto a tu progreso?\n\n' +
        'Alumno: Me siento bien, pero creo que podría estar avanzando más rápido.\n\n' +
        'Coach: ¿Qué crees que te está frenando?\n\n' +
        'Alumno: Creo que a veces me distraigo con otras tareas y pierdo el foco.\n\n' +
        'Coach: Es normal. Vamos a crear un plan de acción para mejorar tu enfoque.'
      );
      clearInterval(interval);
      setIsRecording(false);
      
      // Iniciar análisis automático
      setIsAnalyzing(true);
      setTimeout(() => {
        setAnalysis(
          '🎯 **Análisis de la Sesión**\n\n' +
          '**Temas clave detectados:**\n' +
          '• Gestión del tiempo y enfoque\n' +
          '• Autopercepción del progreso\n' +
          '• Barreras internas (distracciones)\n\n' +
          '**Recomendaciones:**\n' +
          '1. Implementar la técnica Pomodoro (25 min de trabajo, 5 de descanso)\n' +
          '2. Crear un sistema de recompensas por objetivos cumplidos\n' +
          '3. Establecer metas diarias específicas y medibles\n\n' +
          '**Próximo paso sugerido:**\n' +
          'Agendar sesión de seguimiento en 5 días para evaluar avances.'
        );
        setIsAnalyzing(false);
      }, 2000);
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-3xl border border-slate-200 shadow-sm animate-in fade-in">
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
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
          <Brain size={28} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sesión Inteligente</h1>
          <p className="text-slate-500 text-sm">Transcripción y análisis en tiempo real con IA</p>
        </div>
      </div>

      {/* Estado de la sesión */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-3 h-3 rounded-full",
              isRecording ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
            )} />
            <span className="font-medium text-slate-700">
              {isRecording ? 'Grabando sesión...' : isAnalyzing ? 'Analizando con IA...' : 'Listo para comenzar'}
            </span>
          </div>
          {sessionDuration > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock size={16} />
              <span className="font-mono font-bold">{formatTime(sessionDuration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Botón de inicio */}
      <button
        onClick={startSession}
        disabled={isRecording || isAnalyzing}
        className="w-full py-5 bg-gradient-to-r from-kirateal to-teal-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-kirateal/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRecording ? (
          <>
            <Loader2 size={24} className="animate-spin" />
            Grabando...
          </>
        ) : isAnalyzing ? (
          <>
            <Loader2 size={24} className="animate-spin" />
            Analizando con IA...
          </>
        ) : (
          <>
            <Mic size={24} />
            Iniciar Sesión Inteligente
          </>
        )}
      </button>

      {/* Resultados */}
      {transcript && (
        <div className="mt-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Transcripción */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={18} className="text-kirateal" />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Transcripción</h3>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
                {transcript}
              </p>
            </div>
          </div>

          {/* Análisis de IA */}
          {analysis && (
            <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 shadow-sm animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2 mb-4">
                <Brain size={18} className="text-indigo-600" />
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest">Análisis de Kira AI</h3>
              </div>
              <div className="prose prose-sm max-w-none">
                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
                  {analysis}
                </div>
              </div>
            </div>
          )}

          {/* Acciones post-sesión */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
            <button className="flex-1 px-4 py-3 bg-kirateal text-white rounded-xl font-bold text-sm hover:bg-kirateal-dark transition-all">
              Guardar Sesión
            </button>
            <button className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">
              Enviar al Alumno
            </button>
            <button className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
              Exportar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}