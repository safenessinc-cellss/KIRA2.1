import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Send, X, Users, MessageSquareCode, BadgeCheck, Sparkles, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

export function CommunityWidget() {
  const [open, setOpen] = useState(false);

  const communityLinks = [
    {
      name: 'Comunidad WhatsApp',
      description: 'Soporte estelar, networking y canal oficial de avisos de Kira Moreno.',
      url: 'https://chat.whatsapp.com/GZpEnbI7V64DuKiraCommunity',
      color: 'from-emerald-400 to-teal-500 hover:shadow-emerald-500/20',
      icon: <MessageCircle size={20} className="text-white shrink-0" />,
      badge: 'Canal Oficial'
    },
    {
      name: 'Telegram de Sabiduría',
      description: 'Píldoras de mentalidad diaria, audios inéditos y dinámicas semanales.',
      url: 'https://t.me/KiraCoachCommunity',
      color: 'from-blue-400 to-indigo-500 hover:shadow-blue-500/20',
      icon: <Send size={18} className="translate-x-[-1px] text-white shrink-0" />,
      badge: 'Contenido Exclusivo'
    }
  ];

  return (
    <>
      {/* Floating Action Button - Positioned in the Bottom Left to prevent conflict with AI Chat (Bottom Right) */}
      <div className="fixed bottom-8 left-8 z-[100] flex flex-col items-start font-sans">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="mb-4 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-[28px] shadow-[0_20px_50px_rgba(15,23,42,0.3)] overflow-hidden ring-1 ring-teal-500/10"
              id="community-menu"
            >
              {/* Header */}
              <div className="relative p-5 border-b border-white/5 overflow-hidden">
                <div className="absolute top-0 left-0 w-40 h-40 bg-teal-500/10 rounded-full blur-[40px] pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shadow-inner">
                      <Users size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#14b8a6]">Comunidad Estelar</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Sincroniza con personas de alto rendimiento</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Links List */}
              <div className="p-4 space-y-3 relative z-10">
                {communityLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "block p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group",
                      "hover:shadow-lg"
                    )}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={cn(
                        "w-10 h-10 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                        link.color
                      )}>
                        {link.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-100 group-hover:text-teal-400 transition-colors">{link.name}</span>
                          <span className="text-[8px] font-black uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/10">
                            {link.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-1">{link.description}</p>
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-teal-400 mt-2 hover:underline">
                          Unirse ahora <ExternalLink size={10} />
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {/* Informative Footer */}
              <div className="p-4 bg-slate-950/40 border-t border-white/5 text-center text-[10px] text-slate-500 font-medium">
                ✨ Diariamente compartiendo resúmenes, dinámicas y soporte.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trigger Button */}
        <button
          onClick={() => setOpen(!open)}
          className="group relative flex items-center justify-center cursor-pointer"
          id="community-widget"
        >
          {/* Pulse Ripple Rings */}
          <div className="absolute inset-0 bg-teal-400 rounded-full animate-ping opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-indigo-500 rounded-full blur-md opacity-25 group-hover:opacity-55 transition duration-300" />
          
          <div className="relative flex items-center gap-2 bg-slate-900 border border-teal-500/20 px-4 py-3.5 rounded-full shadow-[0_10px_30px_rgba(20,184,166,0.15)] hover:border-teal-400/40 hover:scale-105 transition-all duration-300">
            <Users size={18} className="text-teal-400 animate-pulse" />
            <span className="text-white text-[10px] font-black uppercase tracking-widest leading-none">Comunidad</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] animate-bounce" />
          </div>
        </button>
      </div>
    </>
  );
}
