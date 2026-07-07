// src/pages/coach/CoachCloudSupport.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { db } from '@/src/firebase';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, getDocs } from 'firebase/firestore';
import { 
  Loader2, Ticket, CheckCircle2, Clock, AlertTriangle, Sparkles, 
  ChevronRight, MessageSquare, Mail, Phone, User, Calendar,
  Plus, X, Edit2, Trash2, Search, Filter, ArrowUp, ArrowDown
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/hooks/useToast';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'content' | 'feature' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  aiDiagnosis?: {
    summary: string;
    steps: string[];
    estimatedResolution: string;
  };
  createdAt: any;
  updatedAt?: any;
  resolvedAt?: any;
  assignedTo?: string;
  coachId: string;
  coachName: string;
  coachEmail: string;
}

export function CoachCloudSupport() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'technical' as const,
    priority: 'medium' as const
  });

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
          updatedAt: data.updatedAt,
          resolvedAt: data.resolvedAt,
          coachId: data.coachId,
          coachName: data.coachName || 'Coach',
          coachEmail: data.coachEmail || ''
        } as SupportTicket);
      });

      // Ordenar: críticos y abiertos primero
      list.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const statusOrder = { open: 0, in_progress: 1, resolved: 2, closed: 3 };
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

  const generateAIDiagnosis = async (ticketId: string, description: string) => {
    setIsGeneratingAI(true);
    try {
      const prompt = `
        Actúa como un agente de soporte técnico especializado de Kira Corp.
        
        Problema reportado por un coach:
        "${description}"
        
        Genera un diagnóstico lógico inicial que incluya:
        1. RESUMEN: Una breve descripción del problema (máximo 50 palabras).
        2. PASOS TÉCNICOS: Una lista de 3-4 pasos concretos para mitigar el incidente.
        3. TIEMPO ESTIMADO: Tiempo estimado de resolución.
        
        Formato JSON: {
          "summary": string,
          "steps": string[],
          "estimatedResolution": string
        }
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
        aiDiagnosis: diagnosis,
        updatedAt: new Date()
      });

      toastSuccess('🤖 Diagnóstico de IA generado');
    } catch (error) {
      console.error("Error generating AI diagnosis:", error);
      toastError('Error al generar diagnóstico');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      const newTicket = {
        coachId: user.uid,
        coachName: user.displayName || 'Coach',
        coachEmail: user.email || '',
        ...formData,
        status: 'open' as const,
        createdAt: new Date(),
        updatedAt: new Date()
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
      
      toastSuccess('✅ Ticket creado exitosamente');
    } catch (error) {
      console.error("Error creating ticket:", error);
      toastError('Error al crear el ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (ticketId: string) => {
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), {
        status: 'resolved',
        resolvedAt: new Date(),
        updatedAt: new Date()
      });
      toastSuccess('✅ Ticket resuelto');
    } catch (error) {
      console.error("Error resolving ticket:", error);
      toastError('Error al resolver el ticket');
    }
  };

  const handleReopen = async (ticketId: string) => {
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), {
        status: 'open',
        resolvedAt: null,
        updatedAt: new Date()
      });
      toastSuccess('🔄 Ticket reabierto');
    } catch (error) {
      console.error("Error reopening ticket:", error);
      toastError('Error al reabrir el ticket');
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (!confirm('¿Estás seguro de eliminar este ticket?')) return;
    try {
      await deleteDoc(doc(db, 'support_tickets', ticketId));
      toastSuccess('🗑️ Ticket eliminado');
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toastError('Error al eliminar el ticket');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'closed': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock size={14} />;
      case 'in_progress': return <Loader2 size={14} className="animate-spin" />;
      case 'resolved': return <CheckCircle2 size={14} />;
      case 'closed': return <XCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Abierto';
      case 'in_progress': return 'En Progreso';
      case 'resolved': return 'Resuelto';
      case 'closed': return 'Cerrado';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical': return <Code size={14} />;
      case 'billing': return <DollarSign size={14} />;
      case 'content': return <FileText size={14} />;
      case 'feature': return <Sparkles size={14} />;
      default: return <MessageSquare size={14} />;
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesFilter = filter === 'all' || t.status === filter;
    const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');

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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Ticket className="text-kirateal" size={24} />
            Cloud Support
            {openTickets.length > 0 && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full animate-pulse">
                {openTickets.length} abiertos
              </span>
            )}
          </h1>
          <p className="text-slate-500 text-sm">Soporte técnico y corporativo con asistencia IA</p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-6 py-3 bg-kirateal text-white rounded-xl font-bold hover:bg-kirateal-dark transition-all shadow-lg shadow-kirateal/20 flex items-center gap-2"
        >
          {isCreating ? <X size={18} /> : <Plus size={18} />}
          {isCreating ? 'Cancelar' : 'Nuevo Ticket'}
        </button>
      </div>

      {/* Formulario de Creación */}
      {isCreating && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-top-4">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-kirateal" />
            Registrar Incidente
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Asunto</label>
              <input
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-kirateal/20 outline-none transition-all"
                placeholder="Breve descripción del problema..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Categoría</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-kirateal/20 outline-none transition-all"
              >
                <option value="technical">Técnico</option>
                <option value="billing">Facturación</option>
                <option value="content">Contenido</option>
                <option value="feature">Sugerencia de Feature</option>
                <option value="other">Otro</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Prioridad</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-kirateal/20 outline-none transition-all"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Descripción Detallada</label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-kirateal/20 outline-none transition-all"
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

      {/* Filtros y búsqueda */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              filter === 'all' ? "bg-white text-kirateal shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            Todos ({tickets.length})
          </button>
          <button
            onClick={() => setFilter('open')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              filter === 'open' ? "bg-white text-kirateal shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            Abiertos ({tickets.filter(t => t.status === 'open').length})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              filter === 'in_progress' ? "bg-white text-kirateal shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            En Progreso ({tickets.filter(t => t.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              filter === 'resolved' ? "bg-white text-kirateal shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            Resueltos ({tickets.filter(t => t.status === 'resolved').length})
          </button>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar tickets..."
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-kirateal/20 outline-none transition-all"
          />
        </div>
      </div>

      {/* Lista de Tickets */}
      {tickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center">
          <Ticket size={48} className="mx-auto mb-4 text-slate-200" />
          <h3 className="text-xl font-bold text-slate-700 mb-2">No hay tickets de soporte</h3>
          <p className="text-slate-500 text-sm">Registra un incidente para obtener asistencia</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Ticket</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Prioridad</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map((ticket) => (
                  <tr 
                    key={ticket.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{ticket.subject}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{ticket.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1",
                        getPriorityColor(ticket.priority)
                      )}>
                        {getCategoryIcon(ticket.category)}
                        {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        ticket.priority === 'critical' ? "text-rose-600" :
                        ticket.priority === 'high' ? "text-orange-600" :
                        ticket.priority === 'medium' ? "text-amber-600" :
                        "text-emerald-600"
                      )}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1",
                        getStatusColor(ticket.status)
                      )}>
                        {getStatusIcon(ticket.status)}
                        {getStatusLabel(ticket.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {ticket.createdAt?.toDate ? 
                        ticket.createdAt.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 
                        'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolve(ticket.id);
                            }}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {ticket.status === 'resolved' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReopen(ticket.id);
                            }}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          >
                            <RefreshCw size={16} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(ticket.id);
                          }}
                          className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                        <ChevronRight size={16} className="text-slate-300" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalle del Ticket */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{selectedTicket.subject}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold",
                    getStatusColor(selectedTicket.status)
                  )}>
                    {getStatusLabel(selectedTicket.status)}
                  </span>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold",
                    getPriorityColor(selectedTicket.priority)
                  )}>
                    {selectedTicket.priority}
                  </span>
                  <span className="text-xs text-slate-400">
                    {selectedTicket.category}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Descripción */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Descripción</h4>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedTicket.description}</p>
              </div>

              {/* Diagnóstico de IA */}
              {selectedTicket.aiDiagnosis ? (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-indigo-600" />
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Diagnóstico de Kira AI</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Resumen</p>
                      <p className="text-sm text-slate-700">{selectedTicket.aiDiagnosis.summary}</p>
                    </div>
                    
                    {selectedTicket.aiDiagnosis.steps && (
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pasos Técnicos Sugeridos</p>
                        <ul className="space-y-1.5">
                          {selectedTicket.aiDiagnosis.steps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                              <span className="text-indigo-500 font-bold">{idx + 1}.</span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {selectedTicket.aiDiagnosis.estimatedResolution && (
                      <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 bg-white/50 rounded-lg px-3 py-1.5 border border-indigo-100">
                        <Clock size={14} />
                        Tiempo estimado: {selectedTicket.aiDiagnosis.estimatedResolution}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => generateAIDiagnosis(selectedTicket.id, selectedTicket.description)}
                  disabled={isGeneratingAI}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingAI ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  Generar Diagnóstico con IA
                </button>
              )}

              {/* Acciones del Ticket */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                  <button
                    onClick={() => {
                      handleResolve(selectedTicket.id);
                      setSelectedTicket(null);
                    }}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Marcar como Resuelto
                  </button>
                )}
                
                {selectedTicket.status === 'resolved' && (
                  <button
                    onClick={() => {
                      handleReopen(selectedTicket.id);
                      setSelectedTicket(null);
                    }}
                    className="px-6 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-all flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Reabrir Ticket
                  </button>
                )}
                
                <button
                  onClick={() => {
                    handleDelete(selectedTicket.id);
                    setSelectedTicket(null);
                  }}
                  className="px-6 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-100 transition-all flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>

              {/* Metadatos */}
              <div className="text-xs text-slate-400 flex items-center gap-4 pt-2 border-t border-slate-100">
                <span>Creado: {selectedTicket.createdAt?.toDate ? 
                  selectedTicket.createdAt.toDate().toLocaleString() : 
                  'N/A'}</span>
                {selectedTicket.resolvedAt && (
                  <span>Resuelto: {selectedTicket.resolvedAt.toDate().toLocaleString()}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
