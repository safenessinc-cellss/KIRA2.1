import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/Logo';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, updateDoc, doc, where, orderBy, limit, addDoc, onSnapshot, getDocs, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Users, LayoutDashboard, UserCheck, BookOpen, BarChart3, ShieldAlert, ShoppingBag, CreditCard, Star, Clock, AlertCircle, Ban, CheckCircle2, ShieldCheck, AlertTriangle, XCircle, Zap, FileText, Settings, HeartPulse, Loader2, Layout, Sliders, PlayCircle, UploadCloud, Send, Sparkles, TrendingUp, Activity, ChevronDown, ChevronRight, Eye, Trash2, PieChart as PieChartIcon, Search } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import { ImageUpload } from '../components/ImageUpload';
import { cn } from '../lib/utils';

type AdminTab = 'dashboard' | 'approvals' | 'students' | 'coaches' | 'members' | 'contracts' | 'content' | 'automation' | 'analytics' | 'security' | 'transactions' | 'campaign_history' | 'website' | 'settlement' | 'ai_coaches' | 'promotions';

export function AdminMonitor() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [profile, setProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      const unsub = onSnapshot(doc(db, 'users', user.uid), (d) => {
        setProfile(d.data());
      });
      return () => unsub();
    }
  }, [user]);

  const isSuperAdmin = user?.email === 'safeness.c.a@gmail.com';
  const perms = profile?.staffPermissions || [];

  const hasPerm = (item: any) => {
    if (isSuperAdmin || perms.includes('system')) return true;
    if (item.perm && perms.includes(item.perm)) return true;
    if (perms.includes(item.id)) return true;
    return false;
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Ejecutivo', icon: <LayoutDashboard size={18}/>, category: 'Centro de Mando' },
    { id: 'analytics', label: 'Business Intelligence', icon: <TrendingUp size={18}/>, category: 'Centro de Mando', perm: 'system' },

    { id: 'security', label: 'Control de Identidad', icon: <ShieldCheck size={18}/>, category: 'Gobernanza y Acceso', superOnly: true },
    { id: 'campaign_history', label: 'Ciberseguridad y Logs', icon: <ShieldAlert size={18}/>, category: 'Gobernanza y Acceso', perm: 'system' },
    { id: 'ai_coaches', label: 'IA para Coaches', icon: <Sparkles size={18}/>, category: 'Gobernanza y Acceso', perm: 'system' },

    { id: 'coaches', label: 'Estrategia de Coaches', icon: <UserCheck size={18}/>, category: 'Operaciones Académicas', perm: 'users' },
    { id: 'students', label: 'Directorio 360 de Alumnos', icon: <Users size={18}/>, category: 'Operaciones Académicas', perm: 'users' },
    { id: 'content', label: 'CMS Académico', icon: <ShoppingBag size={18}/>, category: 'Operaciones Académicas', perm: 'billing' },

    { id: 'promotions', label: 'Gestión de Promociones', icon: <Star size={18}/>, category: 'Crecimiento y Marketing', perm: 'billing' },
    { id: 'settlement', label: 'Centro de Liquidación', icon: <PieChartIcon size={18}/>, category: 'Motor Financiero', perm: 'billing' },
    { id: 'transactions', label: 'Finanzas Globales', icon: <CreditCard size={18}/>, category: 'Motor Financiero', perm: 'billing' },
  ];

  const filteredNav = navItems.filter(item => {
    if (item.superOnly && !isSuperAdmin) return false;
    if (!item.superOnly && !hasPerm(item)) return false;
    if (searchQuery && !item.label.toLowerCase().includes(searchQuery.toLowerCase()) && !item.category.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Centro de Mando': true,
    'Gobernanza y Acceso': true,
    'Operaciones Académicas': true,
    'Crecimiento y Marketing': true,
    'Motor Financiero': true
  });

  const categories = Array.from(new Set(filteredNav.map(n => n.category)));

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Variables auxiliares para evitar errores de sintaxis
  const hasDashboardPerm = hasPerm({ id: 'dashboard' });
  const hasAnalyticsPerm = hasPerm({ id: 'analytics' });
  const hasCampaignHistoryPerm = hasPerm({ id: 'campaign_history' });
  const hasAICoachesPerm = hasPerm({ id: 'ai_coaches' });
  const hasCoachesPerm = hasPerm({ id: 'coaches' });
  const hasStudentsPerm = hasPerm({ id: 'students' });
  const hasContentPerm = hasPerm({ id: 'content' });
  const hasPromotionsPerm = hasPerm({ id: 'promotions' });
  const hasSettlementPerm = hasPerm({ id: 'settlement' });
  const hasTransactionsPerm = hasPerm({ id: 'transactions' });

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Sidebar Refinada */}
      <div className="w-full md:w-72 flex flex-col gap-4">
        
        {/* 👇 LOGO EN EL SIDEBAR 👇 */}
        <div className="flex justify-center pt-4 pb-2 border-b border-slate-100">
          <Logo size="lg" withText textClassName="text-xl" />
        </div>
        
        {/* Command Center Omnibar */}
        <div className="relative group mb-2">
           <Zap className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={16} />
           <input 
             type="text" 
             placeholder="Omnibar: Búsqueda y acciones..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-12 py-3 text-[13px] outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 shadow-sm transition-all"
           />
           <div className="absolute right-4 top-3.5 flex items-center justify-center bg-slate-100 w-6 h-6 rounded text-slate-400 font-bold text-[10px] border border-slate-200 shadow-inner">
             ⌘K
           </div>
        </div>
        
        {isSuperAdmin && (
           <button 
             onClick={async () => {
               const confirmSeed = window.confirm("¿Generar datos de prueba en la base de datos vacía? Esto simulará promociones, transacciones y alumnos.");
               if (!confirmSeed) return;
               try {
                  await addDoc(collection(db, 'promotions'), {
                     title: 'Beca KIRA 2026',
                     description: 'Descuento especial por registro.',
                     code: 'Beca2026',
                     type: 'Descuento',
                     status: 'active',
                     priority: 1,
                     createdAt: new Date().toISOString()
                  });
                  await addDoc(collection(db, 'transactions'), {
                     amount: 149.00,
                     type: 'payment',
                     status: 'completed',
                     description: 'Plan Premium',
                     userEmail: 'demo@user.com',
                     createdAt: new Date().toISOString()
                  });
                  alert('Datos semilla generados con éxito.');
               } catch(e) {
                  console.error(e);
               }
             }}
             className="w-full justify-center flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-md"
           >
             <Zap size={14} className="text-amber-400" /> Cargar Demo Data Inicial
           </button>
        )}

        <div className="flex flex-col gap-2">
          {categories.map(cat => (
            <div key={cat} className="flex flex-col mb-1">
              <button 
                onClick={() => toggleCategory(cat)}
                className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 rounded-xl transition-colors text-left"
              >
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{cat}</span>
                <span className="text-slate-400">
                  {expandedCategories[cat] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              </button>
              
              <div className={cn("flex flex-col gap-1 mt-1 overflow-hidden transition-all duration-300 ease-in-out px-2", expandedCategories[cat] ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0")}>
                {filteredNav.filter(n => n.category === cat).map(item => (
                  <NavButton 
                    key={item.id}
                    active={activeTab === item.id} 
                    onClick={() => setActiveTab(item.id as AdminTab)} 
                    icon={item.icon} 
                    label={item.label} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Área de Contenido del Módulo */}
      <div className="flex-1 min-w-0">
        {activeTab === 'dashboard' && hasDashboardPerm && <GlobalDashboardView />}
        {activeTab === 'analytics' && hasAnalyticsPerm && <BIView />}
        {activeTab === 'security' && isSuperAdmin && <SecurityView />}
        {activeTab === 'campaign_history' && hasCampaignHistoryPerm && <CampaignHistoryView />}
        {activeTab === 'ai_coaches' && hasAICoachesPerm && <AICoachesView />}
        {activeTab === 'coaches' && hasCoachesPerm && <CoachCuratorView />}
        {activeTab === 'students' && hasStudentsPerm && <StudentManagementView />}
        {activeTab === 'content' && hasContentPerm && <CMSView />}
        {activeTab === 'promotions' && hasPromotionsPerm && <PromotionsManagerView />}
        {activeTab === 'settlement' && hasSettlementPerm && <SettlementCenterView />}
        {activeTab === 'transactions' && hasTransactionsPerm && <TransactionsMonitorView />}
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all ${
        active 
          ? 'bg-kirateal text-white shadow-md shadow-kirateal/10' 
          : 'text-slate-600 hover:bg-white hover:text-kirateal'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ==================== MÓDULO: TABLERO GLOBAL ====================
function GlobalDashboardView() {
  const [daysRange, setDaysRange] = useState(30);
  const [stats, setStats] = useState({ 
    users: 0, 
    sales: 0, 
    activeIA: 0, 
    sentiment: { positive: 0, neutral: 0, negative: 0 },
    engagement: { dailyActive: 0, weeklyActive: 0 },
    courses: [] as any[],
    burnoutRisk: { riskIndex: 0, usersAtRisk: 0, totalUsersEvaluated: 0 }
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), 
      (snap) => {
        let daily = 0;
        let weekly = 0;
        const now = new Date();
        snap.forEach(d => {
          const data = d.data();
          if (data.lastActivityAt) {
            const date = data.lastActivityAt.toDate ? data.lastActivityAt.toDate() : new Date(data.lastActivityAt);
            const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
            if (diffDays <= 1) daily++;
            if (diffDays <= 7) weekly++;
          }
        });
        setStats(prev => ({ ...prev, users: snap.size, engagement: { dailyActive: daily, weeklyActive: weekly } }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubTransactions = onSnapshot(collection(db, 'transactions'), 
      (snap) => {
        let totalSales = 0;
        snap.forEach(d => totalSales += (d.data().amount || 0));
        setStats(prev => ({ ...prev, sales: totalSales, activeIA: 12 }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'transactions')
    );

    return () => {
      unsubUsers();
      unsubTransactions();
    };
  }, []);

  const totalSentiments = stats.sentiment.positive + stats.sentiment.neutral + stats.sentiment.negative || 1;
  const moodScore = Math.round(((stats.sentiment.positive * 100) + (stats.sentiment.neutral * 50)) / totalSentiments);
  const isHighRisk = stats.burnoutRisk.riskIndex > 10;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
        <h2 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Activity size={20} className="text-kirateal" /> Command Center Executive
        </h2>
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDaysRange(d)}
              className={cn(
                "px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                daysRange === d ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              ÚLTIMOS {d} DÍAS
            </button>
          ))}
        </div>
      </div>

      {isHighRisk && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-rose-600 shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-rose-800 text-sm">Alerta de Riesgo Comunitario</h3>
            <p className="text-rose-700 text-sm">
              El Índice de Riesgo de Burnout ha superado el 10% ({stats.burnoutRisk.riskIndex.toFixed(1)}%). 
              Actualmente {stats.burnoutRisk.usersAtRisk} usuarios muestran signos prolongados de estrés.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <StatCard title="Ventas del Día" value={`$${(stats.sales * 0.15).toLocaleString()}`} subtitle="Ultimas 24hs" icon={<BarChart3 className="text-kirateal" />} />
        <StatCard title="Kira Net Revenue" value={`$${(stats.sales * 0.7).toLocaleString()}`} subtitle="Comisión (70%)" icon={<BarChart3 className="text-emerald-500" />} />
        <StatCard title="Coach Payouts" value={`$${(stats.sales * 0.3).toLocaleString()}`} subtitle="Liquidación (30%)" icon={<CreditCard className="text-purple-500" />} />
        <StatCard title="Product DAU" value={`${stats.engagement.dailyActive}`} subtitle={`${stats.engagement.weeklyActive} WAU`} icon={<Users className="text-blue-500" />} />
        <StatCard title="Stability Alert" value={`${stats.burnoutRisk.riskIndex.toFixed(1)}%`} subtitle={`${stats.burnoutRisk.usersAtRisk} Usuarios en Riesgo`} icon={<AlertTriangle className={isHighRisk ? "text-rose-600" : "text-emerald-600"} />} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <TrendingUp size={18} className="text-violet-500" /> Macrotendencias de Adopción
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Uso del Diario vs. Completion Rate Académico.</p>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends.length ? trends : [
              { name: 'Day 1', adopcionDiario: 45, completionRate: 30 },
              { name: 'Day 2', adopcionDiario: 52, completionRate: 35 },
              { name: 'Day 3', adopcionDiario: 58, completionRate: 42 },
              { name: 'Day 4', adopcionDiario: 63, completionRate: 48 },
              { name: 'Day 5', adopcionDiario: 70, completionRate: 55 },
              { name: 'Day 6', adopcionDiario: 75, completionRate: 62 },
              { name: 'Day 7', adopcionDiario: 82, completionRate: 68 }
            ]} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
              <Line type="monotone" dataKey="adopcionDiario" stroke="#1ec6b6" strokeWidth={4} dot={false} animationDuration={1500} />
              <Line type="monotone" dataKey="completionRate" stroke="#8b5cf6" strokeWidth={4} dot={false} animationDuration={1500} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-kirateal" /> Actividad Reciente
          </h3>
          <div className="space-y-4">
            {activities.length > 0 ? activities.map((act, i) => (
              <ActivityItem key={i} user={act.user} action={act.action} time={act.time} />
            )) : (
              <p className="text-slate-400 text-xs italic">Nada nuevo que reportar.</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="text-amber-300" size={24} />
            <h3 className="font-bold text-lg">Kira Intelligence</h3>
          </div>
          <p className="text-sm opacity-90 leading-relaxed">
            Tendencia 'Burnout Laboral' detectada. Sugerencia: Activar campaña de bienestar.
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== MÓDULO: GESTIÓN DE ALUMNOS ====================
function StudentManagementView() {
  const [students, setStudents] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'alumno'));
    const unsubStudents = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    const unsubEnrollments = onSnapshot(collection(db, 'enrollments'), (snap) => {
      setEnrollments(snap.docs.map(d => d.data()));
    });
    return () => {
      unsubStudents();
      unsubEnrollments();
    };
  }, []);

  const getTrafficLight = (student: any) => {
    const lastActivityAt = student.lastActivityAt;
    if (!lastActivityAt) return { color: 'bg-slate-300', text: 'Sin Actividad', icon: <Clock size={12} />, isRisk: false };
    const date = lastActivityAt.toDate ? lastActivityAt.toDate() : new Date(lastActivityAt);
    const diffDays = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 3) return { color: 'bg-emerald-500', text: 'Activo', icon: <CheckCircle2 size={12} />, isRisk: false };
    if (diffDays < 7) return { color: 'bg-amber-500', text: 'Inactivo', icon: <AlertTriangle size={12} />, isRisk: false };
    return { color: 'bg-rose-500', text: 'Crítico', icon: <XCircle size={12} />, isRisk: true };
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-in fade-in">
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Activity size={18} className="text-rose-500" /> Estado de Salud Predictivo
        </h3>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase">Alumno</th>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase">Progreso</th>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase text-center">Energy Pts</th>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase text-right">Estatus</th>
           </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {students.map(s => {
            const status = getTrafficLight(s);
            const myEnrollments = enrollments.filter(e => e.userId === s.id);
            const avgProg = myEnrollments.length > 0 
              ? Math.round(myEnrollments.reduce((acc, curr) => acc + (curr.progress || 0), 0) / myEnrollments.length)
              : 0;
            return (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedStudent(s)}>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{s.displayName || 'No Registrado'}</div>
                  <div className="text-slate-400 text-[11px]">{s.email}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 transition-all" style={{ width: `${avgProg}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">{avgProg}%</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                    <Zap size={10} /> {s.points || 0}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-[11px] font-bold text-slate-700">{status.text}</span>
                    <div className={cn("w-3 h-3 rounded-full", status.color)} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedStudent && (
        <StudentActivityDashboard student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  );
}

function StudentActivityDashboard({ student, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{student.displayName}</h2>
            <p className="text-sm text-slate-500">{student.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><XCircle size={24} /></button>
        </div>
        <div className="p-6">
          <p className="text-slate-500">Detalles del estudiante - Actividad y progreso</p>
        </div>
      </div>
    </div>
  );
}

// ==================== MÓDULO: PANEL DE COACHES ====================
function CoachCuratorView() {
  const [coaches, setCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'coach'));
    const unsub = onSnapshot(q, (snap) => {
      setCoaches(snap.docs.map(d => ({id: d.id, ...d.data()})));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleApproval = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'users', id), { approvalStatus: status });
    } catch (e) {
      console.error(e);
    }
  };

  const statusColors: any = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
    suspended: 'bg-red-100 text-red-700'
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">Panel de Control de Coaches</h3>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold">Coaches: {coaches.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-400 font-bold uppercase">
              <th className="px-6 py-3">Coach</th>
              <th className="px-6 py-3 text-center">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {coaches.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-700">{c.displayName || 'Sin nombre'}</div>
                  <div className="text-[10px] text-slate-400">{c.email}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold", statusColors[c.approvalStatus] || 'bg-slate-100')}>
                    {c.approvalStatus || 'pending'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {c.approvalStatus !== 'approved' && (
                    <button onClick={() => handleApproval(c.id, 'approved')} className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold">
                      Aprobar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== MÓDULO: SEGURIDAD ====================
function SecurityView() {
  const [staff, setStaff] = useState<any[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'coach']));
    const unsub = onSnapshot(q, (snap) => setStaff(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => unsub();
  }, []);

  const changeRole = async (userId: string, newRole: string) => {
    if (!confirm(`¿Cambiar rol a ${newRole}?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      alert("Rol actualizado");
    } catch (e) {
      console.error(e);
    }
  };

  const togglePermission = async (userId: string, current: string[], perm: string) => {
    const next = current?.includes(perm) ? current.filter(p => p !== perm) : [...(current || []), perm];
    await updateDoc(doc(db, 'users', userId), { staffPermissions: next });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-900 rounded-3xl p-8 text-white">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="text-cyan-400" /> IAM Identity Core
        </h2>
        <p className="text-slate-400 mt-2">Gestión central de identidades y accesos</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold mb-4">Buscar Usuario</h3>
        <div className="flex gap-3">
          <input type="email" placeholder="Email del usuario" value={searchEmail} onChange={e => setSearchEmail(e.target.value)} className="flex-1 border rounded-xl px-4 py-2" />
          <button onClick={async () => {
            const q = query(collection(db, 'users'), where('email', '==', searchEmail));
            const snap = await getDocs(q);
            if (!snap.empty) setSearchResult({ id: snap.docs[0].id, ...snap.docs[0].data() });
            else alert("No encontrado");
          }} className="px-4 py-2 bg-slate-900 text-white rounded-xl">Buscar</button>
        </div>
        {searchResult && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl">
            <p><strong>{searchResult.displayName}</strong> - {searchResult.email}</p>
            <p>Rol actual: {searchResult.role}</p>
            <select onChange={(e) => changeRole(searchResult.id, e.target.value)} className="mt-2 border rounded-lg px-3 py-1">
              <option value="">Cambiar rol...</option>
              <option value="admin">Admin</option>
              <option value="coach">Coach</option>
              <option value="alumno">Alumno</option>
            </select>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50">
          <h3 className="font-bold">Staff y Permisos</h3>
        </div>
        {staff.map(member => (
          <div key={member.id} className="p-4 border-b flex justify-between items-center">
            <div>
              <p className="font-bold">{member.displayName}</p>
              <p className="text-xs text-slate-500">{member.email} - {member.role}</p>
            </div>
            <div className="flex gap-2">
              {['users', 'content', 'billing', 'system'].map(perm => (
                <button key={perm} onClick={() => togglePermission(member.id, member.staffPermissions, perm)} className={cn("px-2 py-1 rounded text-[10px] font-bold", member.staffPermissions?.includes(perm) ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500")}>
                  {perm}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== MÓDULO: GESTIÓN DE PROMOCIONES ====================
function PromotionsManagerView() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('Descuento');
  const [status, setStatus] = useState('active');
  const [priority, setPriority] = useState(1);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'promotions'), (snap) => {
      setPromotions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setTitle('');
    setDescription('');
    setImageUrl('');
    setStartDate('');
    setEndDate('');
    setCode('');
    setType('Descuento');
    setStatus('active');
    setPriority(1);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!title || !startDate || !endDate) return alert("Título y fechas son requeridos");
    setSaving(true);
    try {
      const data = { title, description, imageUrl, startDate, endDate, code, type, status, priority: Number(priority), updatedAt: new Date().toISOString() };
      if (editId) await updateDoc(doc(db, 'promotions', editId), data);
      else await addDoc(collection(db, 'promotions'), { ...data, createdAt: new Date().toISOString() });
      resetForm();
    } catch (e) { alert("Error guardando"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar?")) await deleteDoc(doc(db, 'promotions', id));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2"><Star className="text-amber-500" /> Promociones</h2>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-kirateal text-white rounded-xl text-sm font-bold">+ Nueva</button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl border">
          <h3 className="font-bold mb-4">{editId ? 'Editar' : 'Nueva'} Promoción</h3>
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} className="border rounded-xl px-4 py-2" />
            <input type="text" placeholder="Código" value={code} onChange={e => setCode(e.target.value)} className="border rounded-xl px-4 py-2" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded-xl px-4 py-2" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded-xl px-4 py-2" />
            <textarea placeholder="Descripción" value={description} onChange={e => setDescription(e.target.value)} className="border rounded-xl px-4 py-2 col-span-2" rows={3} />
            <input type="text" placeholder="URL de imagen" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="border rounded-xl px-4 py-2 col-span-2" />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={resetForm} className="px-4 py-2 border rounded-xl">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-slate-900 text-white rounded-xl">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {promotions.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border overflow-hidden group">
            <div className="h-32 bg-slate-100 relative">
              {p.imageUrl && <img src={p.imageUrl} className="w-full h-full object-cover" />}
              <span className={cn("absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold", p.status === 'active' ? "bg-emerald-500 text-white" : "bg-slate-500 text-white")}>{p.status}</span>
            </div>
            <div className="p-4">
              <h4 className="font-bold">{p.title}</h4>
              <p className="text-xs text-slate-500">{p.description}</p>
              {p.code && <div className="mt-2 text-xs font-mono bg-slate-100 p-1 rounded">Código: {p.code}</div>}
              <div className="flex justify-between mt-3">
                <button onClick={() => { setEditId(p.id); setTitle(p.title); setDescription(p.description); setImageUrl(p.imageUrl); setStartDate(p.startDate); setEndDate(p.endDate); setCode(p.code); setType(p.type); setStatus(p.status); setPriority(p.priority); setShowForm(true); }} className="text-xs text-indigo-600">Editar</button>
                <button onClick={() => handleDelete(p.id)} className="text-xs text-rose-600">Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== MÓDULOS ADICIONALES (Placeholders) ====================
function BIView() { return <div className="bg-white rounded-2xl p-6 border"><h2>Business Intelligence</h2></div>; }
function CampaignHistoryView() { return <div className="bg-white rounded-2xl p-6 border"><h2>Campaign History</h2></div>; }
function AICoachesView() { return <div className="bg-white rounded-2xl p-6 border"><h2>IA para Coaches</h2></div>; }
function CMSView() { return <div className="bg-white rounded-2xl p-6 border"><h2>CMS Académico</h2></div>; }
function SettlementCenterView() { return <div className="bg-white rounded-2xl p-6 border"><h2>Centro de Liquidación</h2></div>; }
function TransactionsMonitorView() { return <div className="bg-white rounded-2xl p-6 border"><h2>Transacciones</h2></div>; }

// ==================== COMPONENTES AUXILIARES ====================
function StatCard({ title, value, subtitle, icon }: any) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200">
      <div className="flex justify-between items-start mb-3">
        <div className="p-2 rounded-xl bg-slate-50">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-slate-500 text-[13px] font-medium">{title}</div>
      <div className="text-slate-400 text-[11px] mt-1">{subtitle}</div>
    </div>
  );
}

function ActivityItem({ user, action, time }: any) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-[10px]">{user?.charAt(0) || 'U'}</div>
      <div className="flex-1"><span className="font-semibold">{user}</span> <span className="text-slate-500">{action}</span></div>
      <div className="text-slate-400 text-[11px]">{time}</div>
    </div>
  );
}

// Compatibilidad con rutas anteriores
export function AdminCoaches() { return <AdminMonitor />; }
export function AdminReviews() { return <AdminMonitor />; }
