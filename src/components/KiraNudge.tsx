import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Bell, Zap, Wind, Heart } from 'lucide-react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';

export function KiraNudge() {
  const { user } = useAuth();
  const [nudge, setNudge] = useState<{ message: string; action: string; type: 'prep' | 'check-in' } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (user) {
      generateNudge();
    }
  }, [user]);

  const generateNudge = async () => {
    try {
      const q = query(
        collection(db, 'sessions'),
        where('userId', '==', user?.uid),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      
      // Simulación de datos externos de salud (Apple Health/Google Fit)
      const healthData = { 
        sleep: 5.2, 
        hrv: 35, // Bajo para un adulto promedio
        restingHeartRate: 72,
        stressLevel: 'alto' 
      }; 

      if (!snap.empty) {
        const lastSession = snap.docs[0].data().analysis;
        const transcript = snap.docs[0].data().transcript || [];
        const lastText = transcript.map((t: any) => t.text).join(' ').toLowerCase();

        // 1. MODO DE EMERGENCIA / ALTO ESTRÉS
        if (healthData.stressLevel === 'alto' && (lastText.includes('agobiado') || lastText.includes('presión'))) {
          setNudge({
            message: `Detecto que tu nivel de estrés biológico es alto y mencionaste sentirte presionado. ¿Te parece si posponemos la tarea compleja de hoy y priorizamos recuperar tu centro con una sesión de descarga?`,
            action: "Pausa de Bienestar",
            type: 'check-in'
          });
          setIsVisible(true);
          return;
        }

        // 2. CONTEXTUALIZACIÓN DE SALUD: Sueño reparador
        if (healthData.sleep < 6) {
          setNudge({
            message: `Registros vitales indican descanso de ${healthData.sleep}h. Capacidad cognitiva al 60%. Sugiero reajustar los objetivos diarios para optimizar tu reserva de energía.`,
            action: "Sincronizar Energía",
            type: 'prep'
          });
          setTimeout(() => setIsVisible(true), 2000);
          return;
        }

        // 3. HRV BAJO: Recuperación necesaria
        if (healthData.hrv < 40) {
          setNudge({
            message: "Métricas del HRV sugieren saturación del sistema nervioso. Propongo un 'Quiet Protocol'. ¿Iniciamos una recarga rápida?",
            action: "Iniciar Protocolo",
            type: 'prep'
          });
          setTimeout(() => setIsVisible(true), 4000);
          return;
        }

        const commitment = lastSession.nuevos_compromisos?.[0]?.tarea;
        if (commitment) {
          setNudge({
            message: `Tengo en la memoria tu directiva: "${commitment}". Los niveles son óptimos. ¿Ejecutamos ahora?`,
            action: 'Iniciar Ejecución',
            type: 'prep'
          });
          setTimeout(() => setIsVisible(true), 3000);
        }
      } else {
        // ONBOARDING MÁGICO: Primer contacto para nuevos usuarios
        setNudge({
          message: `Sistemas biométricos y conductuales enlazados. He trazado una proyección de tu potencial y es masiva. ¿Sincronizamos tu primer "Desafío Maestro"?`,
          action: "Activar Evolución",
          type: 'check-in'
        });
        setTimeout(() => setIsVisible(true), 3000);
      }
    } catch (e) {
      console.error("Error generating nudge:", e);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && nudge && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
          className="fixed bottom-32 right-8 z-40 max-w-[340px]"
        >
          <div className="bg-slate-900/95 backdrop-blur-2xl text-white rounded-[32px] p-6 shadow-[0_0_40px_rgba(34,211,238,0.2)] border border-cyan-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 z-20">
              <button onClick={() => setIsVisible(false)} className="text-cyan-500/50 hover:text-cyan-400 transition bg-white/5 rounded-full p-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
                <X size={14} />
              </button>
            </div>

            {/* Glowing Orbs */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-cyan-500/20 rounded-full blur-[50px] group-hover:bg-cyan-400/30 transition-colors duration-1000" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-[50px] group-hover:bg-indigo-400/30 transition-colors duration-1000" />

            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-4 text-cyan-400">
                <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)] relative shrink-0">
                  <Sparkles size={18} />
                  <div className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-20 duration-1000" />
                </div>
                <div>
                   <h4 className="text-[9px] font-mono uppercase tracking-widest text-cyan-200/80 mb-0.5">Transmisión Proactiva</h4>
                   <span className="text-xs font-black uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400">Kira Intel</span>
                </div>
              </div>

              <p className="text-[13px] leading-relaxed text-slate-200 font-medium italic">
                "{nudge.message}"
              </p>

              <div className="flex gap-3 pt-2">
                <button 
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(34,211,238,0.2)] flex items-center justify-center gap-2"
                  onClick={() => setIsVisible(false)}
                >
                  {nudge.type === 'prep' ? <Wind size={14} /> : <Zap size={14} />}
                  {nudge.action}
                </button>
                <button 
                  className="px-5 py-3 rounded-2xl border border-white/10 text-[11px] font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-widest"
                  onClick={() => setIsVisible(false)}
                >
                  Ignorar
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
