import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { storage, db, handleFirestoreError, OperationType } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Link, useSearchParams } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { MediaUpload } from '../components/MediaUpload';
import { CoachAnalytics } from '../components/CoachAnalytics';
import { Users, BookOpen, Activity, FileText, UserPlus, Clock, CheckCircle2, AlertTriangle, XCircle, Zap, ShieldCheck, CreditCard, ChevronRight, GraduationCap, Sparkles, Loader2, Layout, Sliders, BarChart3, ShieldAlert, ShoppingBag, FolderTree, GripVertical, Trash2, Upload, ExternalLink, PlusCircle, Video, AlertCircle, Calendar, BadgeCheck, FolderKanban, UploadCloud, Instagram, Linkedin, Twitter, Star, TrendingUp, HeartPulse, Brain, ArrowRight } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../lib/utils';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

type CoachTab = 'vision' | 'tracking' | 'nexus' | 'register' | 'automation' | 'profile' | 'analytics';

export function CoachDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<CoachTab>('vision');

  useEffect(() => {
    if (user) {
      const unsub = onSnapshot(doc(db, 'users', user.uid), (d) => {
        if(d.exists()) setProfile(d.data());
      });
      handlePaymentSuccess();
      return () => unsub();
    }
  }, [user]);

  const handlePaymentSuccess = async () => {
    const success = searchParams.get('success');
    const type = searchParams.get('type');
    const amount = searchParams.get('amount');

    if (success === 'true' && type === 'coach_membership' && user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          membershipStatus: 'active',
          membershipPaidAt: new Date(),
          role: 'coach'
        });
        await addDoc(collection(db, 'transactions'), {
          userId: user.uid,
          amount: Number(amount),
          type: 'coach_membership',
          createdAt: new Date()
        });
        setSearchParams({});
      } catch (e) {
        console.error('Error recording membership success:', e);
      }
    }
  };
  
  const isApproved = profile?.approvalStatus === 'approved';
  const hasMembership = profile?.membershipStatus === 'active';

  const handleMembershipCheckout = async () => {
    if(!user) return;
    try {
      const resp = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          amount: 49.99,
          title: 'Plan Coach PRO (Anual)',
          type: 'coach_membership'
        })
      });
      const { url } = await resp.json();
      window.location.href = url;
    } catch(e) {
      console.error('Membership checkout error:', e);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Header Panel */}
      <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-10 rounded-[40px] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-100/30 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Academic Command Center</h1>
              <p className="text-slate-500 font-medium max-w-lg">Gestión de alto nivel de tu claustro de alumnos y activos digitales.</p>
            </div>
            {!isApproved && (
              <div className="px-6 py-3 bg-amber-50 border border-amber-100 rounded-3xl flex items-center gap-3">
                 <AlertCircle size={20} className="text-amber-500" />
                 <p className="text-xs font-bold text-amber-700 uppercase tracking-tight">Pendiente de Aprobación</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {!hasMembership && isApproved && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -mr-48 -mt-48 transition-transform group-hover:scale-110 duration-700" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-6 border border-white/5">
                Membresía Requerida
              </div>
              <h2 className="text-4xl font-black mb-4 tracking-tighter">Activa tu Plan Coach Pro</h2>
              <p className="text-slate-300 text-lg leading-relaxed">
                Desbloquea el Studio de Cursos, analíticas avanzadas de retención y la pasarela de pagos automatizada.
              </p>
            </div>
            <div className="text-center md:text-right shrink-0">
              <div className="text-5xl font-black mb-6 tracking-tighter">$49.99<span className="text-lg font-normal text-slate-400">/y</span></div>
              <button 
                onClick={handleMembershipCheckout}
                className="px-10 py-5 bg-white text-indigo-950 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition shadow-xl active:scale-95"
              >
                Comenzar Expansión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navegación Modular CRM */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-[32px] w-fit shadow-sm border border-slate-200/50">
        <TabBtn active={activeTab === 'vision'} onClick={() => setActiveTab('vision')} icon={<Layout size={16}/>} label="Visión Global" />
        <TabBtn active={activeTab === 'tracking'} onClick={() => setActiveTab('tracking')} icon={<BadgeCheck size={16}/>} label="Academic Tracking" disabled={!isApproved} />
        <TabBtn active={activeTab === 'nexus'} onClick={() => setActiveTab('nexus')} icon={<FolderKanban size={16}/>} label="Legal & Revenue" disabled={!isApproved} />
        <TabBtn active={activeTab === 'automation'} onClick={() => setActiveTab('automation')} icon={<Zap size={16}/>} label="Kira Flow™" disabled={!isApproved} />
        <TabBtn active={activeTab === 'register'} onClick={() => setActiveTab('register')} icon={<UserPlus size={16}/>} label="Onboarding" disabled={!isApproved} />
        <TabBtn active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<Sliders size={16}/>} label="Configuración" />
        <TabBtn active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<BarChart3 size={16}/>} label="Performance" disabled={!isApproved} />
      </div>

      <div className="flex-1">
        {activeTab === 'vision' && <CoachOverview profile={profile} isApproved={isApproved} />}
        {activeTab === 'tracking' && <CoachStudentsActivity />}
        {activeTab === 'nexus' && <CoachContractManager />}
        {activeTab === 'automation' && <CoachAutomationView />}
        {activeTab === 'register' && <CoachRegisterClient />}
        {activeTab === 'profile' && <CoachProfileSettings profile={profile} />}
        {activeTab === 'analytics' && <CoachAnalytics coachId={user?.uid} />}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label, disabled }: any) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2.5 px-6 py-2.5 rounded-[24px] text-[13px] font-bold tracking-tight transition-all",
        active 
          ? "bg-white text-indigo-600 shadow-sm border border-indigo-50" 
          : "text-slate-500 hover:text-slate-800",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <span className={cn("transition-colors", active ? "text-indigo-600" : "text-slate-400")}>{icon}</span>
      {label}
    </button>
  );
}

function CoachOverview({ profile, isApproved }: any) {
  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Alumnos Totales" value="0" icon={<Users className="text-indigo-600" />} />
        <StatCard title="Ingresos Brutos" value="$0.00" icon={<CreditCard className="text-emerald-600" />} />
        <StatCard title="Energy Points" value="0" icon={<Zap className="text-amber-500" />} />
      </div>

      <div className={cn("bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm", !isApproved && "opacity-50 pointer-events-none")}>
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Acciones Directas</h3>
          <Link to="/coach/courses" className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">
            Studio de Cursos
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/coach/session" className="group">
            <QuickAction title="Sesión Inteligente" desc="Transcripción y análisis IA" icon={<Brain size={24} className="text-indigo-600" />} />
          </Link>
          <QuickAction title="Revisar Tareas" desc="Feedback de módulos" icon={<BookOpen size={24} className="text-amber-500" />} />
          <QuickAction title="AI Audit CRM" desc="Optimizar embudo" icon={<Activity size={24} className="text-rose-500" />} />
          <QuickAction title="Cloud Support" desc="Kira Corp Direct" icon={<ShieldCheck size={24} className="text-emerald-600" />} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:border-violet-200 transition-colors group">
      <div className="flex justify-between items-start mb-6">
        <div className="p-4 rounded-2xl bg-slate-50 group-hover:bg-white transition-colors border border-transparent group-hover:border-slate-100">{icon}</div>
      </div>
      <p className="text-4xl font-black text-slate-900 tracking-tighter">{value}</p>
      <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">{title}</h3>
    </div>
  );
}

function QuickAction({ title, desc, icon }: any) {
  return (
    <div className="flex items-start gap-5 p-6 rounded-[32px] border border-slate-100 hover:bg-white hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/20 transition-all text-left group">
      <div className="p-4 rounded-2xl bg-slate-50 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">{icon}</div>
      <div>
        <h4 className="text-[14px] font-black text-slate-900 tracking-tight leading-tight mb-1">{title}</h4>
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// --- MODULO: ACTIVIDAD DE ALUMNOS (PARA COACH) ---
function CoachStudentsActivity() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [teamSentiment, setTeamSentiment] = useState<{ summary: string, mood: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState('motivacion');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Logic: Find students enrolled in THIS coach's courses
    const fetchStudentsAndJournals = async () => {
      try {
        const coursesQ = query(collection(db, 'courses'), where('coachId', '==', user.uid));
        const coursesSnap = await getDocs(coursesQ);
        const courseIds = coursesSnap.docs.map(d => d.id);

        if (courseIds.length === 0) return;

        const studentsMap = new Map();
        for (const cid of courseIds) {
          const enrollQ = query(collection(db, 'enrollments'), where('courseId', '==', cid));
          const enrollSnap = await getDocs(enrollQ);
          for (const eDoc of enrollSnap.docs) {
            const sId = eDoc.data().userId;
            if (!studentsMap.has(sId)) {
              const sProfile = await getDoc(doc(db, 'users', sId));
              if (sProfile.exists()) {
                studentsMap.set(sId, { id: sId, ...sProfile.data(), courseProgress: eDoc.data().progress || 0 });
              }
            }
          }
        }
        
        const studentsList = Array.from(studentsMap.values());
        setStudents(studentsList);

        // Fetch Journals to analyze team sentiment
        if (studentsList.length > 0) {
          setAnalyzing(true);
          const studentIds = studentsList.map(s => s.id);
          
          let allJournals: string[] = [];
          
          // Firestore 'in' query has a limit of 10, chunk if necessary
          const fetchJournalsChunk = async (ids: string[]) => {
            const q = query(
              collection(db, 'journals'), 
              where('userId', 'in', ids),
              orderBy('createdAt', 'desc'),
              limit(20)
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => d.data().content);
          };

          // Simple chunking up to 10
          if (studentIds.length <= 10) {
              const j = await fetchJournalsChunk(studentIds);
              allJournals = allJournals.concat(j);
          } else {
              const first10 = await fetchJournalsChunk(studentIds.slice(0, 10));
              allJournals = allJournals.concat(first10);
          }

          if (allJournals.length > 0) {
            try {
              const prompt = `Actúa como un psicólogo experto y coach de desempeño. Analiza las siguientes entradas de diario de mis estudiantes:
              [${allJournals.join(" | ")}]
              Devuelve un objeto JSON con dos claves: 
              "summary": un párrafo corto (máx 3 oraciones) resumiendo el estado emocional y actitud predominante del grupo.
              "mood": una sola palabra que los defina ("Positivo", "Neutral", "Estresado", "Frustrado", "Motivado").`;
              
              const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json" }
              });

              if (result.text) {
                 const parsed = JSON.parse(result.text);
                 setTeamSentiment(parsed);
              }
            } catch (error) {
              console.error("AI Analysis error:", error);
            }
          }
          setAnalyzing(false);
        }

      } catch (e) {
        console.error('Fetch Coach Students Error:', e);
        setAnalyzing(false);
      }
    };

    fetchStudentsAndJournals();
  }, [user]);

  const sendBulkMessage = async () => {
    if (!customMessage.trim() || students.length === 0 || !user) return;
    setSending(true);
    try {
      for (const student of students) {
         await addDoc(collection(db, 'notifications'), {
           userId: student.id,
           title: 'Mensaje de tu Coach',
           message: customMessage,
           type: 'coach_message',
           read: false,
           createdAt: new Date()
         });
      }
      setCustomMessage('');
      alert("¡Mensajes enviados exitosamente a todos tus alumnos!");
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (val: string) => {
    setMessageTemplate(val);
    if (val === 'motivacion') setCustomMessage('¡Hola equipo! Recuerden que la constancia vence al talento. Tómense 5 minutos hoy para revisar sus metas. ¡Estoy con ustedes!');
    if (val === 'recordatorio') setCustomMessage('Recordatorio: Tenemos sesión grupal y revisión de avances pronto. Asegúrense de actualizar su progreso de módulos.');
    if (val === 'felicitacion') setCustomMessage('He estado revisando sus avances y estoy increíblemente orgulloso del compromiso de esta semana. ¡Sigan así!');
  };

  const getStatus = (lastActivityAt: any) => {
    if (!lastActivityAt) return { color: 'bg-slate-300', label: 'Sin Datos' };
    const date = lastActivityAt.toDate ? lastActivityAt.toDate() : new Date(lastActivityAt);
    const diffDays = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 3) return { color: 'bg-emerald-500', label: 'Comprometido' };
    if (diffDays < 7) return { color: 'bg-amber-500', label: 'En Riesgo' };
    return { color: 'bg-rose-500', label: 'Desconectado' };
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Team Emotional Insights */}
         <div className="bg-kirateal rounded-2xl p-6 text-white shadow-xl shadow-kirateal/10 col-span-1 md:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
               <Sparkles className="text-amber-300" />
               <h3 className="font-bold text-lg">Termómetro Emocional de Equipo</h3>
            </div>
            {analyzing ? (
               <div className="flex items-center gap-2 text-kirateal-light">
                  <Loader2 size={16} className="animate-spin" /> Analizando diarios y actividad...
               </div>
            ) : teamSentiment ? (
               <div className="relative z-10 animate-in fade-in">
                  <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-4 backdrop-blur-sm">
                    <p className="text-sm leading-relaxed text-white/90">"{teamSentiment.summary}"</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-kirateal-light">
                     Estado Predominante: <span className="bg-white text-kirateal px-3 py-1 rounded-full shadow-sm">{teamSentiment.mood}</span>
                  </div>
               </div>
            ) : (
               <p className="text-indigo-200 text-sm">Aún no hay suficientes diarios de estudiantes para generar el análisis emocional.</p>
            )}
         </div>

         {/* Bulk Messaging Widget */}
         <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm">
            <h3 className="font-bold text-slate-800 tracking-tight flex items-center gap-2 mb-4">
              <Zap size={16} className="text-kiragold" /> Push de Motivación
            </h3>
            <select 
               value={messageTemplate} 
               onChange={(e) => applyTemplate(e.target.value)}
               className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-primary"
            >
               <option value="none">Seleccionar Template (Opcional)</option>
               <option value="motivacion">🔥 Impulso Motivacional</option>
               <option value="recordatorio">📅 Recordatorio de Progreso</option>
               <option value="felicitacion">⭐ Felicitación de Grupo</option>
            </select>
            <textarea
               value={customMessage}
               onChange={(e) => setCustomMessage(e.target.value)}
               placeholder="Escribe tu mensaje masivo..."
               className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs resize-none mb-3 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button 
               onClick={sendBulkMessage}
               disabled={sending || customMessage.trim() === '' || students.length === 0}
               className="w-full py-2.5 bg-primary text-white rounded-lg text-[13px] font-bold shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-auto"
            >
               {sending ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
               Difundir a {students.length} Alumnos
            </button>
         </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-in fade-in">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <GraduationCap size={18} className="text-primary" /> Tracking de Alumnos ({students.length})
          </h3>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estudiante</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progreso Promedio</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Semáforo</th>
              <th className="px-6 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {students.map(s => {
              const status = getStatus(s.lastActivityAt);
              return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {s.displayName?.[0] || 'U'}
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-slate-800">{s.displayName}</div>
                        <div className="text-[10px] text-slate-400">{s.email}</div>
                      </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 max-w-[100px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="bg-primary h-full transition-all" style={{ width: `${s.courseProgress}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600">{s.courseProgress}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full pulse-ping", status.color)} />
                    <span className="text-[11px] font-medium text-slate-600">{status.label}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
          {students.length === 0 && (
            <tr>
              <td colSpan={4} className="py-12 text-center text-slate-400 text-xs italic">
                Aún no tienes alumnos inscritos en tus cursos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// --- MODULO: GESTOR DE CONTRATOS (PARA COACH) ---
function CoachContractManager() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'contracts' | 'templates'>('contracts');
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ title: '', clientName: '', expiresAt: '', templateId: '' });
  const [templateFormData, setTemplateFormData] = useState({ name: '', terms: '', expirationRules: '' });

  useEffect(() => {
    if (!user) return;
    const qC = query(collection(db, 'contracts'), where('coachId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubC = onSnapshot(qC, (snap) => setContracts(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    
    const qT = query(collection(db, 'contract_templates'), where('coachId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubT = onSnapshot(qT, (snap) => setTemplates(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    
    return () => {
      unsubC();
      unsubT();
    };
  }, [user]);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      let finalTerms = '';
      if (formData.templateId) {
        const templ = templates.find(t => t.id === formData.templateId);
        if (templ) finalTerms = templ.terms;
      }

      await addDoc(collection(db, 'contracts'), {
        ...formData,
        terms: finalTerms,
        coachId: user.uid,
        status: 'active',
        expiresAt: new Date(formData.expiresAt),
        createdAt: new Date()
      });
      setIsCreating(false);
      setFormData({ title: '', clientName: '', expiresAt: '', templateId: '' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'contract_templates'), {
        ...templateFormData,
        coachId: user.uid,
        createdAt: new Date()
      });
      setIsCreating(false);
      setTemplateFormData({ name: '', terms: '', expirationRules: '' });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="flex gap-4 p-1 bg-slate-100 rounded-xl w-fit mb-2">
        <button onClick={() => setActiveSubTab('contracts')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", activeSubTab === 'contracts' ? "bg-white text-kirateal shadow-sm" : "text-slate-500")}>Mis Contratos</button>
        <button onClick={() => setActiveSubTab('templates')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", activeSubTab === 'templates' ? "bg-white text-kirateal shadow-sm" : "text-slate-500")}>Plantillas</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText size={18} className="text-primary" /> 
            {activeSubTab === 'contracts' ? 'Gestión de Contratos' : 'Mis Plantillas Maestras'}
          </h3>
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-xl shadow-md shadow-primary/10 active:scale-95 transition-all"
          >
            {isCreating ? 'Cancelar' : activeSubTab === 'contracts' ? 'Generar Contrato' : 'Crear Plantilla'}
          </button>
        </div>

        {isCreating && activeSubTab === 'contracts' && (
          <form onSubmit={handleCreateContract} className="p-6 bg-slate-50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Servicio</label>
              <input required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cliente</label>
              <input required value={formData.clientName} onChange={e=>setFormData({...formData, clientName: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Plantilla</label>
              <select value={formData.templateId} onChange={e=>setFormData({...formData, templateId: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none">
                 <option value="">Ninguna (Texto libre)</option>
                 {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Vencimiento</label>
              <input required type="date" value={formData.expiresAt} onChange={e=>setFormData({...formData, expiresAt: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none" />
            </div>
            <button type="submit" className="lg:col-span-4 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-900 transition-all">Emitir Contrato con Plantilla</button>
          </form>
        )}

        {isCreating && activeSubTab === 'templates' && (
          <form onSubmit={handleCreateTemplate} className="p-6 bg-slate-50 border-b border-slate-100 gap-4 flex flex-col animate-in slide-in-from-top-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre de Plantilla</label>
              <input required value={templateFormData.name} onChange={e=>setTemplateFormData({...templateFormData, name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none" placeholder="Contrato Coach Individual" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Términos y Condiciones</label>
              <textarea required value={templateFormData.terms} onChange={e=>setTemplateFormData({...templateFormData, terms: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none h-32 resize-none" placeholder="Define las cláusulas estándar aquí..." />
            </div>
            <button type="submit" className="py-2.5 bg-kirateal text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-kirateal-light transition-all">Guardar Plantilla Maestra</button>
          </form>
        )}

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeSubTab === 'contracts' && contracts.map(c => (
            <div key={c.id} className="p-5 rounded-2xl border border-slate-100 hover:shadow-xl hover:shadow-slate-100/50 transition-all group flex flex-col justify-between h-40">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-800 text-[14px]">{c.title}</h4>
                  <div className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase", c.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                    {c.status}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 italic">Vence: {c.expiresAt?.toDate?.().toLocaleDateString() || new Date(c.expiresAt).toLocaleDateString()}</p>
                <div className="mt-3 text-[11px] text-slate-600 font-medium">Cliente: {c.clientName}</div>
              </div>
              <div className="flex justify-end pt-4 border-t border-slate-50">
                <button className="text-[11px] font-bold text-primary hover:underline">Auditar Contrato</button>
              </div>
            </div>
          ))}

          {activeSubTab === 'templates' && templates.map(t => (
            <div key={t.id} className="p-5 rounded-2xl border border-slate-100/50 bg-slate-50/30 hover:bg-white hover:border-kirateal/20 transition-all group h-40 flex flex-col justify-between">
              <div>
                 <h4 className="font-bold text-slate-800 text-[14px] mb-2">{t.name}</h4>
                 <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed opacity-70 italic">{t.terms}</p>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Reutilizable</span>
                <button className="text-kirateal text-[11px] font-bold hover:underline">Refinar Cláusulas</button>
              </div>
            </div>
          ))}

          {((activeSubTab === 'contracts' && contracts.length === 0) || (activeSubTab === 'templates' && templates.length === 0)) && !isCreating && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300 gap-4 opacity-40">
              <FileText size={56} className="bg-slate-50 p-3 rounded-full" />
              <p className="text-[13px] font-medium italic">Todo listo para tus documentos legales.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- MODULO: MOTOR DE AUTOMATIZACIÓN (PARA COACH) ---
function CoachAutomationView() {
  const { user } = useAuth();
  const [rules, setRules] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'retencion' | 'ventas' | 'logistica'>('retencion');
  const [newRule, setNewRule] = useState({
    name: '',
    category: 'retencion',
    trigger: 'inactivity',
    threshold: 5,
    action: 'notification',
    message: ''
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'automations'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setRules(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => unsub();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'automations'), {
        ...newRule,
        active: true,
        processedCount: 0,
        ownerId: user.uid,
        createdAt: new Date()
      });
      setIsAdding(false);
      setNewRule({ name: '', category: activeCategory, trigger: 'inactivity', threshold: 5, action: 'notification', message: '' });
    } catch (e) {
      console.error(e);
    }
  };

  const templates = [
    { 
      title: "Reactivación Fantasma", 
      desc: "Si 5 días sin login, enviar push de rescate.", 
      cat: "retencion",
      setup: { trigger: 'inactivity', threshold: 5, message: '¡Te extrañamos! Tu progreso te espera.' }
    },
    { 
      title: "Upsell Strategist", 
      desc: "Si curso completado, ofrecer Mentoría 1-a-1.", 
      cat: "ventas",
      setup: { trigger: 'course_complete', threshold: 0, message: '¡Felicidades! Estás listo para el siguiente nivel. Agenda tu sesión aquí.' }
    },
    { 
      title: "Logística Alpha", 
      desc: "Si 3 tareas pendientes, alerta de bloqueo.", 
      cat: "logistica",
      setup: { trigger: 'pending_tasks', threshold: 3, message: 'Tienes tareas acumuladas. No permitas que el momentum se pierda.' }
    }
  ];

  const filteredRules = rules.filter(r => (r.category || 'retencion') === activeCategory);

  return (
    <div className="flex flex-col gap-10 animate-in fade-in transition-all">
      <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="text-indigo-600" size={20} fill="currentColor" />
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Kira Flow™ Engine</h3>
            </div>
            <p className="text-slate-500 font-medium">El motor conductual que trabaja mientras duermes.</p>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="px-8 py-3.5 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 flex items-center gap-2"
          >
            {isAdding ? <XCircle size={16} /> : <PlusCircle size={16} />}
            {isAdding ? 'Cerrar Constructor' : 'Nueva Regla Conductual'}
          </button>
        </div>

        <div className="flex gap-4 p-1.5 bg-slate-100 rounded-[28px] w-fit mb-10 border border-transparent hover:border-slate-200 transition-all">
          <button onClick={() => setActiveCategory('retencion')} className={cn("px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all", activeCategory === 'retencion' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}>Retención</button>
          <button onClick={() => setActiveCategory('ventas')} className={cn("px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all", activeCategory === 'ventas' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}>Ventas</button>
          <button onClick={() => setActiveCategory('logistica')} className={cn("px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all", activeCategory === 'logistica' ? "bg-white text-amber-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}>Logística</button>
        </div>

        {isAdding ? (
          <form onSubmit={handleCreate} className="mb-12 animate-in slide-in-from-top-6 duration-500">
            <div className="bg-slate-50 border border-slate-100 p-10 rounded-[40px] relative">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                
                {/* IF SECTION */}
                <div className="md:col-span-5 flex flex-col gap-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-widest w-fit">
                    TRIGGER (IF)
                  </div>
                  <div className="space-y-4">
                    <select 
                      value={newRule.trigger} 
                      onChange={e => setNewRule({...newRule, trigger: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                    >
                      <option value="inactivity">El Alumno está Inactivo</option>
                      <option value="course_complete">El Alumno Completa un Curso</option>
                      <option value="pending_tasks">El Alumno tiene Tareas Pendientes</option>
                      <option value="low_sentiment">Estado de Ánimo Detectado: Bajo</option>
                    </select>
                    
                    <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4">
                       <span className="text-xs font-bold text-slate-400 uppercase">Durante ≥</span>
                       <input 
                         type="number" 
                         value={newRule.threshold} 
                         onChange={e => setNewRule({...newRule, threshold: parseInt(e.target.value)})}
                         className="w-20 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-center font-black text-slate-900 outline-none" 
                       />
                       <span className="text-xs font-bold text-slate-400 uppercase">Unidades</span>
                    </div>
                  </div>
                </div>

                {/* ARROW */}
                <div className="md:col-span-2 flex justify-center py-6">
                  <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-2xl">
                    <ChevronRight size={24} />
                  </div>
                </div>

                {/* THEN SECTION */}
                <div className="md:col-span-5 flex flex-col gap-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 rounded-full text-emerald-600 text-[10px] font-black uppercase tracking-widest w-fit">
                    ACTION (THEN)
                  </div>
                  <div className="space-y-4">
                    <select 
                      value={newRule.action} 
                      onChange={e => setNewRule({...newRule, action: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                    >
                      <option value="notification">Enviar Notificación Push (Kira)</option>
                      <option value="email">Desparar Email Automatizado</option>
                      <option value="add_points">Otorgar Extra Energy Pts</option>
                      <option value="alert_coach">Alertar a mi Command Center</option>
                    </select>
                    <textarea 
                      required 
                      value={newRule.message} 
                      onChange={e => setNewRule({...newRule, message: e.target.value})}
                      className="w-full h-24 bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium resize-none focus:bg-white outline-none" 
                      placeholder="Escribe el mensaje o instrucciones..."
                    />
                  </div>
                </div>

              </div>
              
              <div className="mt-10 pt-10 border-t border-slate-200 flex justify-between items-center">
                 <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre de la Regla</label>
                    <input 
                      required 
                      value={newRule.name} 
                      onChange={e => setNewRule({...newRule, name: e.target.value})}
                      className="bg-transparent border-b-2 border-slate-200 text-lg font-black text-slate-800 outline-none focus:border-indigo-500 transition-colors" 
                      placeholder="Ej: Reactivación 5 Días" 
                    />
                 </div>
                 <button type="submit" className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all">
                    Inyectar Regla al Motor
                 </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRules.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[40px] text-slate-300">
                <Zap size={64} className="mb-6 opacity-20" />
                <p className="text-lg font-black tracking-tight mb-2">El motor está esperando órdenes</p>
                <p className="text-sm font-medium text-slate-400 italic">No hay reglas activas en la categoría {activeCategory}.</p>
              </div>
            ) : (
              filteredRules.map(rule => (
                <div key={rule.id} className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm hover:shadow-xl hover:shadow-slate-100/50 transition-all group flex flex-col justify-between border-b-4 border-b-indigo-500/10 hover:border-b-indigo-500">
                   <div>
                     <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                           <Activity size={20} />
                        </div>
                        <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", rule.active ? "bg-emerald-50 text-emerald-500" : "bg-slate-50 text-slate-400")}>
                           {rule.active ? 'Running' : 'Paused'}
                        </div>
                     </div>
                     <h4 className="text-base font-black text-slate-900 tracking-tight leading-tight mb-2">{rule.name}</h4>
                     <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mb-6">
                       <Clock size={12} /> {rule.trigger === 'inactivity' ? `IF Inactivo > ${rule.threshold} días` : 'Condición Especial'}
                     </div>
                     <div className="p-4 bg-slate-50 rounded-2xl text-[11px] text-slate-600 font-medium leading-relaxed italic mb-8">
                       "{rule.message}"
                     </div>
                   </div>
                   <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Impacto</span>
                         <span className="text-xl font-black text-slate-900">{rule.processedCount || 0}</span>
                      </div>
                      <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all">
                         <Trash2 size={16} />
                      </button>
                   </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-9">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-4">Plantillas Sugeridas (Zero Start)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {templates.map((t, idx) => (
                 <div 
                   key={idx} 
                   onClick={() => {
                     setNewRule({ ...newRule, name: t.title, category: t.cat, trigger: t.setup.trigger, threshold: t.setup.threshold, message: t.setup.message });
                     setActiveCategory(t.cat as any);
                     setIsAdding(true);
                   }}
                   className="bg-white p-8 rounded-[32px] border border-slate-200 hover:border-violet-300 shadow-sm transition-all cursor-pointer group text-left"
                 >
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform", 
                      t.cat === 'retencion' ? "bg-indigo-50 text-indigo-600" : t.cat === 'ventas' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                       <Sparkles size={24} />
                    </div>
                    <h5 className="font-black text-slate-900 tracking-tight leading-tight mb-2">{t.title}</h5>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">{t.desc}</p>
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                       Usar Plantilla <ArrowRight size={12} />
                    </div>
                 </div>
               ))}
            </div>
         </div>
         <div className="lg:col-span-3">
            <div className="bg-indigo-900 p-8 rounded-[40px] text-white h-full shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 duration-700 group-hover:scale-150" />
               <div className="relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <h5 className="text-xl font-black tracking-tight mb-4 leading-tight">Optimiza el LTV con Kira Analytics</h5>
                    <p className="text-indigo-200 text-sm leading-relaxed mb-8">
                       Detectamos que el 40% de las ventas ocurren tras la automatización de la "Bóveda Élite".
                    </p>
                  </div>
                  <button className="w-full py-4 bg-white/10 hover:bg-white text-indigo-900 border border-white/20 hover:border-white rounded-2xll text-[10px] font-black uppercase tracking-widest transition-all">
                     Ver Reporte IA
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
function CoachRegisterClient() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', courseId: '' });
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const q = query(collection(db, 'courses'), where('coachId', '==', user.uid));
      const snap = await getDocs(q);
      setCourses(snap.docs.map(d => ({id: d.id, ...d.data()})));
    };
    fetch();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create User Document (or Update if exists - simplified for demo: always create reference)
      const userRef = await addDoc(collection(db, 'users'), {
        displayName: formData.name,
        email: formData.email,
        role: 'alumno',
        createdAt: new Date(),
        registeredByCoach: user?.uid,
        points: 0,
        status: 'awaiting_login'
      });

      // 2. Enroll in course if selected
      if (formData.courseId) {
        await addDoc(collection(db, 'enrollments'), {
          userId: userRef.id,
          courseId: formData.courseId,
          progress: 0,
          enrolledAt: new Date()
        });
      }

      // 3. Create initial notification
      await addDoc(collection(db, 'notifications'), {
        userId: userRef.id,
        title: '¡Bienvenido a Kira Coach!',
        message: `Has sido registrado por tu coach. Completa tu primer diario hoy.`,
        read: false,
        createdAt: new Date(),
        type: 'system'
      });

      setSuccess(true);
      setFormData({ name: '', email: '', courseId: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Error registrando alumno.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl bg-white rounded-2xl border border-slate-200 p-8 animate-in zoom-in-95 duration-200">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Registro Manual de Alumno</h3>
        <p className="text-[13px] text-slate-500 mt-1">Registra a un cliente externo y otórgale acceso inmediato a tus planes.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Nombre Completo</label>
          <input 
            required
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            placeholder="Ej: Juan Pérez"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Correo Electrónico</label>
          <input 
            required
            type="email"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            placeholder="juan@ejemplo.com"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Asignar a Curso (Opcional)</label>
          <select 
            value={formData.courseId}
            onChange={e => setFormData({...formData, courseId: e.target.value})}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Ninguno</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mt-4 active:scale-95 disabled:opacity-50"
        >
          {loading ? "Procesando..." : success ? <><CheckCircle2 size={18}/> ¡Registrado!</> : "Dar de Alta"}
        </button>
      </form>
    </div>
  );
}
// --- COMPONENTE DE ANALÍTICAS ---
function CoachAnalyticsOld({ coachId }: { coachId?: string }) {
  const [stats, setStats] = useState({
    views: 0,
    favorites: 0,
    enrollments: 0,
    zapsGenerated: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId) return;

    const fetchStats = async () => {
      try {
        // 1. Get views from coach doc
        const coachDoc = await getDoc(doc(db, 'users', coachId));
        const views = coachDoc.data()?.viewCount || 0;

        // 2. Get favorites count by querying users
        const favsQuery = query(collection(db, 'users'), where('favorites', 'array-contains', coachId));
        const favsSnap = await getDocs(favsQuery);
        const favorites = favsSnap.size;

        // 3. Get enrollments for this coach's courses
        const coursesQuery = query(collection(db, 'courses'), where('coachId', '==', coachId));
        const coursesSnap = await getDocs(coursesQuery);
        const coachCourseIds = coursesSnap.docs.map(d => d.id);
        
        let enrollments = 0;
        if (coachCourseIds.length > 0) {
           const enrollQuery = query(collection(db, 'enrollments'), where('courseId', 'in', coachCourseIds));
           const enrollSnap = await getDocs(enrollQuery);
           enrollments = enrollSnap.size;
        }

        setStats({
          views,
          favorites,
          enrollments,
          zapsGenerated: Math.floor(views * 1.5 + enrollments * 10) // Simulated Zaps impact
        });
      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [coachId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="animate-spin text-kirateal" size={32} />
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
         <h3 className="text-xl font-black text-slate-800 tracking-tight">Analíticas Élite</h3>
         <p className="text-sm text-slate-500 mt-1">Monitorea el impacto de tu consciencia en la comunidad.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
         <AnalyticsStatCard 
           icon={<Activity className="text-sky-500" />} 
           label="Vistas de Perfil" 
           value={stats.views} 
           trend="+12%" 
           color="sky" 
         />
         <AnalyticsStatCard 
           icon={<HeartPulse className="text-rose-500" />} 
           label="Favoritos" 
           value={stats.favorites} 
           trend="+5" 
           color="rose" 
         />
         <AnalyticsStatCard 
           icon={<GraduationCap className="text-indigo-500" />} 
           label="Alumnos Inscritos" 
           value={stats.enrollments} 
           trend="+2" 
           color="indigo" 
         />
         <AnalyticsStatCard 
           icon={<Sparkles className="text-kiragold" />} 
           label="Impacto (Zaps)" 
           value={stats.zapsGenerated} 
           trend="Epic" 
           color="gold" 
         />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8">
         <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-kirateal/10 rounded-lg text-kirateal">
               <TrendingUp size={20} />
            </div>
            <h4 className="font-bold text-slate-800">Rendimiento de Contenido</h4>
         </div>
         <p className="text-slate-500 text-sm italic py-10 text-center border-2 border-dashed border-slate-100 rounded-xl">
           Gráficas de retención y engagement próximamente disponibles en Kira Analytics 2.0.
         </p>
      </div>
    </div>
  );
}

function AnalyticsStatCard({ icon, label, value, trend, color }: any) {
  const colors: any = {
    sky: "bg-sky-50 text-sky-600",
    rose: "bg-rose-50 text-rose-600",
    indigo: "bg-indigo-50 text-indigo-600",
    gold: "bg-kiragold/10 text-kiragold"
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
       <div className="flex justify-between items-start mb-4">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors[color])}>
             {icon}
          </div>
          <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", colors[color])}>{trend}</span>
       </div>
       <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
       <h4 className="text-2xl font-black text-slate-900">{value.toLocaleString()}</h4>
    </div>
  );
}

function CoachProfileSettings({ profile }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    specialty: profile?.specialty || '', // Keep this for backward compatibility if it's a string, we'll convert it
    specialties: Array.isArray(profile?.specialties) ? profile.specialties : (profile?.specialty ? [profile.specialty] : []),
    bio: profile?.bio || '',
    photoURL: profile?.photoURL || '',
    calendlyUrl: profile?.calendlyUrl || '',
    experienceLevel: profile?.experienceLevel || 'Principiante',
    languages: profile?.languages || 'Español',
    welcomeVideoUrl: profile?.welcomeVideoUrl || '',
    rating: profile?.rating || 5,
    studentCount: profile?.studentCount || 0,
    socialLinks: {
      instagram: profile?.socialLinks?.instagram || '',
      linkedin: profile?.socialLinks?.linkedin || '',
      twitter: profile?.socialLinks?.twitter || ''
    }
  });

  const specialtiesList = [
    'Mindfulness', 'Life Coaching', 'Business Coaching', 'Art Therapy', 
    'Nutrition', 'Fitness', 'Spiritual Guidance', 'Career Counseling',
    'Psicoterapia', 'Yoga', 'Meditación', 'Liderazgo'
  ];

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/?coach=${user?.uid || ''}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const [mediaItems, setMediaItems] = useState<{type: string, url: string, title: string, pointCost?: number}[]>(profile?.mediaItems || []);
  const [newMedia, setNewMedia] = useState({ type: 'video', url: '', title: '', pointCost: 10 });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        specialty: profile.specialty || '',
        specialties: Array.isArray(profile.specialties) ? profile.specialties : (profile.specialty ? [profile.specialty] : []),
        bio: profile.bio || '',
        photoURL: profile.photoURL || '',
        calendlyUrl: profile.calendlyUrl || '',
        experienceLevel: profile.experienceLevel || 'Principiante',
        languages: profile.languages || 'Español',
        welcomeVideoUrl: profile.welcomeVideoUrl || '',
        rating: profile.rating || 5,
        studentCount: profile.studentCount || 0,
        socialLinks: {
          instagram: profile.socialLinks?.instagram || '',
          linkedin: profile.socialLinks?.linkedin || '',
          twitter: profile.socialLinks?.twitter || ''
        }
      });
      setMediaItems(profile.mediaItems || []);
    }
  }, [profile]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMediaItems((items) => {
        const oldIndex = items.findIndex((i, idx) => `${i.title}-${idx}` === active.id);
        const newIndex = items.findIndex((i, idx) => `${i.title}-${idx}` === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const validate = () => {
    // Robust URL regex
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i;
    const photoRegex = /\.(jpeg|jpg|gif|png|webp|svg)((\?.*)?|$)/i;
    const calendlyRegex = /calendly\.com\/[a-zA-Z0-9_\-]+(\/[a-zA-Z0-9_\-]+)?/i;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    const vimeoRegex = /^(https?:\/\/)?(www\.)?(vimeo\.com)\/.+$/;

    if (!formData.displayName.trim()) return "El nombre público es obligatorio.";
    if (formData.specialties.length === 0) return "Debes seleccionar al menos una especialidad profesional.";
    
    // Bio validation (strip HTML tags to check if there is actual text)
    const bioText = formData.bio.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
    if (!bioText) return "La biografía es obligatoria para presentarte ante tus alumnos.";
    
    if (formData.photoURL) {
      if (!urlRegex.test(formData.photoURL)) return "El formato de la URL de la foto no es válido.";
      if (!photoRegex.test(formData.photoURL) && !formData.photoURL.includes('firebasestorage.googleapis.com')) {
         return "La URL de la foto debe terminar en una extensión de imagen válida (jpg, png, etc.) o ser de Firebase Storage.";
      }
    }
    
    if (formData.calendlyUrl) {
      if (!calendlyRegex.test(formData.calendlyUrl)) {
        return "El enlace de Calendly no tiene un formato válido (ej: calendly.com/tu-usuario).";
      }
    }

    if (formData.welcomeVideoUrl) {
      const isDirectVideo = urlRegex.test(formData.welcomeVideoUrl) && 
        (formData.welcomeVideoUrl.match(/\.(mp4|webm|ogg)$/i) || formData.welcomeVideoUrl.includes('firebasestorage.googleapis.com'));
      const isYoutube = youtubeRegex.test(formData.welcomeVideoUrl);
      const isVimeo = vimeoRegex.test(formData.welcomeVideoUrl);

      if (!isDirectVideo && !isYoutube && !isVimeo) {
        return "El video de bienvenida debe ser una URL válida (Directa .mp4, YouTube o Vimeo).";
      }
    }

    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError(null);

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        mediaItems,
        updatedAt: new Date()
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAiMediaSuggestion = async () => {
    if (!newMedia.title) {
      setError("Por favor, introduce un título para que Kira pueda analizarlo.");
      return;
    }
    setUploading('resource'); // Reuse uploading state for UX
    try {
      const prompt = `Analiza este recurso educativo para un coach: "${newMedia.title}".
      Determina el tipo más probable (video, pdf, imagen) y sugiere un costo en puntos (valor percibido del 1 al 100).
      
      Coach Profile Context: ${formData.specialties.join(', ')}
      
      Responde estrictamente en JSON: {"type": "video|pdf|imagen", "pointCost": number, "explanation": "Breve razón"}`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(result.text || '{}');
      setNewMedia(prev => ({ 
        ...prev, 
        type: data.type || 'video', 
        pointCost: data.pointCost || 10 
      }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'welcome' | 'resource') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(type);
    setError(null);

    try {
      const storageRef = ref(storage, `coaches/${user.uid}/${type}_${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(uploadResult.ref);
      
      if (type === 'photo') setFormData(prev => ({ ...prev, photoURL: url }));
      else if (type === 'welcome') setFormData(prev => ({ ...prev, welcomeVideoUrl: url }));
      else if (type === 'resource') setNewMedia(prev => ({ ...prev, url: url, type: file.type.includes('pdf') ? 'pdf' : file.type.includes('video') ? 'video' : 'imagen' }));

      setUploading(null);
    } catch (err) {
      console.error(err);
      setError(`Error al subir ${type}: ` + (err instanceof Error ? err.message : String(err)));
      setUploading(null);
    }
  };

  const handleAddMedia = () => {
    if (!newMedia.title || !newMedia.url) return;
    if (mediaItems.length >= 8) {
      alert("Límite máximo de 8 recursos alcanzado.");
      return;
    }
    setMediaItems([...mediaItems, { ...newMedia }]);
    setNewMedia({ type: 'video', url: '', title: '', pointCost: 10 });
  };

  const handleRemoveMedia = (index: number) => {
    const updated = [...mediaItems];
    updated.splice(index, 1);
    setMediaItems(updated);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-8 animate-in slide-in-from-bottom-2">
       {/* Información Principal */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Perfil Público de Coach</h3>
            <p className="text-sm text-slate-500 mt-1">Personaliza tu espacio profesional en el Ecosistema.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={handleShare}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                copied 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {copied ? <CheckCircle2 size={16} /> : <ExternalLink size={16} />}
              {copied ? '¡Copiado!' : 'Compartir Perfil'}
            </button>
            {formData.photoURL && (
              <div className="w-16 h-16 rounded-full border-2 border-kiragold/20 overflow-hidden shadow-inner">
                <img src={formData.photoURL} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Nombre Público</label>
              <input 
                required
                value={formData.displayName}
                onChange={e => setFormData({...formData, displayName: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-kirateal/5 transition-all outline-none"
                placeholder="Tu nombre completo"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Especialidades</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                {specialtiesList.map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={formData.specialties.includes(s)}
                      onChange={(e) => {
                        const newSpecs = e.target.checked 
                          ? [...formData.specialties, s]
                          : formData.specialties.filter(x => x !== s);
                        setFormData({...formData, specialties: newSpecs, specialty: newSpecs[0] || ''});
                      }}
                      className="w-4 h-4 rounded text-kirateal border-slate-200 focus:ring-kirateal/20"
                    />
                    <span className="text-[11px] text-slate-600 group-hover:text-slate-900 transition-colors">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
               <Sparkles size={14} className="text-kiragold" /> Prueba Social y Métricas
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[11px] font-bold text-slate-500 flex items-center gap-2">Calificación (1-5)</label>
                   <div className="relative">
                      <input 
                         type="number" 
                         min="1" 
                         max="5" 
                         step="0.1"
                         value={formData.rating}
                         onChange={e => setFormData({...formData, rating: parseFloat(e.target.value)})}
                         className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-kiragold/10"
                      />
                      <Star size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-kiragold fill-kiragold" />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[11px] font-bold text-slate-500 flex items-center gap-2">Nº de Estudiantes</label>
                   <div className="relative">
                      <input 
                         type="number" 
                         value={formData.studentCount}
                         onChange={e => setFormData({...formData, studentCount: parseInt(e.target.value)})}
                         className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-kirateal/10"
                      />
                      <Users size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-kirateal" />
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <ExternalLink size={14} className="text-sky-500" /> Redes Sociales
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Instagram</label>
                  <div className="relative">
                    <Instagram size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500" />
                    <input 
                       value={formData.socialLinks.instagram}
                       onChange={e => setFormData({
                         ...formData, 
                         socialLinks: {...formData.socialLinks, instagram: e.target.value}
                       })}
                       placeholder="@usuario"
                       className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">LinkedIn</label>
                  <div className="relative">
                    <Linkedin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                    <input 
                       value={formData.socialLinks.linkedin}
                       onChange={e => setFormData({
                         ...formData, 
                         socialLinks: {...formData.socialLinks, linkedin: e.target.value}
                       })}
                       placeholder="URL de perfil"
                       className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Twitter (X)</label>
                  <div className="relative">
                    <Twitter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900" />
                    <input 
                       value={formData.socialLinks.twitter}
                       onChange={e => setFormData({
                         ...formData, 
                         socialLinks: {...formData.socialLinks, twitter: e.target.value}
                       })}
                       placeholder="@usuario"
                       className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none"
                    />
                  </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Nivel de Experiencia</label>
              <select 
                value={formData.experienceLevel}
                onChange={e => setFormData({...formData, experienceLevel: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-kirateal/5 transition-all outline-none appearance-none"
              >
                <option value="Principiante">Principiante</option>
                <option value="Intermedio">Intermedio</option>
                <option value="Avanzado">Avanzado</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Idiomas</label>
              <input 
                value={formData.languages}
                onChange={e => setFormData({...formData, languages: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-kirateal/5 transition-all outline-none"
                placeholder="Ej: Español, Inglés"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Foto de Perfil</label>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <input 
                  value={formData.photoURL}
                  onChange={e => setFormData({...formData, photoURL: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-kirateal/5 transition-all outline-none"
                  placeholder="URL de imagen externa..."
                />
              </div>
              <div className="relative">
                <input 
                  type="file" 
                  id="profile-upload" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'photo')}
                />
                <label 
                  htmlFor="profile-upload"
                  className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  {uploading === 'photo' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  Subir
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Video de Bienvenida</label>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <input 
                  value={formData.welcomeVideoUrl}
                  onChange={e => setFormData({...formData, welcomeVideoUrl: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-kirateal/5 transition-all outline-none"
                  placeholder="URL de video (YouTube/Vimeo) o sube uno..."
                />
              </div>
              <div className="relative">
                <input 
                  type="file" 
                  id="welcome-upload" 
                  className="hidden" 
                  accept="video/*"
                  onChange={(e) => handleFileUpload(e, 'welcome')}
                />
                <label 
                  htmlFor="welcome-upload"
                  className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  {uploading === 'welcome' ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
                  Subir
                </label>
              </div>
            </div>
            {formData.welcomeVideoUrl && (
              <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 aspect-video shadow-lg">
                <video src={formData.welcomeVideoUrl} controls className="w-full h-full object-cover">
                  Tu navegador no soporta el elemento de video.
                </video>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Biografía y Enfoque Profesional</label>
            <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
               <ReactQuill 
                theme="snow"
                value={formData.bio}
                onChange={(val) => setFormData({...formData, bio: val})}
                className="bg-white"
                placeholder="Cuenta tu trayectoria y metodología..."
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'clean']
                  ],
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
             <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 text-kirateal">
               Enlace de Calendly PRO
             </label>
             <div className="relative">
               <input 
                 value={formData.calendlyUrl}
                 onChange={e => setFormData({...formData, calendlyUrl: e.target.value})}
                 className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-kirateal/5 transition-all outline-none"
                 placeholder="https://calendly.com/tu-usuario"
               />
               {formData.calendlyUrl && formData.calendlyUrl.includes('calendly.com') && (
                 <a 
                   href={formData.calendlyUrl} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="absolute right-4 top-1/2 -translate-y-1/2 text-kirateal hover:text-kirateal-light transition-colors"
                 >
                   <ExternalLink size={16} />
                 </a>
               )}
             </div>
             <p className="text-[10px] text-slate-400 px-1 mt-1">Activa el botón de "Agendar Sesión" en tu perfil público.</p>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full px-10 py-4 bg-kirateal text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-kirateal/20 hover:shadow-kirateal/30 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? "Guardando..." : success ? <><CheckCircle2 size={18}/> ¡Perfil Actualizado!</> : "Guardar Perfil Élite"}
            </button>
          </div>
        </form>
      </div>

      {/* Editor de Contenido / Espacio (Bóveda Externa) */}
      <div className="w-full xl:w-[450px] bg-white rounded-2xl border border-slate-200 p-8 flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2"><FolderTree size={20} className="text-emerald-500" /> Bóveda de Contenido</h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Organiza tus recursos premium. Arrastra para reordenar cómo los verán tus estudiantes.
            </p>
          </div>

          <div className="space-y-3 mb-6 flex-1 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
             <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={mediaItems.map((_, idx) => `${mediaItems[idx].title}-${idx}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {mediaItems.map((item, idx) => (
                    <SortableMediaItem 
                      key={`${item.title}-${idx}`} 
                      id={`${item.title}-${idx}`} 
                      item={item} 
                      index={idx}
                      onRemove={handleRemoveMedia} 
                    />
                  ))}
                </SortableContext>
              </DndContext>

             {mediaItems.length === 0 && (
                <div className="p-12 border-2 border-dashed border-slate-100 rounded-3xl text-center flex flex-col items-center opacity-60">
                   <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <FolderTree size={24} className="text-slate-300" />
                   </div>
                   <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic">Bóveda vacía</span>
                </div>
             )}
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
             <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Nuevo Recurso</span>
                <span className="text-[10px] font-bold text-slate-400">{mediaItems.length}/8</span>
             </div>
             
             <div className="space-y-3">
               <div className="relative">
                 <input value={newMedia.title} onChange={e=>setNewMedia({...newMedia, title: e.target.value})} placeholder="Título descriptivo (ej: Guía de Meditación)" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-kirateal/5 transition-all pr-12" />
                 <button 
                   type="button"
                   onClick={handleAiMediaSuggestion}
                   title="Kira sugiere Categoría y Costo"
                   className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-kirateal hover:bg-kirateal/10 rounded-lg transition-all"
                 >
                   <Sparkles size={14} className={cn(uploading === 'resource' && "animate-spin")} />
                 </button>
               </div>
               
               <div className="grid grid-cols-2 gap-2">
                 <div className="relative">
                    <select value={newMedia.type} onChange={e=>setNewMedia({...newMedia, type: e.target.value})} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none w-full appearance-none">
                       <option value="video">🎥 Video Masterclass</option>
                       <option value="pdf">📄 Workbook (PDF)</option>
                       <option value="imagen">🖼️ Infografía Premium</option>
                    </select>
                 </div>
                 <div className="relative">
                    <input type="number" value={newMedia.pointCost} onChange={e=>setNewMedia({...newMedia, pointCost: parseInt(e.target.value)})} placeholder="Costo pts" className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-2 py-2.5 text-xs outline-none focus:ring-2 focus:ring-kirateal/5 transition-all" />
                    <Zap size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-kiragold" />
                 </div>
               </div>
               
               <div className="flex gap-2">
                 <div className="flex-1">
                   <input 
                     value={newMedia.url} 
                     onChange={e=>setNewMedia({...newMedia, url: e.target.value})} 
                     placeholder={uploading === 'resource' ? "Subiendo archivo..." : "URL o sube PDF/Video..."} 
                     className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-kirateal/5 transition-all h-full" 
                   />
                 </div>
                 <div className="relative">
                   <input 
                     type="file" 
                     id="resource-upload" 
                     className="hidden" 
                     accept=".pdf,video/*,image/*"
                     onChange={(e) => handleFileUpload(e, 'resource')} 
                   />
                   <label 
                     htmlFor="resource-upload"
                     className="flex items-center justify-center p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer h-full shadow-lg shadow-slate-200"
                   >
                     {uploading === 'resource' ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                   </label>
                 </div>
               </div>
               
               <button 
                 type="button"
                 onClick={handleAddMedia} 
                 disabled={mediaItems.length >= 8 || !newMedia.title || !newMedia.url} 
                 className="w-full py-3 bg-kirateal hover:bg-kirateal-light text-white font-bold text-[11px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 shadow-xl shadow-kirateal/10 flex items-center justify-center gap-2 active:scale-95"
                >
                   <PlusCircle size={16} /> Asegurar en Bóveda
                </button>
             </div>
          </div>
      </div>
    </div>
  );
}

function SortableMediaItem({ id, item, index, onRemove }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "flex flex-col p-4 bg-white border border-slate-100 rounded-xl relative group transition-all",
        isDragging ? "shadow-2xl ring-2 ring-kirateal/10 cursor-grabbing scale-[1.02]" : "hover:border-kirateal/20 hover:shadow-sm"
      )}
    >
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-kirateal transition-colors">
          <GripVertical size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-slate-700 text-xs block truncate">{item.title}</span>
          <span className="text-[9px] text-slate-400 truncate block mt-0.5 max-w-[200px] opacity-60 font-mono">{item.url}</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[8px] font-black uppercase tracking-tighter text-slate-500">
                {item.type}
            </div>
            <button 
                onClick={() => onRemove(index)} 
                className="p-2 text-rose-400 bg-white border border-rose-50 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
            >
                <Trash2 size={12} />
            </button>
        </div>
      </div>
    </div>
  );
}

export function CoachCourses() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [bannerUrl, setBannerUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(d => {
        if(d.exists()) setProfile(d.data());
      });
      fetchCourses();
    }
  }, [user]);

  const fetchCourses = async () => {
    if(!user) return;
    try {
      const q = query(collection(db, 'courses'), where('coachId', '==', user.uid));
      const snap = await getDocs(q);
      setCourses(snap.docs.map(d => ({id: d.id, ...d.data()})));
    } catch(e) {
      console.error(e);
    }
  };

  const isApproved = profile?.approvalStatus === 'approved';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isApproved) return;
    try {
      await addDoc(collection(db, 'courses'), {
        title,
        description,
        price: Number(price),
        bannerUrl,
        coachId: user.uid,
        status: 'published',
        createdAt: new Date()
      });
      setIsCreating(false);
      setTitle('');
      setDescription('');
      setPrice(0);
      setBannerUrl('');
      fetchCourses();
    } catch(e) {
      console.error(e);
      alert('Error creando curso. Asegúrate de estar aprobado.');
    }
  };

  const generateAiContent = async () => {
    if (!title && !description) {
      alert("Por favor, introduce al menos un título o tema para que Kira AI pueda ayudarte.");
      return;
    }
    setIsAiGenerating(true);
    try {
      const prompt = `Actúa como un arquitecto de contenido educativo experto. 
      Basado en este título o idea de curso: "${title || description}", genera:
      1. Un título profesional y atractivo.
      2. Una descripción persuasiva de 3 párrafos que resalte los beneficios.
      3. Una lista de 5 módulos clave con sus respectivos objetivos.
      
      Devuelve la respuesta en formato JSON estrictamente válido con las llaves: "title", "description", "syllabus" (donde syllabus es un string formateado con los módulos).`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || '{}');

      setTitle(data.title || title);
      setDescription((data.description || description) + "\n\n### Temario Propuesto:\n" + (data.syllabus || ""));
    } catch (e) {
      console.error("AI Generation Error:", e);
      alert("Hubo un error al generar el contenido. Por favor intenta de nuevo.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  if (!isApproved) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center animate-in zoom-in-95">
        <h2 className="text-lg font-bold text-slate-800 mb-2 tracking-tight">Acceso Restringido</h2>
        <p className="text-sm text-slate-500">Debes ser aprobado por un administrador antes de subir cursos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-200 gap-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Mis Cursos</h2>
          <p className="text-[13px] text-slate-500 mt-0.5">Gestiona tu contenido y material educativo.</p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className={cn(
            "px-6 py-2.5 rounded-xl text-[12px] font-bold shadow-md transition-all active:scale-95",
            isCreating 
              ? "bg-slate-100 text-slate-600 shadow-none" 
              : "bg-primary text-white shadow-primary/10 hover:shadow-primary/20"
          )}
        >
          {isCreating ? 'Cancelar' : 'Crear Nuevo Curso'}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900 text-base tracking-tight">Diseño de Curriculum</h3>
            <button 
               type="button"
               disabled={isAiGenerating}
               onClick={generateAiContent}
               className="px-4 py-2 bg-gradient-to-r from-kirateal to-kirateal-light text-white rounded-xl text-[11px] font-bold flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50 shadow-md shadow-kirateal/10"
             >
               {isAiGenerating ? <Loader2 size={13} className="animate-spin"/> : <Sparkles size={13}/>}
               {isAiGenerating ? "Generando..." : "Asistente Kira AI"}
             </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Título del Curso</label>
              <input required value={title} onChange={e=>setTitle(e.target.value)} type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none" placeholder="Ej: Maestría en Inteligencia Emocional" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Inversión Alumno ($)</label>
              <input required value={price} onChange={e=>setPrice(Number(e.target.value))} type="number" min="0" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Cover Image</label>
              <MediaUpload 
                onUploadComplete={(url) => setBannerUrl(url)}
                folderPath={`courses/${user?.uid}`}
                currentMedia={bannerUrl}
                label="Subir Cover"
                accept="image/*"
              />
              <input value={bannerUrl} onChange={e=>setBannerUrl(e.target.value)} type="text" placeholder="O URL externa..." className="w-full mt-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Propuesta de Valor (Descripción)</label>
              <textarea required value={description} onChange={e=>setDescription(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none h-32 resize-none" placeholder="¿Qué lograrán tus alumnos?" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95">
              Publicar Programa
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(c => (
          <div key={c.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all hover:-translate-y-1 group">
            <div className="relative h-40 overflow-hidden">
               <img src={c.bannerUrl || `https://picsum.photos/seed/${c.title}/800/400`} alt="Banner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
               <div className="absolute top-4 right-4 px-2 py-1 bg-white/90 backdrop-blur rounded-lg text-[10px] font-bold text-slate-800 uppercase shadow-sm">
                  {c.status}
               </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="font-bold text-slate-900 text-[16px] mb-1 leading-tight tracking-tight">{c.title}</h3>
              <p className="text-[14px] text-primary font-extrabold mb-3">${c.price}</p>
              <p className="text-[12px] text-slate-500 line-clamp-2 mb-6 flex-1 leading-relaxed">{c.description}</p>
              <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Users size={14} />
                  <span className="text-[11px] font-bold">12 Alumnos</span>
                </div>
                <button className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                   Editar <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {courses.length === 0 && !isCreating && (
          <div className="col-span-full text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
             <BookOpen size={48} className="mx-auto text-slate-200 mb-4" />
             <p className="text-slate-400 font-medium text-sm">Aún no has diseñado ningún curso.</p>
             <button onClick={() => setIsCreating(true)} className="mt-4 text-primary font-bold text-xs uppercase tracking-widest hover:underline">Comenzar ahora</button>
          </div>
        )}
      </div>
    </div>
  );
}
