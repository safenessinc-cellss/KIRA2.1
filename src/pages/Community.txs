import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, Send, Globe, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

interface CommunityLink {
  name: string;
  description: string;
  url: string;
  badge: string;
  type: 'whatsapp' | 'telegram' | 'other';
}

export function Community() {
  const { user } = useAuth();
  const [links, setLinks] = useState<CommunityLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'community');
    const unsubscribe = onSnapshot(docRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.links)) {
            setLinks(data.links);
          } else {
            setLinks(getDefaultLinks());
          }
        } else {
          setLinks(getDefaultLinks());
        }
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, 'settings/community');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getDefaultLinks = (): CommunityLink[] => [
    {
      name: 'Comunidad WhatsApp',
      description: 'Soporte estelar, networking y canal oficial de avisos de Kira Moreno.',
      url: 'https://chat.whatsapp.com/GZpEnbI7V64DuKiraCommunity',
      badge: 'Canal Oficial',
      type: 'whatsapp'
    },
    {
      name: 'Telegram de Sabiduría',
      description: 'Píldoras de mentalidad diaria, audios inéditos y dinámicas semanales.',
      url: 'https://t.me/KiraCoachCommunity',
      badge: 'Contenido Exclusivo',
      type: 'telegram'
    }
  ];

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-350">
      {/* Hero Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-indigo-950 border border-teal-500/20 rounded-[40px] p-10 text-white relative overflow-hidden shadow-xl" id="community-hero">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-400/5 rounded-full filter blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-teal-400 tracking-widest bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
            <Sparkles size={11} className="fill-current text-amber-300" /> Conexión Directa
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl text-white font-serif">Comunidad Estelar de Kira</h1>
          <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
            Tu viaje de transformación no se recorre a solas. Únete a las redes de consciencia de Kira Moreno, asiste a las transmisiones en vivo y comparte tu proceso diario con mentes alineadas.
          </p>
        </div>
      </div>

      {/* Grid of Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="community-grid">
        {links.map((link, idx) => {
          const isWhatsApp = link.type === 'whatsapp';
          const isTelegram = link.type === 'telegram';
          
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className="bg-white rounded-[32px] border border-slate-200 p-8 hover:border-teal-500/40 transition-all duration-300 flex flex-col h-full shadow-sm relative overflow-hidden"
              id={`community-card-${idx}`}
            >
              {/* Backglow ornament */}
              <div className={`absolute top-0 right-0 w-40 h-40 ${isWhatsApp ? 'bg-emerald-500/5' : isTelegram ? 'bg-blue-500/5' : 'bg-primary/5'} rounded-full filter blur-3xl pointer-events-none`} />

              <div className="flex items-start justify-between gap-4 mb-6 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md ${
                  isWhatsApp 
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/10' 
                    : isTelegram 
                      ? 'bg-gradient-to-br from-blue-400 to-indigo-600 shadow-blue-500/10' 
                      : 'bg-gradient-to-br from-teal-500 to-cyan-600 shadow-cyan-500/10'
                }`}>
                  {isWhatsApp ? <MessageCircle size={28} /> : isTelegram ? <Send size={24} className="-translate-x-0.5" /> : <Globe size={26} />}
                </div>

                {link.badge && (
                  <span className="text-[9px] font-black uppercase tracking-wider text-teal-600 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full shrink-0">
                    {link.badge}
                  </span>
                )}
              </div>

              <div className="flex-1 relative z-10 space-y-2">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">{link.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  {link.description}
                </p>
              </div>

              <div className="pt-8 mt-auto relative z-10">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full text-center py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isWhatsApp 
                      ? 'bg-[#128c7e] hover:bg-[#075e54] text-white shadow-lg shadow-emerald-600/10' 
                      : isTelegram 
                        ? 'bg-[#0088cc] hover:bg-[#006699] text-white shadow-lg shadow-blue-600/10' 
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                  }`}
                >
                  Entrar a la Comunidad <ExternalLink size={14} />
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Safety & Support Card */}
      <div className="bg-slate-900 text-white rounded-[32px] p-8 border border-slate-800 shadow-xl relative overflow-hidden" id="community-rules">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full filter blur-3xl pointer-events-none animate-pulse" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h4 className="text-lg font-black flex items-center gap-2 text-teal-400">
              <ShieldCheck size={20} /> Normas de la Comunidad de Consciencia
            </h4>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5 leading-relaxed font-semibold">
              <li>El respeto mutuo es el cimiento de nuestra red estelar.</li>
              <li>Toda información compartida por otros miembros en los foros se mantiene totalmente confidencial.</li>
              <li>Evita compartir material que promueva la venta o publicidad no autorizada en estas comunidades.</li>
            </ul>
          </div>
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center space-y-2 max-w-xs w-full shrink-0">
            <h5 className="text-xs font-black text-white uppercase tracking-wider">¿Tienes Dudas?</h5>
            <p className="text-[10px] text-slate-400 font-semibold mb-3">Tu Coach Kira y el equipo de soporte administrativo están aquí.</p>
            <a 
              href="mailto:soporte@kiramoreno.com" 
              className="inline-block text-[10px] bg-teal-500/10 border border-teal-500/20 text-teal-400 px-4 py-2 rounded-lg font-bold uppercase tracking-wider hover:bg-teal-500/20 transition"
            >
              Contactar Soporte
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
