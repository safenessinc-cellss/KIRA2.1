import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { db } from '@/src/firebase';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { Loader2, Ticket, CheckCircle2, Clock, AlertTriangle, Sparkles, ChevronRight, MessageSquare } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'content' | 'other';
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved';
  aiDiagnosis?: {
    summary: string;
    steps: string[];
  };
  createdAt: any;
  resolvedAt?: any;
}

export function CoachCloudSupport() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'technical' as const,
    priority: 'medium' as const
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [aiDiagnosis, setAiDiagnosis] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'support_tickets'),
      where('coachId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: SupportTicket[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          subject: data.subject || 'Sin asunto',
          description: data.description || '',
          category: data.category || 'other',
          priority: data.priority || 'medium',
          status: data.status || 'open',
          aiDiagnosis: data.aiDiagnosis,
          createdAt: data.createdAt,
          resolvedAt: data.resolvedAt
        } as SupportTicket);
      });

      list.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const statusOrder = { open: 0, in_progress: 1, resolved: 2 };
        if (a.status !== b.status) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setTickets(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tickets:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      const newTicket = {
        coachId: user.uid,
        coachName: user.displayName || 'Coach',
        coachEmail: user.email,
        ...formData,
        status: 'open' as const,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'support_tickets'), newTicket);
      
      // Generar diagnóstico de IA automáticamente
      await generateAIDiagnosis(docRef.id, formData.description);

      setIsCreating(false);
      setFormData({
        subject: '',
        description: '',
        category: 'technical',
        priority: 'medium'
      });
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert("Error al crear el ticket. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateAIDiagnosis = async (ticketId: string, description: string) => {
    try {
      const prompt = `
        Actúa como un agente de soporte técnico especializado de Kira Corp.
        
        Problema reportado por un coach:
        "${description}"
        
        Genera un diagnóstico lógico inicial que incluya:
        1. RESUMEN: Una breve descripción del posible problema (máximo 50 palabras).
        2. PASOS TÉCNICOS: Una lista de 3 pasos concretos que el coach puede intentar para mitigar el incidente mientras se asigna prioridad.
        
        Formato JSON: {"summary": string, "steps": string[]}
      `;

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: { responseMimeType: "application/json" }
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const diagnosis = JSON.parse(data.text || '{}');
      
      await updateDoc(doc(db, 'support_tickets', ticketId), {
        aiDiagnosis: diagnosis
      });
    } catch (error) {
      console.error("Error generating AI diagnosis:", error);
    }
  };

  const handleResolve = async (ticketId: string) => {
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), {
        status: 'resolved',
        resolvedAt: new Date()
      });
    } catch (error) {
      console.error("Error resolving ticket:", error);
      alert("Error al resolver el ticket.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-amber-100 text-amber-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'resolved': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-rose-600';
      case 'medium': return 'text-amber-600';
      case 'low': return 'text-emerald-600';
      default: return 'text-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-kirateal" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-200 gap-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Ticket className="text-kirateal" size={20} />
            Soporte Corporativo & Kira Corp Direct
          </h2>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Reporta incidentes técnicos o de facturación y obtén asistencia inmediata.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 bg-kirateal text-white rounded-xl text-xs font-bold hover:bg-kirateal-dark transition-all"
        >
          {isCreating ? 'Cancelar' : 'Nuevo Ticket'}
        </button>
      </div>

      {/* Formulario de Creación */}
      {isCreating && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-top-4">
          <h3 className="font-bold text-slate-900 mb-4">Registrar Incidente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Asunto</label>
              <input
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-kirateal/20"
                placeholder="Breve descripción del problema..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Categoría</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-kirateal/20"
              >
                <option value="technical">Técnico</option>
                <option value="billing">Facturación</option>
                <option value="content">Contenido</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Prioridad</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-kirateal/20"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Descripción Detallada</label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-kirateal/20"
                placeholder="Describe el problema en detalle..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-kirateal text-white rounded-xl font-bold hover:bg-kirateal-dark transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {isSubmitting ? 'Enviando...' : 'Enviar Ticket'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de Tickets */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 tracking-tight">Mis Tickets</h3>
            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full">
              {tickets.filter(t => t.status !== 'resolved').length} abiertos
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {tickets.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <Ticket size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm font-medium">No hay tickets de soporte</p>
              <p className="text-xs">Registra un incidente para obtener asistencia.</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <MessageSquare size={18} className="text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{ticket.subject}</h4>
                        <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase", getStatusColor(ticket.status))}>
                          {ticket.status === 'open' ? 'Abierto' : ticket.status === 'in_progress' ? 'En Progreso' : 'Resuelto'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{ticket.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                        <span className={cn("font-bold", getPriorityColor(ticket.priority))}>
                          {ticket.priority === 'high' ? '🔴 Alta' : ticket.priority === 'medium' ? '🟡 Media' : '🟢 Baja'}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{ticket.category}</span>
                        <span>•</span>
                        <span>
                          {ticket.createdAt?.toDate ? 
                            ticket.createdAt.toDate().toLocaleDateString() : 
                            'Fecha desconocida'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ticket.status !== 'resolved' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolve(ticket.id);
                        }}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[11px] font-bold hover:bg-emerald-100 transition-all"
                      >
                        <CheckCircle2 size={14} className="inline mr-1" />
                        Resolver
                      </button>
                    )}
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                </div>

                {/* Diagnóstico de IA (expandido) */}
                {selectedTicket?.id === ticket.id && ticket.aiDiagnosis && (
                  <div className="mt-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={16} className="text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Diagnóstico de Kira Corp</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{ticket.aiDiagnosis.summary}</p>
                    {ticket.aiDiagnosis.steps && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-slate-600 mb-1">Pasos técnicos sugeridos:</p>
                        <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                          {ticket.aiDiagnosis.steps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
