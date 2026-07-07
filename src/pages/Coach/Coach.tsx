import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { storage, db, handleFirestoreError, OperationType } from '@/src/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, orderBy, limit, onSnapshot, deleteDoc, setDoc } from 'firebase/firestore';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { MediaUpload } from '@/src/components/MediaUpload';
import { CoachAnalytics } from '@/src/components/CoachAnalytics';
import { useToast } from '@/src/hooks/useToast';
import { ProfileLayout } from './ProfileLayout';
import { CoachBooksView } from './CoachBooksView';
import { CoachHomeworkReview } from './CoachHomeworkReview';
import { CoachCrmAudit } from './CoachCrmAudit';
import { CoachCloudSupport } from './CoachCloudSupport';
import { CoachCourses } from './CoachCourses';
import { CoachSession } from './CoachSession';
import { MessageSquare, Users, BookOpen, Activity, FileText, UserPlus, Clock, CheckCircle2, AlertTriangle, XCircle, Zap, ShieldCheck, CreditCard, ChevronRight, GraduationCap, Sparkles, Loader2, Layout, Sliders, BarChart3, ShieldAlert, ShoppingBag, FolderTree, GripVertical, Trash2, Upload, ExternalLink, PlusCircle, Video, AlertCircle, Calendar, BadgeCheck, FolderKanban, UploadCloud, Instagram, Linkedin, Twitter, Star, TrendingUp, HeartPulse, Brain, ArrowRight, Award } from 'lucide-react';
import CertificateGenerator from '@/src/components/CertificateGenerator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RichTextEditor } from '@/src/components/RichTextEditor';
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
import { cn } from '@/src/lib/utils';
import { StudentDetailedAnalytics } from '@/src/components/StudentDetailedAnalytics';

// ============================================================
// TIPOS
// ============================================================
type CoachTab = 'dashboard' | 'courses' | 'session' | 'tracking' | 'homework' | 'crm_audit' | 'support' | 'nexus' | 'register' | 'automation' | 'profile' | 'analytics' | 'certificates' | 'books';

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export function CoachDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        console.log("[Membresía] Registrando pago de membresía...");
        await Promise.all([
          updateDoc(doc(db, 'users', user.uid), {
            membershipStatus: 'active',
            membershipPaidAt: new Date(),
            role: 'coach'
          }),
          addDoc(collection(db, 'transactions'), {
            userId: user.uid,
            amount: Number(amount),
            type: 'coach_membership',
            createdAt: new Date()
          })
        ]);
        setSearchParams({});
      } catch (e) {
        console.error('Error recording membership success:', e);
      }
    }
  };
  
  const isApproved = profile?.approvalStatus === 'approved' || profile?.role === 'admin';
  const hasMembership = profile?.membershipStatus === 'active' || profile?.role === 'admin';

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

  // Renderizar el contenido según la pestaña activa
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <CoachDashboardView profile={profile} isApproved={isApproved} setActiveTab={setActiveTab} />;
      case 'courses':
        return <CoachCourses />;
      case 'session':
        return <CoachSession />;
      case 'tracking':
        return <CoachStudentsActivity />;
      case 'homework':
        return <CoachHomeworkReview />;
      case 'crm_audit':
        return <CoachCrmAudit />;
      case 'support':
        return <CoachCloudSupport />;
      case 'nexus':
        return <CoachContractManager />;
      case 'register':
        return <CoachRegisterClient />;
      case 'automation':
        return <CoachAutomationView />;
      case 'profile':
        return <ProfileLayout initialProfile={profile} />;
      case 'analytics':
        return <CoachAnalytics coachId={user?.uid} />;
      case 'certificates':
        return <CertificateGenerator />;
      case 'books':
        return <CoachBooksView />;
      default:
        return <CoachDashboardView profile={profile} isApproved={isApproved} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Header Panel */}
      <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-10 rounded-[40px] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-100/30 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row gap-6">
          <div className="hidden lg:flex shrink-0 items-center justify-center bg-white/60 border border-white p-4 rounded-[32px] shadow-sm w-32 h-32 aspect-square">
            <img src="/assets/kira-logo.png" alt="Kira Logo" className="w-full h-full object-contain filter drop-shadow-md" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
          
          <div className="flex-1">
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
      </div>

      {/* Membresía */}
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

      {/* Navegación */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-[32px] w-fit shadow-sm border border-slate-200/50">
        <TabBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Layout size={16}/>} label="Panel de Control" />
        <TabBtn active={activeTab === 'courses'} onClick={() => setActiveTab('courses')} icon={<BookOpen size={16}/>} label="Studio de Cursos" disabled={!isApproved} />
        <TabBtn active={activeTab === 'session'} onClick={() => setActiveTab('session')} icon={<Brain size={16}/>} label="Sesión IA" disabled={!isApproved} />
        <TabBtn active={activeTab === 'tracking'} onClick={() => setActiveTab('tracking')} icon={<BadgeCheck size={16}/>} label="Academic Tracking" disabled={!isApproved} />
        <TabBtn active={activeTab === 'homework'} onClick={() => setActiveTab('homework')} icon={<BookOpen size={16}/>} label="Revisar Tareas" disabled={!isApproved} />
        <TabBtn active={activeTab === 'crm_audit'} onClick={() => setActiveTab('crm_audit')} icon={<Activity size={16}/>} label="AI Audit CRM" disabled={!isApproved} />
        <TabBtn active={activeTab === 'support'} onClick={() => setActiveTab('support')} icon={<ShieldCheck size={16}/>} label="Cloud Support" disabled={!isApproved} />
        <TabBtn active={activeTab === 'nexus'} onClick={() => setActiveTab('nexus')} icon={<FolderKanban size={16}/>} label="Legal & Revenue" disabled={!isApproved} />
        <TabBtn active={activeTab === 'automation'} onClick={() => setActiveTab('automation')} icon={<Zap size={16}/>} label="Kira Flow™" disabled={!isApproved} />
        <TabBtn active={activeTab === 'register'} onClick={() => setActiveTab('register')} icon={<UserPlus size={16}/>} label="Onboarding" disabled={!isApproved} />
        <TabBtn active={activeTab === 'certificates'} onClick={() => setActiveTab('certificates')} icon={<Award size={16}/>} label="Certificados" disabled={!isApproved} />
        <TabBtn active={activeTab === 'books'} onClick={() => setActiveTab('books')} icon={<BookOpen size={16}/>} label="Libros" disabled={!isApproved} />
        <TabBtn active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<Sliders size={16}/>} label="Configuración" />
        <TabBtn active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<BarChart3 size={16}/>} label="Performance" disabled={!isApproved} />
      </div>

      {/* Contenido */}
      <div className="flex-1">
        {renderContent()}
      </div>
    </div>
  );
}

// ============================================================
// TAB BUTTON
// ============================================================
function TabBtn({ active, onClick, icon, label, disabled }: any) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2.5 px-6 py-2.5 rounded-[24px] text-[13px] font-bold tracking-tight transition-all cursor-pointer",
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

// ============================================================
// DASHBOARD VIEW
// ============================================================
function CoachDashboardView({ profile, isApproved, setActiveTab }: any) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const [stats, setStats] = useState({
    activeStudents: 0,
    avgProgress: 0,
    recentSessions: 0,
    sentiment: { positive: 0, neutral: 0, negative: 0 }
  });
  const [sessionsData, setSessionsData] = useState<any[]>([]);
  const [topTopics, setTopTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isEditingMetrics, setIsEditingMetrics] = useState(false);
  const [editedMetrics, setEditedMetrics] = useState({
    activeStudents: 0,
    avgProgress: 0,
    recentSessions: 0
  });

  // Fetch pending enrollments
  const fetchPendingRequests = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'enrollments'), where('coachId', '==', user.uid));
      const snap = await getDocs(q);
      const pending = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((e: any) => e.status === 'pending');
      setPendingRequests(pending);
    } catch (e) {
      console.error("Error fetching pending:", e);
    }
  };

  const handleEnrollmentAction = async (enrollmentId: string, action: 'approved' | 'rejected') => {
    try {
      if (action === 'approved') {
        await updateDoc(doc(db, 'enrollments', enrollmentId), { status: 'approved' });
        toastSuccess("Inscripción autorizada correctamente.");
      } else {
        await deleteDoc(doc(db, 'enrollments', enrollmentId));
        toastSuccess("Inscripción rechazada con éxito.");
      }
      fetchPendingRequests();
    } catch (error: any) {
      console.error("Error updating enrollment:", error);
      toastError("No se pudo procesar la acción: " + error.message);
    }
  };

  useEffect(() => {
    if (profile) {
      setEditedMetrics({
        activeStudents: profile.manualActiveStudents !== undefined ? profile.manualActiveStudents : stats.activeStudents,
        avgProgress: profile.manualAvgProgress !== undefined ? profile.manualAvgProgress : stats.avgProgress,
        recentSessions: profile.manualRecentSessions !== undefined ? profile.manualRecentSessions : stats.recentSessions
      });
    }
  }, [profile, stats]);

  const handleSaveMetrics = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        manualActiveStudents: Number(editedMetrics.activeStudents),
        manualAvgProgress: Number(editedMetrics.avgProgress),
        manualRecentSessions: Number(editedMetrics.recentSessions),
        updatedAt: new Date()
      });
      setIsEditingMetrics(false);
      toastSuccess("Métricas actualizadas");
    } catch (e) {
      console.error("Error saving metrics:", e);
      toastError("Error al guardar métricas");
    }
  };

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

        // Recent sessions
        const sessionsQ = query(collection(db, 'sessions'), where('coachId', '==', user.uid));
        const sessionsSnap = await getDocs(sessionsQ);
        const sortedSessionDocs = [...sessionsSnap.docs].sort((a,b) => {
          const tA = a.data().date?.seconds || a.data().date?.getTime?.() / 1000 || 0;
          const tB = b.data().date?.seconds || b.data().date?.getTime?.() / 1000 || 0;
          return tB - tA;
        }).slice(0, 50);
        recentSessionsCount = sortedSessionDocs.length;

        // Last 7 days chart
        const last7Days = Array.from({length: 7}).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
        }).reverse();

        const sessionCountsByDate: Record<string, number> = {};
        last7Days.forEach(d => sessionCountsByDate[d] = 0);

        const topicsMap = new Map();

        sortedSessionDocs.forEach(doc => {
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

        // Journals sentiment
        const journalsSnap = await getDocs(collection(db, 'journals'));
        let pos = 0, neu = 0, neg = 0;
        journalsSnap.docs.forEach(doc => {
          const s = doc.data().sentiment || 'neutral';
          if (s === 'positive') pos++;
          else if (s === 'negative') neg++;
          else neu++;
        });

        if (pos === 0 && neu === 0 && neg === 0) {
          pos = 10; neu = 5; neg = 2;
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
    fetchPendingRequests();
  }, [user]);

  const totalEmotions = stats.sentiment.positive + stats.sentiment.neutral + stats.sentiment.negative;
  const posPct = totalEmotions > 0 ? (stats.sentiment.positive / totalEmotions) * 100 : 0;
  const neuPct = totalEmotions > 0 ? (stats.sentiment.neutral / totalEmotions) * 100 : 0;
  const negPct = totalEmotions > 0 ? (stats.sentiment.negative / totalEmotions) * 100 : 0;

  const displayActiveStudents = profile?.manualActiveStudents !== undefined ? profile.manualActiveStudents : stats.activeStudents;
  const displayAvgProgress = profile?.manualAvgProgress !== undefined ? profile.manualAvgProgress : stats.avgProgress;
  const displayRecentSessions = profile?.manualRecentSessions !== undefined ? profile.manualRecentSessions : stats.recentSessions;

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-2">
      {/* Métricas Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/50 backdrop-blur-md px-8 py-5 rounded-[30px] border border-slate-200/50 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-kirateal animate-pulse" />
          <span className="text-sm font-black text-slate-800 tracking-tight uppercase">Métricas de Rendimiento</span>
        </div>
        <button 
          onClick={() => setIsEditingMetrics(!isEditingMetrics)}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-black transition-all cursor-pointer active:scale-95 shadow-md shadow-slate-900/10"
        >
          {isEditingMetrics ? "Cancelar Edición" : "Editar Indicadores"}
        </button>
      </div>

      {/* Editar Métricas */}
      {isEditingMetrics && (
        <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-xl animate-in zoom-in-95 duration-200">
          <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2">Personalizar Indicadores</h3>
          <p className="text-xs text-slate-500 mb-6">Configura y publica manualmente los números que se muestran en tu panel de control.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Alumnos Activos</label>
              <input 
                type="number"
                min="0"
                value={editedMetrics.activeStudents}
                onChange={e => setEditedMetrics({...editedMetrics, activeStudents: parseInt(e.target.value) || 0})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-kirateal/5 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Promedio Progreso (%)</label>
              <input 
                type="number"
                min="0"
                max="100"
                value={editedMetrics.avgProgress}
                onChange={e => setEditedMetrics({...editedMetrics, avgProgress: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-kirateal/5 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Sesiones Recientes</label>
              <input 
                type="number"
                min="0"
                value={editedMetrics.recentSessions}
                onChange={e => setEditedMetrics({...editedMetrics, recentSessions: parseInt(e.target.value) || 0})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-kirateal/5 transition-all outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsEditingMetrics(false)}
              className="px-6 py-3 border border-slate-200 text-slate-600 rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSaveMetrics}
              className="px-6 py-3 bg-kirateal text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-kirateal-dark transition-all shadow-lg shadow-kirateal/20"
            >
              Publicar Cambios
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Alumnos Activos" value={loading ? "..." : displayActiveStudents} icon={<Users className="text-indigo-600" />} />
        <StatCard title="Promedio Progreso" value={loading ? "..." : `${displayAvgProgress}%`} icon={<BarChart3 className="text-emerald-600" />} />
        <StatCard title="Sesiones Recientes" value={loading ? "..." : displayRecentSessions} icon={<Calendar className="text-amber-500" />} />
        <StatCard title="Ingresos Brutos" value={loading ? "..." : `$0.00`} icon={<CreditCard className="text-teal-600" />} />
      </div>

      {/* Solicitudes Pendientes */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200/70 rounded-[32px] p-8 shadow-sm flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
                <Clock size={18} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Solicitudes de Alumnos Pendientes
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Alumnos esperando tu autorización directa para acceder a tus contenidos.</p>
              </div>
            </div>
            <span className="px-3.5 py-1.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full uppercase tracking-wider">
              {pendingRequests.length} Esperando
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-white border border-slate-150 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:border-amber-200 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-600 shrink-0 uppercase">
                    {req.studentName?.[0] || 'U'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[13px] font-black text-slate-800 leading-tight truncate">{req.studentName}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-none truncate">{req.studentEmail}</p>
                    <span className="inline-block mt-2 px-2.5 py-0.5 bg-slate-50 text-slate-600 text-[9px] font-bold rounded border border-slate-100 leading-none truncate max-w-full">
                      {req.courseTitle}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-4">
                  <button 
                    onClick={() => handleEnrollmentAction(req.id, 'rejected')}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition text-[11px] font-bold"
                  >
                    Rechazar
                  </button>
                  <button 
                    onClick={() => handleEnrollmentAction(req.id, 'approved')}
                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 size={12} /> Autorizar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACCIONES DIRECTAS - ESTA ES LA SECCIÓN QUE ESTÁS VIENDO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn("lg:col-span-2 bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm", !isApproved && "opacity-50 pointer-events-none")}>
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Acciones Directas</h3>
            <button
              onClick={() => setActiveTab && setActiveTab('courses')}
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all cursor-pointer"
            >
              Studio de Cursos
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sesión Inteligente */}
            <button
              onClick={() => setActiveTab && setActiveTab('session')}
              className="group text-left w-full cursor-pointer"
            >
              <div className="flex items-start gap-5 p-6 rounded-[32px] border border-slate-100 hover:bg-white hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/20 transition-all text-left">
                <div className="p-4 rounded-2xl bg-slate-50 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                  <Brain size={24} className="text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-[14px] font-black text-slate-900 tracking-tight leading-tight mb-1">Sesión Inteligente</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Transcripción y análisis IA</p>
                </div>
              </div>
            </button>

            {/* Revisar Tareas */}
            <button
              onClick={() => setActiveTab && setActiveTab('homework')}
              className="group text-left w-full cursor-pointer"
            >
              <div className="flex items-start gap-5 p-6 rounded-[32px] border border-slate-100 hover:bg-white hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/20 transition-all text-left">
                <div className="p-4 rounded-2xl bg-slate-50 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                  <BookOpen size={24} className="text-amber-500" />
                </div>
                <div>
                  <h4 className="text-[14px] font-black text-slate-900 tracking-tight leading-tight mb-1">Revisar Tareas</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Feedback de módulos</p>
                </div>
              </div>
            </button>

            {/* AI Audit CRM */}
            <button
              onClick={() => setActiveTab && setActiveTab('crm_audit')}
              className="group text-left w-full cursor-pointer"
            >
              <div className="flex items-start gap-5 p-6 rounded-[32px] border border-slate-100 hover:bg-white hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/20 transition-all text-left">
                <div className="p-4 rounded-2xl bg-slate-50 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                  <Activity size={24} className="text-rose-500" />
                </div>
                <div>
                  <h4 className="text-[14px] font-black text-slate-900 tracking-tight leading-tight mb-1">AI Audit CRM</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Optimizar embudo</p>
                </div>
              </div>
            </button>

            {/* Cloud Support */}
            <button
              onClick={() => setActiveTab && setActiveTab('support')}
              className="group text-left w-full cursor-pointer"
            >
              <div className="flex items-start gap-5 p-6 rounded-[32px] border border-slate-100 hover:bg-white hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/20 transition-all text-left">
                <div className="p-4 rounded-2xl bg-slate-50 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                  <ShieldCheck size={24} className="text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-[14px] font-black text-slate-900 tracking-tight leading-tight mb-1">Cloud Support</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Kira Corp Direct</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Heatmap de Energía */}
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
                  <div className="h-full bg-emerald-500 transition-all duration-1000 shadow-sm" style={{ width: `${posPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Estable (Neutral)</span>
                  <span className="text-sm font-black text-amber-500">{Math.round(neuPct)}%</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-amber-400 transition-all duration-1000 shadow-sm" style={{ width: `${neuPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Agotamiento (Riesgo)</span>
                  <span className="text-sm font-black text-rose-500">{Math.round(negPct)}%</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-rose-500 transition-all duration-1000 shadow-sm" style={{ width: `${negPct}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gráficos */}
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

// ============================================================
// STAT CARD
// ============================================================
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

// ============================================================
// STUDENTS ACTIVITY - Versión simplificada
// ============================================================
function CoachStudentsActivity() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchStudents = async () => {
      try {
        const coursesQ = query(collection(db, 'courses'), where('coachId', '==', user.uid));
        const coursesSnap = await getDocs(coursesQ);
        const courseIds = coursesSnap.docs.map(d => d.id);

        if (courseIds.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
        }

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
        setStudents(Array.from(studentsMap.values()));
        setLoading(false);
      } catch (e) {
        console.error('Fetch students error:', e);
        setLoading(false);
      }
    };
    fetchStudents();
  }, [user]);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-kirateal" size={32}/></div>;
  }

  return (
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
            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progreso</th>
            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {students.map(s => (
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
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-medium text-slate-600">Activo</span>
                </div>
              </td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={3} className="py-12 text-center text-slate-400 text-xs italic">
                Aún no tienes alumnos inscritos en tus cursos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// CONTRACT MANAGER - Versión simplificada
// ============================================================
function CoachContractManager() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8">
      <h2 className="text-xl font-bold text-slate-900">Legal & Revenue</h2>
      <p className="text-slate-500 mt-2">Gestión de contratos y facturación.</p>
      <div className="mt-6 p-6 bg-slate-50 rounded-xl border border-slate-100 text-center text-slate-400">
        <FileText size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">Módulo en desarrollo...</p>
      </div>
    </div>
  );
}

// ============================================================
// AUTOMATION - Versión simplificada
// ============================================================
function CoachAutomationView() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8">
      <h2 className="text-xl font-bold text-slate-900">Kira Flow™</h2>
      <p className="text-slate-500 mt-2">Motor de automatización conductual.</p>
      <div className="mt-6 p-6 bg-slate-50 rounded-xl border border-slate-100 text-center text-slate-400">
        <Zap size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">Módulo en desarrollo...</p>
      </div>
    </div>
  );
}

// ============================================================
// REGISTER CLIENT - Versión simplificada
// ============================================================
function CoachRegisterClient() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '', courseId: '' });
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    if (!user) return;
    const fetchCourses = async () => {
      const q = query(collection(db, 'courses'), where('coachId', '==', user.uid));
      const snap = await getDocs(q);
      setCourses(snap.docs.map(d => ({id: d.id, ...d.data()})));
    };
    fetchCourses();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userRef = await addDoc(collection(db, 'users'), {
        displayName: formData.name,
        email: formData.email,
        role: 'alumno',
        createdAt: new Date(),
        registeredByCoach: user?.uid,
        points: 0,
        status: 'awaiting_login'
      });

      if (formData.courseId) {
        await addDoc(collection(db, 'enrollments'), {
          userId: userRef.id,
          courseId: formData.courseId,
          coachId: user?.uid,
          studentName: formData.name,
          studentEmail: formData.email,
          courseTitle: courses.find(c => c.id === formData.courseId)?.title || 'Curso',
          progress: 0,
          status: 'approved',
          createdAt: new Date()
        });
      }

      setSuccess(true);
      setFormData({ name: '', email: '', courseId: '' });
      toastSuccess('Alumno registrado exitosamente');
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error('Error registering student:', e);
      toastError('Error al registrar alumno');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl bg-white rounded-2xl border border-slate-200 p-8 animate-in zoom-in-95 duration-200">
      <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-6">Registro Manual de Alumno</h3>
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

// ============================================================
// EXPORTACIONES
// ============================================================
export { CoachDashboardView, CoachStudentsActivity, CoachContractManager, CoachAutomationView, CoachRegisterClient };