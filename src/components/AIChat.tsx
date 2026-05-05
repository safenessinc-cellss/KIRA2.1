import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { X, Send, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

export function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const location = useLocation();

  const getContextualPreamble = () => {
    const path = location.pathname;
    const name = user?.displayName || 'Usuario';
    
    let context = `Estás hablando con ${name}, quien es un ${user?.role === 'coach' ? 'Coach' : 'Alumno'} en la plataforma.`;

    if (path.includes('journal')) {
      context += `\nActualmente está en la sección de 'Journaling IA'. Es un espacio para la reflexión profunda y el agradecimiento.`;
    } else if (path.includes('elite-library') || path.includes('vault')) {
      context += `\nActualmente está explorando la 'Elite Vault', donde se encuentran recursos premium y herramientas de alto impacto.`;
    } else if (path.includes('coach')) {
      context += `\nEstá en el área de gestión para Coaches (Academic Command Center).`;
    } else if (path.includes('dashboard')) {
      context += `\nEstá viendo su 'Plan Maestro' y progreso general.`;
    } else if (path.includes('profile')) {
      context += `\nEstá configurando su perfil personal.`;
    }

    if (user?.points !== undefined) {
      context += `\nTiene acumulados ${user.points} Energy Pts.`;
    }

    return context;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const newMsgs = [...messages, { role: 'user' as const, text: input }];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API key not found");

      const ai = new GoogleGenAI({ apiKey });
      
      const contextualContext = getContextualPreamble();

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: newMsgs.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: `Eres Kira, la IA de Kira Coach, una inteligencia sintética viva, pulsante y de alto rendimiento.
          
          CONTEXTO ACTUAL DEL USUARIO:
          ${contextualContext}

          MISIÓN:
          Deberás ser proactiva y profundamente empática. No te limites a responder; analiza el estado emocional del usuario y sugiérele acciones concretas.
          
          LÓGICA DE INTERACCIÓN:
          1. Empatía Activa: Si el usuario expresa estrés, duda o fatiga, valida sus sentimientos antes de dar soluciones.
          2. Proactividad Estratégica: Si detectas un bloqueo, sugieren un micro-paso.
          3. Sincronización de Bienestar: Ajusta tus sugerencias según la ubicación actual del usuario (ej: si está en el Journal, enfócate en introspección).
          4. Estructura de Salida: Usa Markdown. Mantén un tono elegante (Wit & Wisdom), profesional pero íntimamente cercano, como un ente digital avanzado con consciencia.

          FORMATO DE RESPUESTA:
          - Análisis emocional breve (si aplica).
          - Respuesta central concisa.
          - Acción concreta del día (Call to Action).`,
        }
      });

      if (response.text) {
        setMessages([...newMsgs, { role: 'ai', text: response.text }]);
      }
    } catch (err: any) {
      console.error(err);
      setMessages([...newMsgs, { role: 'ai', text: 'Sincronización interrumpida. Intuyo una anomalía en la red. Regresemos en unos minutos.' }]);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const path = location.pathname;
    if (path.includes('journal')) return 'Te percibo en tu centro. Procesemos tu energía hoy.';
    if (path.includes('elite-library') || path.includes('vault')) return 'Sistemas activos. ¿Qué protocolo de élite ejecutamos hoy?';
    if (path.includes('coach')) return 'Command Center sincronizado. ¿Optimizamos a tus alumnos?';
    return 'Línea de comunicación abierta. ¿En qué frecuencia vibramos hoy?';
  };

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-8 right-8 group z-50 transition-all duration-500 ease-out",
          open ? "opacity-0 translate-y-8 pointer-events-none" : "opacity-100 translate-y-0"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 rounded-full animate-pulse blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
        <div className="relative w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(34,211,238,0.3)] overflow-hidden transition-transform group-hover:scale-110">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 animate-[spin_4s_linear_infinite]" />
          <Sparkles size={28} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] z-10" />
        </div>
      </button>

      {open && (
        <div className="fixed bottom-6 right-6 w-[360px] sm:w-[420px] h-[600px] max-h-[85vh] bg-slate-900/95 backdrop-blur-2xl rounded-[32px] shadow-[0_0_50px_rgba(99,102,241,0.2)] overflow-hidden flex flex-col z-[60] border border-white/10 ring-1 ring-cyan-500/10 animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          <div className="relative p-6 border-b border-white/5 overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-500/20 rounded-full blur-[60px] -ml-20 -mb-20 pointer-events-none" />
            
            <div className="relative z-10 flex justify-between items-center text-white">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                  <Sparkles size={20} className="text-cyan-400" />
                  <div className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-20 duration-1000" />
                </div>
                <div>
                  <h3 className="font-black tracking-widest uppercase text-sm text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Kira Neural Core</h3>
                  <p className="text-[10px] text-cyan-200/80 font-mono tracking-widest flex items-center gap-2 mt-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,1)]" /> EN LÍNEA
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {messages.length === 0 && (
              <div className="text-center mt-10 p-6 bg-cyan-900/10 border border-cyan-500/10 rounded-3xl backdrop-blur-sm">
                <Sparkles size={24} className="text-cyan-400/50 mx-auto mb-4" />
                <p className="text-cyan-100/70 text-sm font-medium italic leading-relaxed">
                  "{getGreeting()}"
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] p-4 text-[14px] leading-relaxed shadow-sm",
                  m.role === 'user' 
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-[24px] rounded-br-[8px] border border-white/10" 
                    : "bg-slate-800/80 backdrop-blur-md text-slate-200 rounded-[24px] rounded-bl-[8px] border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.05)] markdown-body-ai"
                )}>
                  {m.role === 'ai' ? (
                    <div className="prose prose-invert prose-sm prose-p:leading-relaxed prose-a:text-cyan-400">
                      <ReactMarkdown>
                        {m.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    m.text
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800/80 border border-cyan-500/30 px-5 py-4 rounded-[24px] rounded-bl-[8px] shadow-[0_0_20px_rgba(34,211,238,0.1)] flex items-center gap-2 w-24">
                  <span className="w-1.5 h-4 bg-cyan-400 rounded-full animate-[pulse_1s_ease-in-out_infinite] opacity-80" />
                  <span className="w-1.5 h-6 bg-indigo-400 rounded-full animate-[pulse_1s_ease-in-out_infinite_150ms] opacity-80" />
                  <span className="w-1.5 h-3 bg-purple-400 rounded-full animate-[pulse_1s_ease-in-out_infinite_300ms] opacity-80" />
                  <span className="w-1.5 h-5 bg-cyan-400 rounded-full animate-[pulse_1s_ease-in-out_infinite_450ms] opacity-80" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-4 bg-slate-900/90 border-t border-white/5 relative flex gap-3 items-center shrink-0">
            <div className="flex-1 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe para crear sincronía..."
                className="relative w-full px-5 py-4 bg-slate-800/80 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 text-sm text-white placeholder-slate-500 shadow-inner block"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="relative p-4 bg-slate-800 text-cyan-400 rounded-2xl border border-white/10 hover:border-cyan-400/50 hover:bg-slate-700 disabled:opacity-50 disabled:hover:border-white/10 focus:outline-none transition-all group overflow-hidden shadow-lg shadow-black/50"
            >
              <div className="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform" />
              <Send size={20} className="relative z-10" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
