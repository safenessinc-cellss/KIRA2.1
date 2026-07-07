import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/firebase';
import { useAuth } from '@/src/hooks/useAuth';
import { useToast } from '@/src/hooks/useToast';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, HelpCircle, Send, Loader2, MessageSquare, 
  Clock, CheckCircle2, AlertCircle, FileText, ChevronRight, User, Laptop 
} from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  category: 'platform' | 'billing' | 'student_issue' | 'other';
  description: string;
  status: 'pending' | 'in_progress' | 'resolved';
  createdAt: any;
  aiResponse?: string;
}

export function CoachCloudSupport() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New ticket form
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'platform' | 'billing' | 'student_issue' | 'other'>('platform');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'support_tickets'), where('coachId', '==', user.uid));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
      
      // Sort: newest first
      list.sort((a,b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setTickets(list);
    } catch (e) {
      console.error("Error fetching support tickets:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject.trim() || !description.trim()) return;
    setIsSubmitting(true);
    try {
      // 1. Ask Gemini to provide immediate response from Kira Corp Support
      const prompt = `Actúa como el Ingeniero Principal de Soporte Técnico y Éxito de Clientes Corporativos de Kira Coach.
      Un Coach asociado ha levantado el siguiente ticket de soporte de nivel crítico:
      
      - Coach: ${user.displayName || 'Asociado'} (${user.email})
      - Asunto: "${subject}"
      - Categoría: "${category}"
      - Descripción del problema: "${description}"
      
      Responde de manera inmediata y profesional (en español). El formato de tu respuesta debe:
      1. Saludar formalmente al Coach por su nombre y validar la prioridad de su caso.
      2. Ofrecer un diagnóstico claro de por qué podría estar ocurriendo la falla (da explicaciones lógicas o técnicas de plataforma si aplica).
      3. Proporcionar un checklist accionable de 3 pasos técnicos detallados para solucionar el inconveniente desde su consola o alternativas recomendadas de soporte.
      4. Indicar que el caso queda asignado a Soporte de Infraestructura bajo prioridad de 15 minutos en lo que realiza las pruebas corporativas.
      
      Mantén el tono corporativo, impecable, proactivo, tranquilizador y de altísima tecnología de Kira Corp.`;

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          contents: prompt
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const aiResponseText = data.text || 'Nuestro equipo técnico está analizando tu solicitud en este preciso instante. Recibirás respuesta oficial en un momento.';

      // 2. Add ticket to Firestore
      const docRef = await addDoc(collection(db, 'support_tickets'), {
        coachId: user.uid,
        subject,
        category,
        description,
        status: 'in_progress', // immediately in progress since AI is analyzing
        aiResponse: aiResponseText,
        createdAt: new Date()
      });

      const newTicket: Ticket = {
        id: docRef.id,
        subject,
        category,
        description,
        status: 'in_progress',
        aiResponse: aiResponseText,
        createdAt: { seconds: Math.floor(Date.now() / 1000) }
      };

      setTickets(prev => [newTicket, ...prev]);
      setSelectedTicket(newTicket);
      
      // Reset form
      setSubject('');
      setDescription('');
      toastSuccess("Ticket registrado. Kira Corp Soporte está atendiendo de inmediato.");
    } catch (e) {
      console.error("Error creating ticket:", e);
      toastError("Error al registrar el ticket de soporte.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 rounded-[40px] border border-slate-200/60 p-8 shadow-sm flex flex-col gap-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="text-emerald-600" size={32} />
          Soporte Corporativo & Kira Direct
        </h2>
        <p className="text-slate-500 font-medium text-sm mt-1">
          Canal exclusivo para Coaches Corporativos de Kira. Soporte directo de infraestructura y plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left: Ticket Form */}
        <div className="xl:col-span-1 bg-white border border-slate-200/60 p-6 rounded-[32px] shadow-sm flex flex-col gap-5">
          <h3 className="text-md font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
            <HelpCircle size={18} className="text-indigo-600" /> Crear Ticket Directo
          </h3>

          <form onSubmit={handleCreateTicket} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Asunto del Problema</label>
              <input
                required
                type="text"
                placeholder="Ej. Error al subir módulo o cobro fallido..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-xs rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Categoría del Caso</label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-xs rounded-xl focus:bg-white outline-none transition cursor-pointer"
              >
                <option value="platform">Plataforma y Funcionalidades</option>
                <option value="billing">Facturación y Cobros Directos</option>
                <option value="student_issue">Inconveniente de Alumno</option>
                <option value="other">Otro Requerimiento Especial</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Descripción Técnica</label>
              <textarea
                required
                rows={5}
                placeholder="Por favor describe detalladamente la situación para que la IA e ingenieros puedan diagnosticar el caso..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-xs rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
              Enviar Ticket Directo
            </button>
          </form>
        </div>

        {/* Center/Right: Tickets Lists & Details */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ticket History */}
          <div className="bg-white border border-slate-200/60 p-6 rounded-[32px] shadow-sm flex flex-col gap-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Historial de Casos ({tickets.length})</span>
            
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" /></div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-3">
                <Laptop className="text-slate-200" size={40} />
                <p className="text-xs text-slate-500 font-bold">Sin tickets abiertos.</p>
                <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                  Todos tus canales de servicio están activos y sin anomalías reportadas.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition ${
                      selectedTicket?.id === t.id 
                        ? 'bg-emerald-50 border-emerald-300' 
                        : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-900 truncate max-w-[150px]">{t.subject}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        t.status === 'resolved' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        <Clock size={8} /> {t.status === 'resolved' ? 'Resuelto' : 'Procesando'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{t.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ticket Conversation Console */}
          <div className="bg-white border border-slate-200/60 p-6 rounded-[32px] shadow-sm flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {selectedTicket ? (
                <motion.div
                  key={selectedTicket.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-5 h-full justify-between"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-black text-slate-950 tracking-tight">{selectedTicket.subject}</h4>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{selectedTicket.category}</span>
                      </div>
                    </div>

                    {/* Coach Original Message */}
                    <div className="flex gap-2.5 items-start">
                      <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                        <User size={14} />
                      </div>
                      <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl text-xs text-slate-800 font-medium leading-relaxed max-w-[90%]">
                        {selectedTicket.description}
                      </div>
                    </div>

                    {/* AI immediate support answer */}
                    {selectedTicket.aiResponse && (
                      <div className="flex gap-2.5 items-start mt-2">
                        <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                          <ShieldCheck size={14} />
                        </div>
                        <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl text-[11px] text-slate-700 font-medium leading-relaxed max-h-[220px] overflow-y-auto whitespace-pre-line max-w-[90%]">
                          {selectedTicket.aiResponse}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span>Prioridad: Nivel 1 Corporativo</span>
                    <button
                      onClick={async () => {
                        const tRef = doc(db, 'support_tickets', selectedTicket.id);
                        await updateDoc(tRef, { status: 'resolved' });
                        setSelectedTicket(prev => prev ? { ...prev, status: 'resolved' } : null);
                        setTickets(prev => prev.map(x => x.id === selectedTicket.id ? { ...x, status: 'resolved' } : x));
                        toastSuccess("Ticket marcado como Resuelto.");
                      }}
                      className="text-emerald-600 hover:text-emerald-800 uppercase tracking-widest"
                    >
                      Marcar Resuelto
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center py-24 flex flex-col items-center gap-3 h-full justify-center">
                  <MessageSquare className="text-slate-200" size={48} />
                  <p className="text-xs text-slate-500 font-bold">Consola de Diálogo Vacía</p>
                  <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed mx-auto">
                    Selecciona un caso del historial para revisar el diagnóstico técnico inteligente y chatear con los ingenieros de Kira.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
