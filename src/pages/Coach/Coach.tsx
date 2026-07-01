import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { storage, db, handleFirestoreError, OperationType } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, orderBy, limit, onSnapshot, deleteDoc } from 'firebase/firestore';
import { Link, useSearchParams } from 'react-router-dom';
import { MediaUpload } from '../../components/MediaUpload';
import { CoachAnalytics } from '../../components/CoachAnalytics';
import { useToast } from '../../hooks/useToast';
import { ProfileLayout } from './ProfileLayout';
import { Users, BookOpen, Activity, FileText, UserPlus, Clock, CheckCircle2, AlertTriangle, XCircle, Zap, ShieldCheck, CreditCard, ChevronRight, GraduationCap, Sparkles, Loader2, Layout, Sliders, BarChart3, ShieldAlert, ShoppingBag, FolderTree, GripVertical, Trash2, Upload, ExternalLink, PlusCircle, Video, AlertCircle, Calendar, BadgeCheck, FolderKanban, UploadCloud, Instagram, Linkedin, Twitter, Star, TrendingUp, HeartPulse, Brain, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RichTextEditor } from '../../components/RichTextEditor';
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
import { cn } from '../../lib/utils';

const resizeAndConvertToBase64 = (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.75): Promise<string> => {
  console.log(`[Compresión] Iniciando compresión para: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
  
  if (file.size > 2 * 1024 * 1024) {
    console.warn(`[Compresión] El archivo excede el límite recomendado de 2MB: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    alert(`El archivo de imagen excede el tamaño recomendado de 2MB. Intentaremos comprimirlo para ajustarlo al límite.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let currentWidth = img.width;
        let currentHeight = img.height;
        let currentQuality = quality;
        let currentMaxWidth = maxWidth;
        let currentMaxHeight = maxHeight;

        // Calculate initial dimensions
        if (currentWidth > currentHeight) {
          if (currentWidth > currentMaxWidth) {
            currentHeight = Math.round((currentHeight * currentMaxWidth) / currentWidth);
            currentWidth = currentMaxWidth;
          }
        } else {
          if (currentHeight > currentMaxHeight) {
            currentWidth = Math.round((currentWidth * currentMaxHeight) / currentHeight);
            currentHeight = currentMaxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = currentWidth;
        canvas.height = currentHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("No se pudo obtener el contexto del lienzo (Canvas)"));
          return;
        }

        ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
        let dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
        let sizeInBytes = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4);

        console.log(`[Compresión] Tamaño inicial comprimido: ${(sizeInBytes / 1024).toFixed(2)} KB con calidad: ${currentQuality}`);

        // Dynamic adjustment loop to ensure it's under 500KB
        let attempts = 0;
        while (sizeInBytes > 500 * 1024 && attempts < 5) {
          attempts++;
          currentQuality -= 0.15;
          currentMaxWidth = Math.round(currentMaxWidth * 0.8);
          currentMaxHeight = Math.round(currentMaxHeight * 0.8);

          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > currentMaxWidth) {
              h = Math.round((h * currentMaxWidth) / w);
              w = currentMaxWidth;
            }
          } else {
            if (h > currentMaxHeight) {
              w = Math.round((w * currentMaxHeight) / h);
              h = currentMaxHeight;
            }
          }

          canvas.width = w;
          canvas.height = h;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, w, h);
          dataUrl = canvas.toDataURL('image/jpeg', Math.max(currentQuality, 0.1));
          sizeInBytes = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4);

          console.log(`[Compresión] Intento ${attempts}: Nuevo tamaño: ${(sizeInBytes / 1024).toFixed(2)} KB, calidad: ${currentQuality.toFixed(2)}, dimensiones: ${w}x${h}`);
        }

        console.log(`[Compresión] Finalizado con éxito. Tamaño final: ${(sizeInBytes / 1024).toFixed(2)} KB`);
        resolve(dataUrl);
      };
      img.onerror = (err) => {
        console.error("[Compresión] Error al cargar la imagen en memoria", err);
        reject(new Error("Error al procesar la imagen."));
      };
    };
    reader.onerror = (err) => {
      console.error("[Compresión] Error al leer el archivo de imagen", err);
      reject(new Error("Error al leer el archivo."));
    };
  });
};

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
        console.log("[Membresía] Registrando pago de membresía en paralelo...");
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
        console.log("[Membresía] Actualización de membresía y transacción registradas exitosamente.");
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
        <div className="relative z-10 flex flex-col lg:flex-row gap-6">
          {/* Logo Kira Image */}
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
        {activeTab === 'profile' && <ProfileLayout initialProfile={profile} />}
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
      console.error("Error fetching pending in CoachDashboardView:", e);
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
      console.error("Error updating enrollment status:", error);
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
    } else {
      setEditedMetrics({
        activeStudents: stats.activeStudents,
        avgProgress: stats.avgProgress,
        recentSessions: stats.recentSessions
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
    } catch (e) {
      console.error("Error saving manual metrics:", e);
      alert("Error al guardar métricas.");
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

        // Fetch recent sessions
        const sessionsQ = query(collection(db, 'sessions'), where('coachId', '==', user.uid));
        const sessionsSnap = await getDocs(sessionsQ);
        const sortedSessionDocs = [...sessionsSnap.docs].sort((a,b) => {
          const tA = a.data().date?.seconds || a.data().date?.getTime?.() / 1000 || 0;
          const tB = b.data().date?.seconds || b.data().date?.getTime?.() / 1000 || 0;
          return tB - tA;
        }).slice(0, 50);
        recentSessionsCount = sortedSessionDocs.length;

        // Prepare last 7 days chart data
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Alumnos Activos" value={loading ? "..." : displayActiveStudents} icon={<Users className="text-indigo-600" />} />
        <StatCard title="Promedio Progreso" value={loading ? "..." : `${displayAvgProgress}%`} icon={<BarChart3 className="text-emerald-600" />} />
        <StatCard title="Sesiones Recientes" value={loading ? "..." : displayRecentSessions} icon={<Calendar className="text-amber-500" />} />
        <StatCard title="Ingresos Brutos" value="$0.00" icon={<CreditCard className="text-teal-600" />} />
      </div>

      {/* SOLICITUDES DE INSCRIPCIÓN PENDIENTES */}
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
  const { success: toastSuccess, error: toastError } = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [pendingEnrollments, setPendingEnrollments] = useState<any[]>([]);
  const [activeSubView, setActiveSubView] = useState<'approved' | 'pending'>('approved');
  const [teamSentiment, setTeamSentiment] = useState<{ summary: string, mood: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState('motivacion');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Estados de Detalle Individual de Alumno
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [selectedStudentJournals, setSelectedStudentJournals] = useState<any[]>([]);
  const [aiDiagnosis, setAiDiagnosis] = useState<string>('');
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);

  // Generador de Diagnóstico de Alumno con IA en tiempo real
  const generateDiagnosis = async (student: any) => {
    setLoadingDiagnosis(true);
    setAiDiagnosis('');
    try {
      const statusLabel = getStatus(student.lastActivityAt).label;
      const prompt = `Actúa como un psicólogo conductual de élite y tutor de alto rendimiento. 
      Analiza el perfil conductual de este estudiante:
      - Nombre: ${student.displayName}
      - Curso: ${student.courseTitle}
      - Progreso en el curso: ${student.courseProgress}%
      - Puntos de racha / Energía acumulada: ${student.points || 0} pts
      - Estado del Semáforo de Actividad: ${statusLabel}
      
      Escribe un diagnóstico conductual corto, incisivo y altamente accionable para el coach en español (máximo 150 palabras). 
      Debe contener:
      1. El estado motivacional y de constancia estimado.
      2. Un consejo directo y empático de 1-2 oraciones para que el Coach le envíe hoy mismo para acelerar su transformación.
      Tono formal, profesional, empático y profundamente analítico.`;

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
      if (data.text) {
        setAiDiagnosis(data.text);
      }
    } catch (e: any) {
      console.error("Error generating diagnosis with IA:", e);
      setAiDiagnosis('No se pudo generar el perfil conductual de IA en este momento.');
    } finally {
      setLoadingDiagnosis(false);
    }
  };

  // Efecto secundario al seleccionar un alumno para cargar su historial
  useEffect(() => {
    if (!selectedStudent) {
      setSelectedStudentJournals([]);
      setAiDiagnosis('');
      return;
    }
    // Fetch journals
    const q = query(collection(db, 'journals'), where('userId', '==', selectedStudent.id));
    getDocs(q).then(snap => {
      const list = snap.docs.map(d => ({id: d.id, ...d.data()}));
      list.sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds || a.createdAt?.getTime?.() / 1000 || 0;
        const tB = b.createdAt?.seconds || b.createdAt?.getTime?.() / 1000 || 0;
        return tB - tA;
      });
      setSelectedStudentJournals(list);
    }).catch(e => console.error("Error fetching student journals:", e));

    generateDiagnosis(selectedStudent);
  }, [selectedStudent]);

  const fetchStudentsAndJournals = async () => {
    if (!user) return;
    try {
      const coursesQ = query(collection(db, 'courses'), where('coachId', '==', user.uid));
      const coursesSnap = await getDocs(coursesQ);
      const courseIds = coursesSnap.docs.map(d => d.id);
      const courseTitlesMap = new Map(coursesSnap.docs.map(d => [d.id, d.data().title || 'Curso']));

      if (courseIds.length === 0) {
        setStudents([]);
        setPendingEnrollments([]);
        return;
      }

      const approvedList: any[] = [];
      const pendingList: any[] = [];

      for (const cid of courseIds) {
        const enrollQ = query(collection(db, 'enrollments'), where('courseId', '==', cid));
        const enrollSnap = await getDocs(enrollQ);
        for (const eDoc of enrollSnap.docs) {
          const enrollData = eDoc.data();
          const sId = enrollData.userId;
          const status = enrollData.status || 'approved'; // backward compatible

          const sProfile = await getDoc(doc(db, 'users', sId));
          const profileData = sProfile.exists() ? sProfile.data() : { displayName: enrollData.studentName || 'Alumno', email: enrollData.studentEmail || 'Sin email' };

          const item = {
            id: sId,
            enrollmentId: eDoc.id,
            courseId: cid,
            courseTitle: courseTitlesMap.get(cid) || 'Curso',
            courseProgress: enrollData.progress || 0,
            createdAt: enrollData.createdAt,
            lastActivityAt: profileData.lastActivityAt || null,
            ...profileData
          };

          if (status === 'pending') {
            pendingList.push(item);
          } else {
            approvedList.push(item);
          }
        }
      }

      setStudents(approvedList);
      setPendingEnrollments(pendingList);

      // Fetch Journals to analyze team sentiment
      if (approvedList.length > 0) {
        setAnalyzing(true);
        const studentIds = approvedList.map(s => s.id);
        
        let allJournals: string[] = [];
        
        // Firestore 'in' query has a limit of 10, chunk if necessary
        const fetchJournalsChunk = async (ids: string[]) => {
          const q = query(
            collection(db, 'journals'), 
            where('userId', 'in', ids)
          );
          const snap = await getDocs(q);
          const sorted = [...snap.docs].sort((a, b) => {
            const tA = a.data().createdAt?.seconds || a.data().createdAt?.getTime?.() / 1000 || 0;
            const tB = b.data().createdAt?.seconds || b.data().createdAt?.getTime?.() / 1000 || 0;
            return tB - tA;
          }).slice(0, 20);
          return sorted.map(d => d.data().content);
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

            if (data.text) {
               const parsed = JSON.parse(data.text);
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

  useEffect(() => {
    fetchStudentsAndJournals();
  }, [user]);

  const handleEnrollmentAction = async (enrollmentId: string, action: 'approved' | 'rejected') => {
    try {
      if (action === 'approved') {
        await updateDoc(doc(db, 'enrollments', enrollmentId), { status: 'approved' });
        toastSuccess("Inscripción autorizada correctamente.");
      } else {
        await deleteDoc(doc(db, 'enrollments', enrollmentId));
        toastSuccess("Inscripción rechazada con éxito.");
      }
      fetchStudentsAndJournals();
    } catch (error: any) {
      console.error("Error updating enrollment status:", error);
      toastError("No se pudo procesar la acción: " + error.message);
    }
  };

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
      setSuccessMsg("¡Mensajes enviados exitosamente a todos tus alumnos!");
      setTimeout(() => setSuccessMsg(''), 3000);
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
            {successMsg && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-bold text-center">
                {successMsg}
              </div>
            )}
         </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-in fade-in">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <GraduationCap size={18} className="text-primary" /> Alumnos & Inscripciones
          </h3>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveSubView('approved')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeSubView === 'approved' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Inscritos ({students.length})
            </button>
            <button
              onClick={() => setActiveSubView('pending')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                activeSubView === 'pending' ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Pendientes ({pendingEnrollments.length})
              {pendingEnrollments.length > 0 && (
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              )}
            </button>
          </div>
        </div>
        {activeSubView === 'approved' ? (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estudiante</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Curso Inscrito</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progreso</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Semáforo</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map(s => {
                const status = getStatus(s.lastActivityAt);
                return (
                  <tr 
                    key={s.enrollmentId} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedStudent(s)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                          {s.displayName?.[0] || 'U'}
                        </div>
                        <div>
                          <div className="text-[13px] font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{s.displayName}</div>
                          <div className="text-[10px] text-slate-400">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200">
                        {s.courseTitle}
                      </span>
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
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs italic">
                    Aún no tienes alumnos inscritos en tus cursos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estudiante</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Curso Solicitado</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha Solicitud</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pendingEnrollments.map(s => {
                const formattedDate = s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A';
                return (
                  <tr key={s.enrollmentId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-[10px] font-bold text-amber-600">
                          {s.displayName?.[0] || 'U'}
                        </div>
                        <div>
                          <div className="text-[13px] font-bold text-slate-800">{s.displayName}</div>
                          <div className="text-[10px] text-slate-400">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-amber-50/50 text-amber-800 text-xs font-bold rounded-lg border border-amber-200">
                        {s.courseTitle}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                      {formattedDate}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEnrollmentAction(s.enrollmentId, 'rejected')}
                          className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={() => handleEnrollmentAction(s.enrollmentId, 'approved')}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} /> Autorizar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pendingEnrollments.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-xs italic">
                    No hay solicitudes de inscripción pendientes para tus cursos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DETALLE DE PROGRESO Y COMPORTAMIENTO DEL ALUMNO */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] border border-slate-200 w-full max-w-4xl p-8 lg:p-10 shadow-2xl relative flex flex-col gap-8 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            
            {/* Cabecera del Perfil */}
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-lg font-black text-indigo-600 uppercase">
                  {selectedStudent.displayName?.[0] || 'U'}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{selectedStudent.displayName}</h3>
                  <p className="text-xs text-slate-400 mt-1">{selectedStudent.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Grid Principal */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              
              {/* Columna Izquierda: Métricas e Información de Curso */}
              <div className="md:col-span-5 flex flex-col gap-6">
                <div className="p-6 bg-slate-50 border border-slate-150 rounded-3xl">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Información del Curso</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400">Curso</span>
                      <p className="text-sm font-black text-slate-800 mt-0.5">{selectedStudent.courseTitle}</p>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-400">Progreso de Contenido</span>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full transition-all" style={{ width: `${selectedStudent.courseProgress}%` }} />
                        </div>
                        <span className="text-xs font-black text-slate-700 shrink-0">{selectedStudent.courseProgress}%</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Puntos Energía</span>
                        <p className="text-lg font-black text-slate-800 mt-0.5">{selectedStudent.points || 0} pts</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Semáforo</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={cn("w-2.5 h-2.5 rounded-full", getStatus(selectedStudent.lastActivityAt).color)} />
                          <span className="text-xs font-bold text-slate-700">{getStatus(selectedStudent.lastActivityAt).label}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historial de Diarios en Columna Izquierda para mejor uso de espacio */}
                <div className="p-6 bg-slate-50 border border-slate-150 rounded-3xl flex flex-col">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex justify-between items-center">
                    Bitácoras Conductuales
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                      {selectedStudentJournals.length}
                    </span>
                  </h4>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {selectedStudentJournals.map((j) => {
                      const journalDate = j.createdAt?.toDate ? j.createdAt.toDate().toLocaleDateString() : j.createdAt ? new Date(j.createdAt).toLocaleDateString() : 'N/A';
                      return (
                        <div key={j.id} className="p-4 bg-white border border-slate-100 rounded-2xl">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                            <span>{journalDate}</span>
                            {j.score && <span className="text-indigo-600">Score: {j.score}</span>}
                          </div>
                          <p className="text-[11px] text-slate-700 leading-relaxed italic">"{j.content}"</p>
                        </div>
                      );
                    })}

                    {selectedStudentJournals.length === 0 && (
                      <div className="text-center py-10 text-slate-400 text-xs italic">
                        El estudiante no ha completado entradas de diario todavía.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Diagnóstico Conductual con IA */}
              <div className="md:col-span-7 flex flex-col gap-6">
                <div className="p-8 bg-indigo-950 text-white rounded-[32px] relative overflow-hidden shadow-xl shadow-indigo-900/10 min-h-[300px]">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <Sparkles className="text-amber-300 animate-pulse" size={20} />
                      <h4 className="text-xs font-black uppercase tracking-widest text-indigo-200">Kira Flow™ AI Diagnóstico</h4>
                    </div>

                    {loadingDiagnosis ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3 text-indigo-200">
                        <Loader2 className="animate-spin" size={32} />
                        <span className="text-xs font-bold">Procesando perfil conductual del alumno...</span>
                      </div>
                    ) : aiDiagnosis ? (
                      <div className="space-y-6 animate-in fade-in">
                        <div className="text-sm leading-relaxed text-indigo-50 font-medium">
                          {aiDiagnosis}
                        </div>
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                          <span>Análisis en Tiempo Real</span>
                          <span className="bg-white/10 text-white px-2.5 py-1 rounded-md">Gemini Flash</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-indigo-200 text-xs italic py-12 text-center">No se pudo procesar el perfil en este momento.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// --- MODULO: GESTOR DE CONTRATOS (PARA COACH) ---
function CoachContractManager() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'contracts' | 'templates' | 'course_contracts'>('contracts');
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ title: '', clientName: '', expiresAt: '', templateId: '' });
  const [templateFormData, setTemplateFormData] = useState({ name: '', terms: '', expirationRules: '' });
  const [generatingForCourseId, setGeneratingForCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const qC = query(collection(db, 'contracts'), where('coachId', '==', user.uid));
    const unsubC = onSnapshot(qC, (snap) => {
      const list = snap.docs.map(d => ({id: d.id, ...d.data()}));
      list.sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds || a.createdAt?.getTime?.() / 1000 || 0;
        const tB = b.createdAt?.seconds || b.createdAt?.getTime?.() / 1000 || 0;
        return tB - tA;
      });
      setContracts(list);
    });
    
    const qT = query(collection(db, 'contract_templates'), where('coachId', '==', user.uid));
    const unsubT = onSnapshot(qT, (snap) => {
      const list = snap.docs.map(d => ({id: d.id, ...d.data()}));
      list.sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds || a.createdAt?.getTime?.() / 1000 || 0;
        const tB = b.createdAt?.seconds || b.createdAt?.getTime?.() / 1000 || 0;
        return tB - tA;
      });
      setTemplates(list);
    });

    const qCourses = query(collection(db, 'courses'), where('coachId', '==', user.uid));
    getDocs(qCourses).then((snap) => {
      setCourses(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }).catch(e => console.error(e));
    
    return () => {
      unsubC();
      unsubT();
    };
  }, [user]);

  const generateAIContractForCourse = async (course: any) => {
    if (!user) return;
    setGeneratingForCourseId(course.id);
    try {
      const prompt = `Actúa como un abogado experto internacional especialista en servicios de coaching, e-learning y desarrollo conductual. 
      Escribe un contrato de prestación de servicios educativos completo, formal, robusto y profesional en español para el curso titulado: "${course.title}".
      
      Atributos del curso:
      - Título: ${course.title}
      - Descripción: ${course.description || 'Formación de alto impacto de desarrollo integral.'}
      - Precio: $${course.price || 'Establecido por el Coach'}
      - Modalidad: ${course.modality || 'Online/Asincrónico'}
      
      Estructura el contrato con cláusulas claras de:
      1. Objeto del Contrato (Prestación de servicio educativo y acceso a plataforma Kira Coach).
      2. Obligaciones del Estudiante (Respeto mutuo, confidencialidad, propiedad intelectual).
      3. Términos de Pago e Inscripción (Monto total, penalidades por mora si aplica, no-reembolsos).
      4. Propiedad Intelectual (Los contenidos, videos, audios y textos pertenecen exclusivamente al Coach y no pueden ser redistribuidos).
      5. Limitación de Responsabilidad (El progreso conductual y los resultados dependen del compromiso activo del estudiante).
      6. Jurisdicción y Resolución de Conflictos.
      
      Escribe el contrato de manera que esté listo para ser personalizado con el nombre de cada alumno inscrito.`;

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

      if (data.text) {
        // Create a master template with this AI contract
        await addDoc(collection(db, 'contract_templates'), {
          name: `Contrato Inteligente: ${course.title}`,
          terms: data.text,
          courseId: course.id,
          expirationRules: 'Acceso continuo durante el tiempo de vigencia del curso',
          coachId: user.uid,
          createdAt: new Date()
        });
        alert(`¡Contrato generado con IA exitosamente para el curso: ${course.title}!`);
      }
    } catch (e: any) {
      console.error("Error generating contract with IA:", e);
      alert("Error al generar el contrato con IA: " + e.message);
    } finally {
      setGeneratingForCourseId(null);
    }
  };

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
        <button onClick={() => setActiveSubTab('templates')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", activeSubTab === 'templates' ? "bg-white text-kirateal shadow-sm" : "text-slate-500")}>Plantillas de Contratos</button>
        <button onClick={() => setActiveSubTab('course_contracts')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", activeSubTab === 'course_contracts' ? "bg-white text-kirateal shadow-sm" : "text-slate-500")}>Contratos de Cursos (IA)</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText size={18} className="text-primary" /> 
            {activeSubTab === 'contracts' ? 'Gestión de Contratos' : activeSubTab === 'templates' ? 'Mis Plantillas Maestras' : 'Generador Automático de Contratos por Curso con IA'}
          </h3>
          {activeSubTab !== 'course_contracts' && (
            <button 
              onClick={() => setIsCreating(!isCreating)}
              className="px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-xl shadow-md shadow-primary/10 active:scale-95 transition-all"
            >
              {isCreating ? 'Cancelar' : activeSubTab === 'contracts' ? 'Generar Contrato' : 'Crear Plantilla'}
            </button>
          )}
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

          {activeSubTab === 'course_contracts' && courses.map(course => {
            const hasTemplate = templates.some(t => t.courseId === course.id);
            const isGenerating = generatingForCourseId === course.id;
            return (
              <div key={course.id} className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-all flex flex-col justify-between min-h-48 group shadow-sm">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h4 className="font-bold text-slate-900 text-sm tracking-tight truncate max-w-[180px]">{course.title}</h4>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0",
                      hasTemplate ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                    )}>
                      {hasTemplate ? "Contrato Listo ✓" : "Sin Contrato"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">{course.description || "Sin descripción establecida."}</p>
                  
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 text-[9px] font-bold rounded">
                      ${course.price || "0.00"} USD
                    </span>
                    <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 text-[9px] font-bold rounded">
                      {course.modality || "Online"}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kira AI Engine™</span>
                  {hasTemplate ? (
                    <button 
                      onClick={() => {
                        const t = templates.find(temp => temp.courseId === course.id);
                        if (t) {
                          alert(`Términos del Contrato para ${course.title}:\n\n${t.terms}`);
                        }
                      }}
                      className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      Ver Términos
                    </button>
                  ) : (
                    <button 
                      onClick={() => generateAIContractForCourse(course)}
                      disabled={isGenerating}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1 transition"
                    >
                      {isGenerating ? "Generando..." : "✨ Generar con IA"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {((activeSubTab === 'contracts' && contracts.length === 0) || 
            (activeSubTab === 'templates' && templates.length === 0) ||
            (activeSubTab === 'course_contracts' && courses.length === 0)) && !isCreating && (
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
  const { success: toastSuccess } = useToast();
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

  // Cursos vendidos y alumnos inscritos
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [selectedStudentJournals, setSelectedStudentJournals] = useState<any[]>([]);
  const [aiDiagnosis, setAiDiagnosis] = useState<string>('');
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);

  const fetchSalesAndLogistics = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const qCourses = query(collection(db, 'courses'), where('coachId', '==', user.uid));
      const snapCourses = await getDocs(qCourses);
      const coursesData = snapCourses.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setCourses(coursesData);

      if (coursesData.length > 0) {
        const cIds = coursesData.map(d => d.id);
        const courseMap = new Map<string, any>(coursesData.map(d => [d.id, d]));
        
        const enrollList: any[] = [];
        for (const cid of cIds) {
          const eq = query(collection(db, 'enrollments'), where('courseId', '==', cid));
          const esnap = await getDocs(eq);
          esnap.docs.forEach(ed => {
            const data = ed.data();
            enrollList.push({
              id: ed.id,
              ...data,
              courseTitle: courseMap.get(data.courseId)?.title || 'Curso',
              coursePrice: parseFloat(courseMap.get(data.courseId)?.price) || 0,
            });
          });
        }
        setEnrollments(enrollList);
      } else {
        setEnrollments([]);
      }
    } catch (e) {
      console.error("Error fetching sales/logistics:", e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchSalesAndLogistics();
  }, [user]);

  const generateDiagnosis = async (student: any) => {
    setLoadingDiagnosis(true);
    setAiDiagnosis('');
    try {
      const progress = student.progress || student.courseProgress || 0;
      const prompt = `Actúa como un psicólogo conductual de élite y tutor de alto rendimiento. 
      Analiza el progreso, involucramiento y funcionalidad de este alumno en el curso:
      - Nombre: ${student.studentName || 'Alumno'}
      - Curso: ${student.courseTitle}
      - Progreso de contenido: ${progress}%
      - Correo electrónico: ${student.studentEmail || 'N/A'}
      - Estado: ${student.status || 'approved'}
      
      Escribe un diagnóstico conductual corto, incisivo y altamente accionable para el coach en español (máximo 150 palabras). 
      Debe contener:
      1. Su nivel de disciplina y funcionalidad dentro de la plataforma.
      2. Un consejo directo de 1-2 oraciones para que el Coach interactúe hoy mismo para mantener su momentum o reactivarlo.
      Tono formal, profesional, empático y profundamente analítico.`;

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
      if (data.text) {
        setAiDiagnosis(data.text);
      }
    } catch (e: any) {
      console.error("Error generating diagnosis with IA:", e);
      setAiDiagnosis('No se pudo generar el perfil conductual de IA en este momento.');
    } finally {
      setLoadingDiagnosis(false);
    }
  };

  useEffect(() => {
    if (!selectedStudent) {
      setSelectedStudentJournals([]);
      setAiDiagnosis('');
      return;
    }
    const sUserId = selectedStudent.userId || selectedStudent.id;
    if (sUserId) {
      const q = query(collection(db, 'journals'), where('userId', '==', sUserId));
      getDocs(q).then(snap => {
        const list = snap.docs.map(d => ({id: d.id, ...d.data()}));
        list.sort((a: any, b: any) => {
          const tA = a.createdAt?.seconds || a.createdAt?.getTime?.() / 1000 || 0;
          const tB = b.createdAt?.seconds || b.createdAt?.getTime?.() / 1000 || 0;
          return tB - tA;
        });
        setSelectedStudentJournals(list);
      }).catch(e => console.error("Error fetching journals:", e));
    }
    generateDiagnosis(selectedStudent);
  }, [selectedStudent]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'automations'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({id: d.id, ...d.data()}));
      list.sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds || a.createdAt?.getTime?.() / 1000 || 0;
        const tB = b.createdAt?.seconds || b.createdAt?.getTime?.() / 1000 || 0;
        return tB - tA;
      });
      setRules(list);
    });
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
      toastSuccess("Regla conductual creada exitosamente.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta regla conductual?")) return;
    try {
      await deleteDoc(doc(db, 'automations', id));
      toastSuccess("Regla conductual eliminada correctamente.");
    } catch (err) {
      console.error("Error deleting automation rule:", err);
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
          <button onClick={() => { setActiveCategory('retencion'); setIsAdding(false); }} className={cn("px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all", activeCategory === 'retencion' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}>Retención</button>
          <button onClick={() => { setActiveCategory('ventas'); setIsAdding(false); }} className={cn("px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all", activeCategory === 'ventas' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}>Ventas</button>
          <button onClick={() => { setActiveCategory('logistica'); setIsAdding(false); }} className={cn("px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all", activeCategory === 'logistica' ? "bg-white text-amber-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}>Logística</button>
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
                      <button 
                        onClick={() => handleDelete(rule.id)}
                        className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all"
                      >
                         <Trash2 size={16} />
                      </button>
                   </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* VENTAS SECCIÓN: Cursos Vendidos */}
        {activeCategory === 'ventas' && (
          <div className="mt-12 pt-10 border-t border-slate-100 animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <CreditCard className="text-emerald-600" size={18} />
                  Cursos Vendidos (Métricas de Facturación)
                </h4>
                <p className="text-xs text-slate-500 mt-1">Monitoreo en tiempo real de ingresos generados por cada formación.</p>
              </div>
              <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-wider border border-emerald-100">
                {courses.length} Cursos Activos
              </span>
            </div>

            {loadingData ? (
              <div className="flex items-center gap-2 py-8 justify-center text-slate-400">
                <Loader2 className="animate-spin text-emerald-500" size={20} />
                <span className="text-xs font-bold">Cargando métricas de ventas...</span>
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl text-slate-400 text-xs italic">
                Aún no has creado ningún curso en la plataforma.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => {
                  const courseSales = enrollments.filter(e => e.courseId === course.id);
                  const revenue = courseSales.reduce((acc, curr) => acc + (parseFloat(course.price) || 0), 0);
                  
                  return (
                    <div key={course.id} className="bg-slate-50 border border-slate-150 rounded-3xl p-6 shadow-sm hover:border-emerald-200 hover:bg-emerald-50/10 transition-all">
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-500 text-[9px] font-bold rounded-xl uppercase">
                          {course.modality || "Online"}
                        </span>
                        <span className="text-xs font-black text-emerald-600">${course.price || "0.00"} USD</span>
                      </div>
                      <h5 className="text-[13px] font-black text-slate-900 leading-snug line-clamp-2">{course.title}</h5>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{course.description || "Sin descripción establecida."}</p>
                      
                      <div className="mt-5 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Ventas</span>
                          <span className="text-xs font-black text-slate-800">{courseSales.length} Alumnos</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Facturación</span>
                          <span className="text-xs font-black text-emerald-600">${revenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* LOGÍSTICA SECCIÓN: Alumnos Inscritos */}
        {activeCategory === 'logistica' && (
          <div className="mt-12 pt-10 border-t border-slate-100 animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <GraduationCap className="text-amber-600" size={18} />
                  Logística de Alumnos: Progreso e Inscripciones
                </h4>
                <p className="text-xs text-slate-500 mt-1">Presiona sobre cualquier alumno para auditar su funcionalidad, progreso e IA Insights de Kira.</p>
              </div>
              <span className="px-3.5 py-1.5 bg-amber-50 text-amber-700 text-[10px] font-black rounded-full uppercase tracking-wider border border-amber-100">
                {enrollments.length} Inscripciones
              </span>
            </div>

            {loadingData ? (
              <div className="flex items-center gap-2 py-8 justify-center text-slate-400">
                <Loader2 className="animate-spin text-amber-500" size={20} />
                <span className="text-xs font-bold">Cargando logística de alumnos...</span>
              </div>
            ) : enrollments.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl text-slate-400 text-xs italic">
                No hay alumnos inscritos en tus cursos actualmente.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-[28px] overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Alumno</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Curso Adquirido</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Progreso de Contenido</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado de Acceso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map(st => (
                      <tr 
                        key={st.id} 
                        onClick={() => setSelectedStudent(st)}
                        className="hover:bg-amber-50/20 border-b border-slate-100 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-all uppercase">
                              {st.studentName?.[0] || 'U'}
                            </div>
                            <div>
                              <div className="text-[13px] font-black text-slate-800 group-hover:text-amber-700 transition-colors">{st.studentName || 'Alumno'}</div>
                              <div className="text-[10px] text-slate-400 leading-none mt-0.5">{st.studentEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-600">{st.courseTitle}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-slate-150 rounded-full overflow-hidden max-w-[120px]">
                              <div className="bg-amber-500 h-full transition-all" style={{ width: `${st.progress || 0}%` }} />
                            </div>
                            <span className="text-[11px] font-black text-slate-700">{st.progress || 0}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                              st.status === 'approved' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                            )}>
                              {st.status === 'approved' ? "Acceso Listo" : "Pendiente"}
                            </span>
                            <span className="text-[11px] font-bold text-indigo-600 group-hover:underline opacity-0 group-hover:opacity-100 transition-opacity">Ver Detalles →</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                  <button 
                    onClick={() => toastSuccess("Generando informe predictivo de comportamiento de alumnos de Kira AI... Listo en instantes.")}
                    className="w-full py-4 bg-white/10 hover:bg-white text-white hover:text-indigo-900 border border-white/20 hover:border-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all animate-pulse"
                  >
                     Ver Reporte IA
                  </button>
               </div>
            </div>
         </div>
      </div>

      {/* MODAL INTERACTIVO DE PROGRESO Y FUNCIONALIDAD DEL ALUMNO */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] border border-slate-200 w-full max-w-4xl p-8 lg:p-10 shadow-2xl relative flex flex-col gap-8 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            
            {/* Cabecera del Perfil */}
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-lg font-black text-amber-600 uppercase">
                  {selectedStudent.studentName?.[0] || 'U'}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{selectedStudent.studentName || 'Alumno'}</h3>
                  <p className="text-xs text-slate-400 mt-1">{selectedStudent.studentEmail}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Grid Principal */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              
              {/* Columna Izquierda: Métricas e Información de Curso */}
              <div className="md:col-span-5 flex flex-col gap-6">
                <div className="p-6 bg-slate-50 border border-slate-150 rounded-3xl">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Progreso del Alumno</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400">Curso Activo</span>
                      <p className="text-sm font-black text-slate-800 mt-0.5">{selectedStudent.courseTitle}</p>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-400">Progreso Registrado</span>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full transition-all" style={{ width: `${selectedStudent.progress || 0}%` }} />
                        </div>
                        <span className="text-xs font-black text-slate-700 shrink-0">{selectedStudent.progress || 0}%</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Inscripción</span>
                        <p className="text-xs font-black text-slate-800 mt-0.5">Manual / Aut.</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Estado</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={cn("w-2 h-2 rounded-full", selectedStudent.status === 'approved' ? "bg-emerald-500" : "bg-amber-500")} />
                          <span className="text-xs font-bold text-slate-700 capitalize">{selectedStudent.status || 'approved'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historial de Bitácoras Conductuales */}
                <div className="p-6 bg-slate-50 border border-slate-150 rounded-3xl flex flex-col">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex justify-between items-center">
                    Bitácoras Conductuales
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                      {selectedStudentJournals.length}
                    </span>
                  </h4>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {selectedStudentJournals.map((j) => {
                      const journalDate = j.createdAt?.toDate ? j.createdAt.toDate().toLocaleDateString() : j.createdAt ? new Date(j.createdAt).toLocaleDateString() : 'N/A';
                      return (
                        <div key={j.id} className="p-4 bg-white border border-slate-100 rounded-2xl">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                            <span>{journalDate}</span>
                            {j.score && <span className="text-indigo-600">Score: {j.score}</span>}
                          </div>
                          <p className="text-[11px] text-slate-700 leading-relaxed italic">"{j.content}"</p>
                        </div>
                      );
                    })}

                    {selectedStudentJournals.length === 0 && (
                      <div className="text-center py-10 text-slate-400 text-xs italic">
                        El estudiante no ha completado entradas de diario todavía.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Diagnóstico Conductual con IA */}
              <div className="md:col-span-7 flex flex-col gap-6">
                <div className="p-8 bg-indigo-950 text-white rounded-[32px] relative overflow-hidden shadow-xl shadow-indigo-900/10 min-h-[300px]">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <Sparkles className="text-amber-300 animate-pulse" size={20} />
                      <h4 className="text-xs font-black uppercase tracking-widest text-indigo-200">Kira Flow™ AI Diagnóstico de Progreso</h4>
                    </div>

                    {loadingDiagnosis ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3 text-indigo-200">
                        <Loader2 className="animate-spin" size={32} />
                        <span className="text-xs font-bold">Procesando perfil conductual del alumno...</span>
                      </div>
                    ) : aiDiagnosis ? (
                      <div className="space-y-6 animate-in fade-in">
                        <div className="text-sm leading-relaxed text-indigo-50 font-medium">
                          {aiDiagnosis}
                        </div>
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                          <span>Análisis en Tiempo Real</span>
                          <span className="bg-white/10 text-white px-2.5 py-1 rounded-md">Gemini Flash</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-indigo-200 text-xs italic py-12 text-center">No se pudo procesar el perfil en este momento.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function CoachRegisterClient() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', courseId: '' });
  const [courses, setCourses] = useState<any[]>([]);
  const [onboardingList, setOnboardingList] = useState<any[]>([]);

  const fetchOnboardingData = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'courses'), where('coachId', '==', user.uid));
      const snap = await getDocs(q);
      const coursesData = snap.docs.map(d => ({id: d.id, ...d.data()})) as any[];
      setCourses(coursesData);

      if (coursesData.length > 0) {
        const cIds = coursesData.map(d => d.id);
        const courseTitles = new Map<string, any>(coursesData.map(d => [d.id, d.title]));
        
        const enrollList: any[] = [];
        for (const cid of cIds) {
          const eq = query(collection(db, 'enrollments'), where('courseId', '==', cid));
          const esnap = await getDocs(eq);
          esnap.docs.forEach(ed => {
            const data = ed.data();
            enrollList.push({
              id: ed.id,
              ...data,
              courseTitle: courseTitles.get(data.courseId) || 'Curso'
            });
          });
        }
        enrollList.sort((a, b) => {
          const tA = a.createdAt?.seconds || a.createdAt?.getTime?.() / 1000 || 0;
          const tB = b.createdAt?.seconds || b.createdAt?.getTime?.() / 1000 || 0;
          return tB - tA;
        });
        setOnboardingList(enrollList);
      }
    } catch (e) {
      console.error("Error fetching onboarding data:", e);
    }
  };

  useEffect(() => {
    fetchOnboardingData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      console.log(`[Registro Alumno] Registrando nuevo alumno con email: ${formData.email}...`);
      
      // 1. Create User Document
      const userRef = await addDoc(collection(db, 'users'), {
        displayName: formData.name,
        email: formData.email,
        role: 'alumno',
        createdAt: new Date(),
        registeredByCoach: user?.uid,
        points: 0,
        status: 'awaiting_login'
      });
      
      console.log(`[Registro Alumno] Alumno creado con ID: ${userRef.id}. Ejecutando acciones secundarias en paralelo...`);
 
      const secondaryTasks: Promise<any>[] = [];
 
      // 2. Enroll in course if selected
      if (formData.courseId) {
        console.log(`[Registro Alumno] Agregando inscripción para el curso: ${formData.courseId}...`);
        secondaryTasks.push(
          addDoc(collection(db, 'enrollments'), {
            userId: userRef.id,
            courseId: formData.courseId,
            coachId: user?.uid,
            studentName: formData.name,
            studentEmail: formData.email,
            courseTitle: courses.find(c => c.id === formData.courseId)?.title || 'Curso',
            progress: 0,
            status: 'approved', // Manual registers are auto-approved
            createdAt: new Date()
          })
        );
      }
 
      // 3. Create initial notification
      secondaryTasks.push(
        addDoc(collection(db, 'notifications'), {
          userId: userRef.id,
          title: '¡Bienvenido a Kira Coach!',
          message: `Has sido registrado por tu coach. Completa tu primer diario hoy.`,
          read: false,
          createdAt: new Date(),
          type: 'system'
        })
      );
 
      // Execute dependent tasks in parallel
      await Promise.all(secondaryTasks);
      console.log(`[Registro Alumno] Acciones secundarias completadas exitosamente.`);
 
      setSuccess(true);
      setFormData({ name: '', email: '', courseId: '' });
      fetchOnboardingData();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error('[Registro Alumno] Error al registrar alumno:', e);
      setError('Error registrando alumno.');
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in">
      {/* FORMULARIO DE REGISTRO */}
      <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Registro Manual de Alumno</h3>
          <p className="text-xs text-slate-500 mt-1">Registra a un cliente de forma manual y asígnale un curso activo.</p>
        </div>
 
        {error && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold text-center">
            {error}
          </div>
        )}
 
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Nombre Completo</label>
            <input 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              placeholder="Ej: Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Correo Electrónico</label>
            <input 
              required
              type="email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              placeholder="juan@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Asignar a Curso (Opcional)</label>
            <select 
              value={formData.courseId}
              onChange={e => setFormData({...formData, courseId: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
            >
              <option value="">Ninguno</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
 
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold shadow-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2 mt-4 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? "Procesando..." : success ? <><CheckCircle2 size={16}/> ¡Registrado!</> : "Dar de Alta"}
          </button>
        </form>
      </div>

      {/* LISTA DE ALUMNOS EN ONBOARDING */}
      <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Onboarding Queue</h3>
            <p className="text-xs text-slate-500 mt-1">Lista de alumnos asignados a tus respectivos cursos.</p>
          </div>
          <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-wider">
            {onboardingList.length} Alumnos
          </span>
        </div>

        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
          {onboardingList.map((st) => {
            const enrollDate = st.createdAt?.toDate ? st.createdAt.toDate().toLocaleDateString() : st.createdAt ? new Date(st.createdAt).toLocaleDateString() : 'N/A';
            return (
              <div key={st.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-4 hover:border-indigo-100 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-600 uppercase shrink-0">
                    {st.studentName?.[0] || 'U'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-800 leading-tight truncate">{st.studentName || 'Sin nombre'}</h4>
                    <p className="text-[10px] text-slate-400 truncate">{st.studentEmail}</p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 bg-white border border-slate-100 text-slate-500 text-[9px] font-bold rounded">
                        {st.courseTitle}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                    st.status === 'approved' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                  )}>
                    {st.status === 'approved' ? "Acceso Listo" : "Pendiente"}
                  </span>
                  <p className="text-[9px] text-slate-400 mt-1.5 font-medium">Registrado: {enrollDate}</p>
                </div>
              </div>
            );
          })}

          {onboardingList.length === 0 && (
            <div className="py-16 text-center text-slate-400 text-xs italic">
              Aún no tienes alumnos registrados en Onboarding.
            </div>
          )}
        </div>
      </div>
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
  const { success: toastSuccess, error: toastError } = useToast();
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
    // Robust URL check helper
    const isValidUrl = (str: string) => {
      try {
        const u = new URL(str);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    };
    const photoRegex = /\.(jpeg|jpg|gif|png|webp|svg)((\?.*)?|$)/i;
    const calendlyRegex = /calendly\.com\/[a-zA-Z0-9_\-]+(\/[a-zA-Z0-9_\-]+)?/i;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    const vimeoRegex = /^(https?:\/\/)?(www\.)?(vimeo\.com)\/.+$/;

    if (!formData.displayName.trim()) return "El nombre público es obligatorio.";
    if (formData.specialties.length === 0) return "Debes seleccionar al menos una especialidad profesional.";
    
    // Bio validation (strip HTML tags to check if there is actual text)
    const bioText = formData.bio.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
    if (!bioText) return "La biografía es obligatoria para presentarte ante tus alumnos.";
    
    if (formData.photoURL && !formData.photoURL.startsWith('data:image/')) {
      if (!isValidUrl(formData.photoURL)) return "El formato de la URL de la foto no es válido.";
      if (!photoRegex.test(formData.photoURL) && 
          !formData.photoURL.includes('firebasestorage.googleapis.com') && 
          !formData.photoURL.includes('unsplash.com')) {
         return "La URL de la foto debe terminar en una extensión de imagen válida (jpg, png, etc.) o ser de Firebase Storage/Unsplash.";
      }
    }
    
    if (formData.calendlyUrl) {
      if (!calendlyRegex.test(formData.calendlyUrl)) {
        return "El enlace de Calendly no tiene un formato válido (ej: calendly.com/tu-usuario).";
      }
    }

    if (formData.welcomeVideoUrl) {
      const isDirectVideo = isValidUrl(formData.welcomeVideoUrl) && 
        (formData.welcomeVideoUrl.match(/\.(mp4|webm|ogg)$/i) || 
         formData.welcomeVideoUrl.includes('firebasestorage.googleapis.com') ||
         formData.welcomeVideoUrl.includes('unsplash.com'));
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
    
    console.log("[Perfil Coach] Iniciando proceso de guardado de perfil...");
    const validationError = validate();
    if (validationError) {
      console.warn("[Perfil Coach] Error de validación al guardar:", validationError);
      setError(validationError);
      toastError(`Error de validación: ${validationError}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError(null);

    // Secondary base64 image size guard before saving
    if (formData.photoURL && formData.photoURL.startsWith('data:image/')) {
      const photoSizeInBytes = Math.round((formData.photoURL.length - 'data:image/jpeg;base64,'.length) * 3 / 4);
      const photoSizeKB = photoSizeInBytes / 1024;
      console.log(`[Perfil Coach] Foto de perfil en formato Base64 detectada. Tamaño: ${photoSizeKB.toFixed(2)} KB`);
      
      if (photoSizeInBytes > 2 * 1024 * 1024) {
        const sizeError = "La foto de perfil supera el límite absoluto de 2MB. Por favor, selecciona otra imagen o comp rímela antes de guardar.";
        setError(sizeError);
        toastError(sizeError);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        mediaItems,
        updatedAt: new Date()
      };
      
      console.log("[Perfil Coach] Iniciando escrituras paralelas a Firestore...");
      
      // Separate promises so that notification errors do not block or crash the profile update
      const saveUserPromise = updateDoc(doc(db, 'users', user.uid), payload);
      
      const saveNotificationPromise = addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        title: 'Perfil Sincronizado',
        message: 'Tu perfil académico y portafolio de recursos fueron guardados exitosamente.',
        read: false,
        createdAt: new Date(),
        type: 'system'
      }).catch(err => {
        console.warn("[Perfil Coach] Error no crítico al guardar notificación de sistema:", err);
        return null; // Ignore notification failures to avoid blocking the profile save
      });

      // Race with a 5-second timeout to handle slow connection queues or iframe sandboxing
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout: Sincronización en segundo plano activa")), 5000)
      );

      try {
        await Promise.race([
          Promise.all([saveUserPromise, saveNotificationPromise]),
          timeoutPromise
        ]);
        console.log("[Perfil Coach] Guardado completado con éxito.");
        setSuccess(true);
        toastSuccess("¡Perfil y portafolio guardados exitosamente!");
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: any) {
        if (err.message === "Timeout: Sincronización en segundo plano activa") {
          console.warn("[Perfil Coach] El servidor está tardando. Sincronización local activa.");
          // Since IndexedDB persistence is active, Firestore will sync in the background
          setSuccess(true);
          toastSuccess("Guardado local activo. Tus datos se sincronizarán al detectar conexión estable.");
          setTimeout(() => setSuccess(false), 3000);
        } else {
          throw err; // Re-throw actual errors to be handled by the outer catch
        }
      }
    } catch (e: any) {
      console.error("[Perfil Coach] Error fatal al guardar el perfil:", e);
      let errorMsg = e instanceof Error ? e.message : String(e);
      
      try {
        const parsed = JSON.parse(errorMsg);
        if (parsed && parsed.error) {
          errorMsg = parsed.error;
        }
      } catch (err) {
        // Not JSON
      }

      let userFriendlyError = "Error al guardar el perfil. Por favor, verifica tu conexión.";
      if (errorMsg.includes("permission-denied") || errorMsg.toLowerCase().includes("permission") || errorMsg.toLowerCase().includes("insufficient")) {
        userFriendlyError = "Permiso denegado por las reglas de seguridad de Firestore. El documento excede los límites permitidos (comprime tu foto de perfil a menos de 500KB o reduce el tamaño de tus recursos adjuntos).";
      } else {
        userFriendlyError = errorMsg;
      }
      setError(userFriendlyError);
      toastError(userFriendlyError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        })
      });
      const dataJson = await res.json();
      if (dataJson.error) throw new Error(dataJson.error);

      const data = JSON.parse(dataJson.text || '{}');
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

    // If it is an image file (e.g. photo or infographic), convert directly to optimized Base64 to bypass storage upload
    if (file.type.startsWith('image/')) {
      if (file.size > 2 * 1024 * 1024) {
        toastError("La imagen excede el límite máximo de 2MB. Por favor, selecciona un archivo más pequeño.");
        setUploading(null);
        e.target.value = '';
        return;
      }
      try {
        const base64Url = await resizeAndConvertToBase64(file);
        if (type === 'photo') {
          setFormData(prev => ({ ...prev, photoURL: base64Url }));
          toastSuccess("Foto de perfil optimizada y cargada.");
        } else if (type === 'resource') {
          setNewMedia(prev => ({ ...prev, url: base64Url, type: 'imagen' }));
          toastSuccess("Imagen de recurso optimizada y cargada.");
        }
        setUploading(null);
        e.target.value = '';
        return;
      } catch (err: any) {
        console.error("Error compressing image to base64, trying standard upload fallback:", err);
        toastError("Error al comprimir la imagen. Intentando carga estándar...");
      }
    }

    // Detect if storage is empty, mock, or custom placeholder to simulate download immediately
    const storageBucket = storage.app.options.storageBucket || '';
    const isMock = !storageBucket || storageBucket.includes('YOUR_PROJECT') || storageBucket === 'placeholder-value';

    if (isMock) {
      setTimeout(() => {
        let mockUrl = '';
        if (file.type.startsWith('image/')) {
          mockUrl = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600';
        } else if (file.type.startsWith('video/')) {
          mockUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
        } else {
          mockUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
        }

        if (type === 'photo') setFormData(prev => ({ ...prev, photoURL: mockUrl }));
        else if (type === 'welcome') setFormData(prev => ({ ...prev, welcomeVideoUrl: mockUrl }));
        else if (type === 'resource') setNewMedia(prev => ({ ...prev, url: mockUrl, type: file.type.includes('pdf') ? 'pdf' : file.type.includes('video') ? 'video' : 'imagen' }));

        setUploading(null);
        alert(`[Simulador] Archivo "${file.name}" cargado con éxito en modo de desarrollo.`);
      }, 1000);
      return;
    }

    try {
      const storageRef = ref(storage, `coaches/${user.uid}/${type}_${Date.now()}_${file.name}`);
      
      // Agregamos un timeout de 10s para evitar que la UI se congele si Firebase Storage falla
      const uploadPromise = uploadBytes(storageRef, file);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout: Verifica las reglas de Firebase Storage")), 10000));
      
      const uploadResult = await Promise.race([uploadPromise, timeoutPromise]) as any;
      const url = await getDownloadURL(uploadResult.ref);
      
      if (type === 'photo') setFormData(prev => ({ ...prev, photoURL: url }));
      else if (type === 'welcome') setFormData(prev => ({ ...prev, welcomeVideoUrl: url }));
      else if (type === 'resource') setNewMedia(prev => ({ ...prev, url: url, type: file.type.includes('pdf') ? 'pdf' : file.type.includes('video') ? 'video' : 'imagen' }));

      setUploading(null);
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Error al subir ${type}: ${errorMsg}. ¿Tienes Firebase Storage configurado?`);
      setUploading(null);
    } finally {
      // Resetear el input para permitir seleccionar el mismo archivo
      e.target.value = '';
    }
  };

  const handleAddMedia = () => {
    if (!newMedia.title || !newMedia.url) return;
    if (mediaItems.length >= 8) {
      setError("Límite máximo de 8 recursos alcanzado.");
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
    <div className="relative flex flex-col gap-8 animate-in slide-in-from-bottom-2">
      {/* Global Loader Overlay to prevent user action while saving */}
      {loading && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white border border-slate-100 p-8 rounded-3xl flex flex-col items-center gap-4 max-w-sm text-center shadow-2xl">
            <Loader2 className="animate-spin text-kirateal" size={40} />
            <h4 className="text-slate-900 font-black uppercase text-sm tracking-widest mt-2">Sincronizando Sistemas</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Guardando tu perfil élite y portafolio académico en paralelo con la base de datos de Firestore. Por favor, no cierres esta ventana.
            </p>
          </div>
        </div>
      )}

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
            <div className="space-y-2 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Especialidades</label>
              <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                {specialtiesList.map(s => {
                  const isChecked = formData.specialties.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        const newSpecs = isChecked 
                          ? formData.specialties.filter(x => x !== s)
                          : [...formData.specialties, s];
                        setFormData({...formData, specialties: newSpecs, specialty: newSpecs[0] || ''});
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer select-none",
                        isChecked 
                          ? "bg-kirateal/10 border-kirateal text-kirateal-dark shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800"
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
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
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Foto de Perfil (Web Pública - Servicios)</label>
            <p className="text-[10px] text-slate-500 px-1 mb-1">Personaliza la foto que verán tus futuros alumnos en la web inicial.</p>
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
            <RichTextEditor 
              value={formData.bio || ''}
              onChange={(val) => setFormData({...formData, bio: val})}
              placeholder="Cuenta tu trayectoria y metodología..."
              className="bg-white border border-slate-200"
            />
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
  const { success: toastSuccess, error: toastError } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [bannerUrl, setBannerUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(d => {
        if(d.exists()) setProfile(d.data());
      });
      fetchCourses();
      fetchPendingRequests();
    }
  }, [user]);

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
      console.error("Error fetching pending enrollments in CoachCourses:", e);
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
      console.error("Error updating enrollment status:", error);
      setErrorMsg("No se pudo procesar la acción: " + error.message);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

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

  const handleCancel = () => {
    setIsCreating(false);
    setEditingCourse(null);
    setTitle('');
    setDescription('');
    setPrice(0);
    setBannerUrl('');
  };

  const handleEditClick = (course: any) => {
    setEditingCourse(course);
    setTitle(course.title || '');
    setDescription(course.description || '');
    setPrice(course.price || 0);
    setBannerUrl(course.bannerUrl || '');
    setIsCreating(false);
  };

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
      handleCancel();
      fetchCourses();
      toastSuccess("Curso creado exitosamente.");
    } catch(e) {
      console.error(e);
      setErrorMsg('Error creando curso. Asegúrate de estar aprobado.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isApproved || !editingCourse) return;
    try {
      await updateDoc(doc(db, 'courses', editingCourse.id), {
        title,
        description,
        price: Number(price),
        bannerUrl,
        updatedAt: new Date()
      });
      handleCancel();
      fetchCourses();
      toastSuccess("Curso actualizado exitosamente.");
    } catch(e) {
      console.error(e);
      setErrorMsg('Error actualizando curso.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  const generateAiContent = async () => {
    if (!title && !description) {
      setErrorMsg("Por favor, introduce al menos un título o tema para que Kira AI pueda ayudarte.");
      setTimeout(() => setErrorMsg(''), 5000);
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

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        })
      });
      const dataJson = await res.json();
      if (dataJson.error) throw new Error(dataJson.error);

      const data = JSON.parse(dataJson.text || '{}');

      setTitle(data.title || title);
      setDescription((data.description || description) + "\n\n### Temario Propuesto:\n" + (data.syllabus || ""));
    } catch (e) {
      console.error("AI Generation Error:", e);
      setErrorMsg("Hubo un error al generar el contenido. Por favor intenta de nuevo.");
      setTimeout(() => setErrorMsg(''), 5000);
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
          onClick={() => {
            if (isCreating || editingCourse) {
              handleCancel();
            } else {
              setIsCreating(true);
            }
          }}
          className={cn(
            "px-6 py-2.5 rounded-xl text-[12px] font-bold shadow-md transition-all active:scale-95",
            (isCreating || editingCourse)
              ? "bg-slate-100 text-slate-600 shadow-none" 
              : "bg-primary text-white shadow-primary/10 hover:shadow-primary/20"
          )}
        >
          {(isCreating || editingCourse) ? 'Cancelar' : 'Crear Nuevo Curso'}
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-bold flex items-center gap-2">
          <AlertTriangle size={18} /> {errorMsg}
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-sm">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base tracking-tight">Solicitudes de Inscripción Pendientes</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Alumnos esperando tu autorización para acceder a tus programas.</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-2">
            {pendingRequests.map(req => {
              const formattedDate = req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Reciente';
              return (
                <div key={req.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-600 uppercase shadow-inner">
                      {req.studentName?.[0] || 'U'}
                    </div>
                    <div>
                      <div className="text-[13px] font-black text-slate-800 flex items-center gap-2">
                        {req.studentName}
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg border border-amber-100 uppercase tracking-wider">
                          Pendiente
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">{req.studentEmail}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Curso Solicitado</div>
                      <div className="text-xs font-bold text-slate-800">{req.courseTitle}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha</div>
                      <div className="text-xs font-medium text-slate-500">{formattedDate}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 md:ml-4">
                      <button
                        onClick={() => handleEnrollmentAction(req.id, 'rejected')}
                        className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => handleEnrollmentAction(req.id, 'approved')}
                        className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 size={13} /> Autorizar Ingreso
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(isCreating || editingCourse) && (
        <form onSubmit={editingCourse ? handleUpdate : handleCreate} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900 text-base tracking-tight">
              {editingCourse ? 'Editar Curso' : 'Diseño de Curriculum'}
            </h3>
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
          <div className="flex justify-end gap-3">
            <button 
              type="button" 
              onClick={handleCancel} 
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button type="submit" className="px-8 py-3 bg-kirateal text-white rounded-xl font-bold shadow-lg shadow-kirateal/20 hover:bg-kirateal-dark hover:shadow-xl transition-all active:scale-95">
              {editingCourse ? 'Guardar Cambios' : 'Publicar Programa'}
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
                <button 
                  onClick={() => handleEditClick(c)}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                   Editar <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {courses.length === 0 && !isCreating && !editingCourse && (
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
