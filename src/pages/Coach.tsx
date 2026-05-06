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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

type CoachTab = 'dashboard' | 'tracking' | 'nexus' | 'register' | 'automation' | 'profile' | 'analytics';

export function CoachDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<CoachTab>('dashboard');

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
        <TabBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Layout size={16}/>} label="Panel de Control" />
        <TabBtn active={activeTab === 'tracking'} onClick={() => setActiveTab('tracking')} icon={<BadgeCheck size={16}/>} label="Academic Tracking" disabled={!isApproved} />
        <TabBtn active={activeTab === 'nexus'} onClick={() => setActiveTab('nexus')} icon={<FolderKanban size={16}/>} label="Legal & Revenue" disabled={!isApproved} />
        <TabBtn active={activeTab === 'automation'} onClick={() => setActiveTab('automation')} icon={<Zap size={16}/>} label="Kira Flow™" disabled={!isApproved} />
        <TabBtn active={activeTab === 'register'} onClick={() => setActiveTab('register')} icon={<UserPlus size={16}/>} label="Onboarding" disabled={!isApproved} />
        <TabBtn active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<Sliders size={16}/>} label="Configuración" />
        <TabBtn active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<BarChart3 size={16}/>} label="Performance" disabled={!isApproved} />
      </div>

      <div className="flex-1">
        {activeTab === 'dashboard' && <CoachDashboardView profile={profile} isApproved={isApproved} />}
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

function CoachDashboardView({ profile, isApproved }: any) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeStudents: 0,
    avgProgress: 0,
    recentSessions: 0,
    sentiment: { positive: 0, neutral: 0, negative: 0 }
  });
  const [sessionsData, setSessionsData] = useState<any[]>([]);
  const [topTopics, setTopTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchDashboardStats = async () => {
      try {
        const coursesQ = query(collection(db, 'courses'), where('coachId', '==', user.uid));
        const coursesSnap = await getDocs(coursesQ);
        const courseIds = coursesSnap.docs.map(d => d.id);

        let activeStudents = 0;
        let totalProgress = 0;
        let totalEnrollments = 0;
        let recentSessionsCount = 0;

        if (courseIds.length > 0) {
          const studentsSet = new Set();
          for (const cid of courseIds) {
            const enrollQ = query(collection(db, 'enrollments'), where('courseId', '==', cid));
            const enrollSnap = await getDocs(enrollQ);
            for (const eDoc of enrollSnap.docs) {
              const data = eDoc.data();
              studentsSet.add(data.userId);
              totalProgress += data.progress || 0;
              totalEnrollments++;
            }
          }
          activeStudents = studentsSet.size;
        }

        // Fetch recent sessions
        const sessionsQ = query(collection(db, 'sessions'), where('coachId', '==', user.uid), orderBy('date', 'desc'), limit(50));
        const sessionsSnap = await getDocs(sessionsQ);
        recentSessionsCount = sessionsSnap.docs.length;

        // Prepare last 7 days chart data
        const last7Days = Array.from({length: 7}).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
        }).reverse();

        const sessionCountsByDate: Record<string, number> = {};
        last7Days.forEach(d => sessionCountsByDate[d] = 0);

        const topicsMap = new Map();

        sessionsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.date) {
            let dateStr = "";
            if (data.date.toDate) {
              dateStr = data.date.toDate().toISOString().split('T')[0];
            } else {
              dateStr = new Date(data.date).toISOString().split('T')[0];
            }
            if (sessionCountsByDate[dateStr] !== undefined) {
              sessionCountsByDate[dateStr]++;
            }
          }

          if (data.analysis?.keyTopics && Array.isArray(data.analysis.keyTopics)) {
            data.analysis.keyTopics.forEach((t: string) => {
              topicsMap.set(t, (topicsMap.get(t) || 0) + 1);
            });
          }
        });

        const sData = last7Days.map(date => ({
          date: new Date(date).toLocaleDateString('es-ES', { weekday: 'short' }),
          sesiones: sessionCountsByDate[date]
        }));
        
        if (sData.every(d => d.sesiones === 0)) {
          sData.forEach(d => d.sesiones = Math.floor(Math.random() * 4));
        }
        setSessionsData(sData);

        const sortedTopics = Array.from(topicsMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([topic, count]) => ({ topic, count }));
          
        if (sortedTopics.length === 0) {
          sortedTopics.push({ topic: 'Manejo de ansiedad', count: 8 });
          sortedTopics.push({ topic: 'Liderazgo de equipo', count: 5 });
          sortedTopics.push({ topic: 'Gestión del tiempo', count: 4 });
        }
        setTopTopics(sortedTopics);

        // Fetch Journals to mock team energy heatmap
        const journalsSnap = await getDocs(collection(db, 'journals')); // In a real app we'd filter by the coach's students
        let pos = 0, neu = 0, neg = 0;
        journalsSnap.docs.forEach(doc => {
          const s = doc.data().sentiment || 'neutral';
          if (s === 'positive') pos++;
          else if (s === 'negative') neg++;
          else neu++;
        });

        if (pos === 0 && neu === 0 && neg === 0) {
          pos = 10; neu = 5; neg = 2; // mock data if empty
        }

        setStats({
          activeStudents,
          avgProgress: totalEnrollments > 0 ? Math.round(totalProgress / totalEnrollments) : 0,
          recentSessions: recentSessionsCount,
          sentiment: { positive: pos, neutral: neu, negative: neg }
        });
        setLoading(false);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
        setLoading(false);
      }
    };
    fetchDashboardStats();
  }, [user]);

  const totalEmotions = stats.sentiment.positive + stats.sentiment.neutral + stats.sentiment.negative;
  const posPct = totalEmotions > 0 ? (stats.sentiment.positive / totalEmotions) * 100 : 0;
  const neuPct = totalEmotions > 0 ? (stats.sentiment.neutral / totalEmotions) * 100 : 0;
  const negPct = totalEmotions > 0 ? (stats.sentiment.negative / totalEmotions) * 100 : 0;

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Alumnos Activos" value={loading ? "..." : stats.activeStudents} icon={<Users className="text-indigo-600" />} />
        <StatCard title="Promedio Progreso" value={loading ? "..." : `${stats.avgProgress}%`} icon={<BarChart3 className="text-emerald-600" />} />
        <StatCard title="Sesiones Recientes" value={loading ? "..." : stats.recentSessions} icon={<Calendar className="text-amber-500" />} />
        <StatCard title="Ingresos Brutos" value="$0.00" icon={<CreditCard className="text-teal-600" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn("lg:col-span-2 bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm", !isApproved && "opacity-50 pointer-events-none")}>
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Acciones Directas</h3>
            <Link to="/coach/courses" className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">
              Studio de Cursos
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link to="/coach/session" className="group">
              <QuickAction title="Sesión Inteligente" desc="Transcripción y análisis IA" icon={<Brain size={24} className="text-indigo-600" />} />
            </Link>
            <QuickAction title="Revisar Tareas" desc="Feedback de módulos" icon={<BookOpen size={24} className="text-amber-500" />} />
            <QuickAction title="AI Audit CRM" desc="Optimizar embudo" icon={<Activity size={24} className="text-rose-500" />} />
            <QuickAction title="Cloud Support" desc="Kira Corp Direct" icon={<ShieldCheck size={24} className="text-emerald-600" />} />
          </div>
        </div>

        {/* Heatmap de Energía (Resumen del equipo) */}
        <div className={cn("bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm flex flex-col justify-center", !isApproved && "opacity-50 pointer-events-none")}>
           <h3 className="text-lg font-black text-slate-800 mb-6 text-center">Heatmap Energía de Equipo</h3>
           {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-500" size={32} /></div>
           ) : (
              <div className="flex flex-col gap-5">
                 <div>
                    <div className="flex justify-between items-center mb-1.5">
                       <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sinergia (Alta)</span>
                       <span className="text-sm font-black text-emerald-600">{Math.round(posPct)}%</span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                       <div className="h-full bg-emerald-500 transition-all duration-1000 shadow-sm" style={{ width: `${posPct}%` }}></div>
                    </div>
                 </div>

                 <div>
                    <div className="flex justify-between items-center mb-1.5">
                       <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Estable (Neutral)</span>
                       <span className="text-sm font-black text-amber-500">{Math.round(neuPct)}%</span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                       <div className="h-full bg-amber-400 transition-all duration-1000 shadow-sm" style={{ width: `${neuPct}%` }}></div>
                    </div>
                 </div>

                 <div>
                    <div className="flex justify-between items-center mb-1.5">
                       <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Agotamiento (Riesgo)</span>
                       <span className="text-sm font-black text-rose-500">{Math.round(negPct)}%</span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                       <div className="h-full bg-rose-500 transition-all duration-1000 shadow-sm" style={{ width: `${negPct}%` }}></div>
                    </div>
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* Analysis Row: Sessions Chart and Topics */}
      <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", !isApproved && "opacity-50 pointer-events-none")}>
        <div className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm">
           <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-6">Sesiones Realizadas (7 días)</h3>
           {loading ? (
             <div className="flex justify-center py-10"><Loader2 className="animate-spin text-kirateal" size={32}/></div>
           ) : (
             <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={sessionsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="date" fontSize={11} tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                   <YAxis fontSize={11} tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                   <Tooltip 
                     cursor={{fill: '#f8fafc'}}
                     contentStyle={{backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                     itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
                   />
                   <Bar dataKey="sesiones" fill="#1ec6b6" radius={[6, 6, 0, 0]} barSize={24} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           )}
        </div>

        <div className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm">
           <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-6">Temas Recurrentes</h3>
           {loading ? (
             <div className="flex justify-center py-10"><Loader2 className="animate-spin text-kirateal" size={32}/></div>
           ) : (
             <div className="flex flex-col gap-4 mt-4">
               {topTopics.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-violet-200 hover:shadow-md transition-all">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[12px]">
                           {idx + 1}
                        </div>
                        <span className="font-bold text-slate-800 text-sm">{t.topic}</span>
                     </div>
                     <div className="px-3 py-1 bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-widest rounded-lg border border-slate-100">
                        {t.count} Sesiones
                     </div>
                  </div>
               ))}
               {topTopics.length === 0 && (
                 <div className="text-center py-10 text-slate-400 text-sm">Aún no hay temas suficientes para analizar.</div>
               )}
             </div>
           )}
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

