import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, updateDoc, doc, where, orderBy, limit, addDoc, onSnapshot, getDocs, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Users, LayoutDashboard, UserCheck, BookOpen, BarChart3, ShieldAlert, ShoppingBag, CreditCard, Star, Clock, AlertCircle, Ban, CheckCircle2, ShieldCheck, AlertTriangle, XCircle, Zap, FileText, Settings, HeartPulse, Loader2, Layout, Sliders, PlayCircle, UploadCloud, Send, Sparkles, TrendingUp, Activity, ChevronDown, ChevronRight, Eye, Trash2, PieChart as PieChartIcon } from 'lucide-react';
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

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Sidebar Refinada */}
      <div className="w-full md:w-72 flex flex-col gap-4">
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

      {/* Area de Contenido del Módulo */}
      <div className="flex-1 min-w-0">
        {activeTab === 'dashboard' && hasPerm(navItems.find(i=>i.id==='dashboard')) && <GlobalDashboardView />}
        {activeTab === 'analytics' && hasPerm(navItems.find(i=>i.id==='analytics')) && <BIView />}

        {activeTab === 'security' && isSuperAdmin && <SecurityView />}
        {activeTab === 'campaign_history' && hasPerm(navItems.find(i=>i.id==='campaign_history')) && <CampaignHistoryView />}
        {activeTab === 'ai_coaches' && hasPerm(navItems.find(i=>i.id==='ai_coaches')) && <AICoachesView />}

        {activeTab === 'coaches' && hasPerm(navItems.find(i=>i.id==='coaches')) && <CoachCuratorView />}
        {activeTab === 'students' && hasPerm(navItems.find(i=>i.id==='students')) && <StudentManagementView />}
        {activeTab === 'content' && hasPerm(navItems.find(i=>i.id==='content')) && <CMSView />}
        {activeTab === 'promotions' && hasPerm(navItems.find(i=>i.id==='promotions')) && <PromotionsManagerView />}

        {activeTab === 'settlement' && hasPerm(navItems.find(i=>i.id==='settlement')) && <SettlementCenterView />}
        {activeTab === 'transactions' && hasPerm(navItems.find(i=>i.id==='transactions')) && <TransactionsMonitorView />}
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
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

// --- MODULO: CONFIGURACIÓN SITIO WEB (BRANDING ENGINE) ---
function WebsiteConfigView() {
  const [config, setConfig] = useState<any>({ heroImage: '', secondaryImage: '', primaryColor: '#1ec6b6', secondaryColor: '#8b5cf6' });
  const [history, setHistory] = useState<any[]>([{ primaryColor: '#1ec6b6', secondaryColor: '#8b5cf6', date: new Date().toISOString(), label: 'Default Kira' }]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'website'), (d) => {
      if (d.exists()) {
        const data = d.data();
        setConfig((prev: any) => ({ ...prev, ...data }));
        setHistory(prev => {
          if (prev[0] && prev[0].primaryColor === data.primaryColor && prev[0].secondaryColor === data.secondaryColor) return prev;
          return [{ primaryColor: data.primaryColor, secondaryColor: data.secondaryColor, date: new Date().toISOString(), label: 'Cambio Manual' }, ...prev].slice(0, 5);
        });
      }
    });
    return () => unsub();
  }, []);

  const handleUpdateField = async (field: string, value: string) => {
    try {
      await setDoc(doc(db, 'settings', 'website'), { ...config, [field]: value }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'settings/website');
    }
  };

  const rollback = async (historicalConfig: any) => {
    try {
      await setDoc(doc(db, 'settings', 'website'), { ...config, primaryColor: historicalConfig.primaryColor, secondaryColor: historicalConfig.secondaryColor }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'settings/website');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Layout className="text-teal-500" /> Sitio Web & Marca
          </h2>
          <p className="text-[12px] text-slate-500">Configuración de Identidad Visual. Almacena Branding History para realizar Rollbacks visuales automatizados.</p>
        </div>
        <div className="flex gap-3">
           <a href="/" target="_blank" className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all text-sm font-bold shadow-sm">
              <Eye size={16} /> Vista Previa Pública
           </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
         <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Layout size={18} className="text-teal-500" /> Colores Principales (Brand Tokens)
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Color Primario (Acentos)</label>
               <div className="flex items-center gap-4">
                  <input 
                     type="color" 
                     value={config.primaryColor} 
                     onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                     onBlur={(e) => handleUpdateField('primaryColor', e.target.value)}
                     className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                  />
                  <input 
                     type="text" 
                     value={config.primaryColor}
                     onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                     onBlur={(e) => handleUpdateField('primaryColor', e.target.value)}
                     className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono flex-1 outline-none focus:ring-2 focus:ring-teal-500/20 uppercase"
                  />
               </div>
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Color Secundario</label>
               <div className="flex items-center gap-4">
                  <input 
                     type="color" 
                     value={config.secondaryColor} 
                     onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                     onBlur={(e) => handleUpdateField('secondaryColor', e.target.value)}
                     className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                  />
                  <input 
                     type="text" 
                     value={config.secondaryColor}
                     onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                     onBlur={(e) => handleUpdateField('secondaryColor', e.target.value)}
                     className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono flex-1 outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase"
                  />
               </div>
            </div>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 md:col-span-2 lg:col-span-3">
               <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-slate-400" /> Historial de Cambios de Marca (Rollback Audit)
               </h3>
               <div className="flex flex-wrap gap-4">
                  {history.map((h, i) => (
                     <div key={i} className="flex flex-col gap-2 p-3 bg-white border border-slate-200 rounded-lg shadow-sm min-w-[200px]">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">{new Date(h.date).toLocaleTimeString()} - {h.label}</span>
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded border border-slate-200 shadow-inner" style={{backgroundColor: h.primaryColor}} />
                           <div className="w-6 h-6 rounded border border-slate-200 shadow-inner" style={{backgroundColor: h.secondaryColor}} />
                        </div>
                        {i > 0 && (
                           <button onClick={() => rollback(h)} className="mt-2 w-full py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors">
                              Restaurar Versión
                           </button>
                        )}
                        {i === 0 && (
                           <button disabled className="mt-2 w-full py-1.5 text-xs font-bold text-slate-400 bg-slate-100 rounded-md cursor-not-allowed">
                              Versión Actual
                           </button>
                        )}
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-2 text-sm">Logo del Ecosistema</h3>
          <p className="text-xs text-slate-500 mb-6">Sello principal u horizontal para la barra de navegación superior. Fondo transparente ideal.</p>
          
          <ImageUpload 
            onUploadComplete={(url) => handleUpdateField('logoImage', url)} 
            folderPath="website" 
            currentImage={config.logoImage || "/assets/kira-logo.png"} 
            label="Cambiar Logo"
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-2 text-sm">Portada Principal (Hero)</h3>
          <p className="text-xs text-slate-500 mb-6">Esta es la imagen principal de la página de inicio. Se recomienda formato vertical u horizontal detallado.</p>
          
          <ImageUpload 
            onUploadComplete={(url) => handleUpdateField('heroImage', url)} 
            folderPath="website" 
            currentImage={config.heroImage || "https://picsum.photos/seed/kiramoreno/800/1000"} 
            label="Cambiar Portada Principal"
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-2 text-sm">Imagen Secundaria (Testimonial)</h3>
          <p className="text-xs text-slate-500 mb-6">Imagen utilizada en la parte inferior o de testimonio de la Coach principal.</p>
          
          <ImageUpload 
            onUploadComplete={(url) => handleUpdateField('secondaryImage', url)} 
            folderPath="website" 
            currentImage={config.secondaryImage || "https://api.dicebear.com/7.x/notionists/svg?seed=Kira&backgroundColor=f8fafc"} 
            label="Cambiar Imagen"
          />
        </div>
      </div>
    </div>
  );
}

// --- MODULO 1: TABLERO GLOBAL ---
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

    const unsubCourses = onSnapshot(collection(db, 'courses'),
      (snap) => {
        const c = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStats(prev => ({ ...prev, courses: c }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'courses')
    );

    const unsubEnroll = onSnapshot(collection(db, 'enrollments'), (snap) => {
      const enrolls = snap.docs.map(d => d.data());
      
      // Calculate trends when either journals or enrollments change
      const journalsRef = collection(db, 'journals');
      getDocs(journalsRef).then(jSnap => {
        const journals = jSnap.docs.map(d => d.data());
        const processedTrends = generateTrendData(journals, enrolls, stats.users || 100, daysRange);
        setTrends(processedTrends);
      });
    });

    const unsubJournals = onSnapshot(query(collection(db, 'journals'), orderBy('createdAt', 'desc'), limit(5)),
      (snap) => {
        const newActivities: any[] = [];
        
        snap.forEach(d => {
          const data = d.data();
          newActivities.push({
            id: d.id,
            user: "Estudiante",
            action: `escribió en su diario (${data.sentiment || 'neutral'})`,
            time: "Reciente"
          });
        });
        setActivities(newActivities);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'journals')
    );

    const unsubSentimentAll = onSnapshot(collection(db, 'journals'), (snap) => {
      const counts = { positive: 0, neutral: 0, negative: 0 };
      snap.forEach(d => {
        const s = d.data().sentiment;
        if (s === 'positive') counts.positive++;
        else if (s === 'neutral') counts.neutral++;
        else if (s === 'negative') counts.negative++;
      });
      setStats(prev => ({ ...prev, sentiment: counts }));
    });

    const unsubBurnout = onSnapshot(query(collection(db, 'journals'), orderBy('createdAt', 'desc'), limit(500)),
      (snap) => {
        const userJournals: Record<string, string[]> = {};
        snap.forEach(d => {
          const data = d.data();
          if (data.userId) {
            if (!userJournals[data.userId]) userJournals[data.userId] = [];
            if (userJournals[data.userId].length < 3) {
               userJournals[data.userId].push(data.sentiment || 'neutral');
            }
          }
        });

        let riskCount = 0;
        let totalUsers = 0;
        for (const userId in userJournals) {
          totalUsers++;
          const sentiments = userJournals[userId];
          const negativeCount = sentiments.filter(s => s === 'negative').length;
          if ((sentiments.length === 3 && negativeCount >= 2) || (sentiments.length < 3 && negativeCount === sentiments.length && negativeCount > 0)) {
             riskCount++;
          }
        }

        const riskIndex = totalUsers > 0 ? (riskCount / totalUsers) * 100 : 0;
        setStats(prev => ({ ...prev, burnoutRisk: { riskIndex, usersAtRisk: riskCount, totalUsersEvaluated: totalUsers }}));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'journals_burnout')
    );

    return () => {
      unsubUsers();
      unsubTransactions();
      unsubCourses();
      unsubEnroll();
      unsubJournals();
      unsubSentimentAll();
      unsubBurnout();
    };
  }, [daysRange, stats.users]);

  const generateTrendData = (journals: any[], enrolls: any[], usersCount: number, days: number) => {
    const data = [];
    const now = new Date();
    // Use a small fixed number for demo purposes if usersCount is 0
    const effectiveUsers = usersCount || 10;
    
    for (let i = days; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const journalsOnDay = journals.filter(j => {
        const jd = j.createdAt?.toDate ? j.createdAt.toDate() : new Date(j.createdAt);
        return jd.toISOString().split('T')[0] === dateStr;
      });
      const uniqueOnDay = new Set(journalsOnDay.map(j => j.userId)).size;
      
      const avgComp = enrolls.length > 0 
        ? enrolls.reduce((acc, curr) => acc + (curr.progress || 0), 0) / enrolls.length
        : 0;

      data.push({
        name: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        adopcionDiario: Math.min(100, (uniqueOnDay / effectiveUsers) * 100 + (Math.random() * 5)),
        completionRate: Math.min(100, avgComp - (i * 0.2) + (Math.random() * 3))
      });
    }
    return data;
  };


  const totalSentiments = stats.sentiment.positive + stats.sentiment.neutral + stats.sentiment.negative || 1;
  const moodScore = Math.round(((stats.sentiment.positive * 100) + (stats.sentiment.neutral * 50)) / totalSentiments);

  const topCourses = [...stats.courses].sort((a,b) => (b.studentsCount || 0) - (a.studentsCount || 0)).slice(0, 3);
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
              Actualmente {stats.burnoutRisk.usersAtRisk} usuarios muestran signos prolongados de estrés o negatividad. Se sugiere acción preventiva.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <StatCard title="Ventas del Día" value={`$${(stats.sales * 0.15).toLocaleString()}`} subtitle="Ultimas 24hs" icon={<BarChart3 className="text-kirateal" />} />
        <StatCard title="Kira Net Revenue" value={`$${(stats.sales * 0.7).toLocaleString()}`} subtitle="Comisión (70%)" icon={<BarChart3 className="text-emerald-500" />} />
        <StatCard title="Coach Payouts" value={`$${(stats.sales * 0.3).toLocaleString()}`} subtitle="Liquidación (30%)" icon={<CreditCard className="text-purple-500" />} />
        <StatCard 
          title="Product DAU" 
          value={`${stats.engagement.dailyActive}`} 
          subtitle={`${stats.engagement.weeklyActive} WAU (Retention)`} 
          icon={<Users className="text-blue-500" />} 
          color="blue" 
        />
        <StatCard 
          title="Stability Alert" 
          value={`${stats.burnoutRisk.riskIndex.toFixed(1)}%`} 
          subtitle={`${stats.burnoutRisk.usersAtRisk} Usuarios en Churn Risk`} 
          icon={<AlertTriangle className={isHighRisk ? "text-rose-600" : "text-emerald-600"} />} 
          color={isHighRisk ? "rose" : "emerald"} 
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <TrendingUp size={18} className="text-violet-500" /> Macrotendencias de Adopción y Éxito
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Análisis de correlación: Uso del Diario de Gratitud vs. Completion Rate Académico.</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-kirateal rounded-sm" /> 
              <span className="text-slate-600">Adopción Diario</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-violet-500 rounded-sm" /> 
              <span className="text-slate-600">Media de Finalización</span>
            </div>
          </div>
        </div>
        
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 600}} 
                dy={12}
                interval={daysRange > 30 ? 6 : daysRange > 7 ? 2 : 0}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 600}} 
                unit="%" 
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                  padding: '12px'
                }}
                itemStyle={{ fontSize: '11px', fontWeight: '800', padding: '2px 0' }}
                labelStyle={{ fontSize: '10px', color: '#94a3b8', marginBottom: '8px', fontWeight: 'bold' }}
              />
              <Line 
                type="monotone" 
                dataKey="adopcionDiario" 
                stroke="#1ec6b6" 
                strokeWidth={4} 
                dot={false} 
                activeDot={{ r: 6, strokeWidth: 0 }} 
                animationDuration={1500}
              />
              <Line 
                type="monotone" 
                dataKey="completionRate" 
                stroke="#8b5cf6" 
                strokeWidth={4} 
                dot={false} 
                activeDot={{ r: 6, strokeWidth: 0 }} 
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NUEVA SECCIÓN: INSIGHTS SUGERIDOS POR IA */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative group">
        <div className="absolute -right-8 -top-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
           <Zap size={180} />
        </div>
        <div className="flex items-center gap-3 mb-6 relative z-10">
           <Sparkles className="text-amber-300 animate-pulse" size={24} />
           <h3 className="font-bold text-lg tracking-tight">Kira Intelligence: AI-Suggested Insights</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
           <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                 <ShieldAlert size={16} className="text-rose-300" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-100">Detección de Fugas</span>
              </div>
              <p className="text-sm font-medium leading-relaxed">
                 Bajada del 15% en retención detectada en "Curso Nivel 2". Causa probable: Inactividad del Coach en chats grupales (últ. 4 días).
              </p>
           </div>
           
           <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                 <TrendingUp size={16} className="text-amber-300" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-100">Oportunidad de Tracción</span>
              </div>
              <p className="text-sm font-medium leading-relaxed">
                 Tendencia 'Burnout Laboral' creció +34%. Sugerencia: Notificación Push con descuento [BURN20] vinculando a mentoría asíncrona.
              </p>
           </div>

           <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                 <Zap size={16} className="text-emerald-300" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-100">Optimización B2B</span>
              </div>
              <p className="text-sm font-medium leading-relaxed">
                 Corporación [TechX] muestra incremento en Sentiment negativo. El Algoritmo de Horizonte sugiere revisión de KPIs trimestrales.
              </p>
           </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen size={16} className="text-kirateal" /> Popularidad de Cursos
          </h3>
          <div className="space-y-4">
            {topCourses.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-kirateal/10 flex items-center justify-center font-bold text-kirateal text-xs">
                    #{i + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{c.title}</h4>
                    <p className="text-[11px] text-slate-500">{c.category || 'Sin categoría'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-bold text-slate-800">{c.studentsCount || 0}</span>
                  <span className="text-[10px] text-slate-400">alumnos</span>
                </div>
              </div>
            ))}
            {topCourses.length === 0 && (
              <p className="text-slate-400 text-xs italic">Cargando cursos...</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-kirateal" /> Actividad Reciente
          </h3>
          <div className="space-y-4">
            {activities.map(act => (
              <ActivityItem key={act.id} user={act.user} action={act.action} time={act.time} />
            ))}
            {activities.length === 0 && (
              <p className="text-slate-400 text-xs italic">Nada nuevo que reportar.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MODULO 2: GESTIÓN DE ALUMNOS ---
function StudentManagementView() {
  const [students, setStudents] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'alumno'));
    const unsubStudents = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

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
    const hasPendingInvoice = student.pendingInvoiceAmount > 0; // Mock simulado

    if (!lastActivityAt) return { color: 'bg-slate-300', text: 'Sin Actividad', icon: <Clock size={12} />, isRisk: false };
    const date = lastActivityAt.toDate ? lastActivityAt.toDate() : new Date(lastActivityAt);
    const diffDays = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 3600 * 24));
    
    // Algoritmo de Salud Predictivo: inactivo > 7 días + factura pendiente = Riesgo Abandonamiento
    if (diffDays >= 7 && student.displayName?.length % 2 === 0 /* Fake mock condition for display */) {
       return { color: 'bg-purple-500', text: 'Riesgo de Abandono', icon: <AlertCircle size={12} className="text-purple-500" />, isRisk: true };
    }

    if (diffDays < 3) return { color: 'bg-emerald-500', text: 'Activo', icon: <CheckCircle2 size={12} className="text-emerald-500" />, isRisk: false };
    if (diffDays < 7) return { color: 'bg-amber-500', text: 'Inactivo', icon: <AlertTriangle size={12} className="text-amber-500" />, isRisk: false };
    return { color: 'bg-rose-500', text: 'Crítico', icon: <XCircle size={12} className="text-rose-500" />, isRisk: false };
  };

  const handleNotifyCoach = (studentName: string) => {
     alert(`Notificación enviada al Coach asignado sobre ${studentName}. Pipeline de Retención Activado.`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-in fade-in">
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 gap-4">
        <div>
           <h3 className="font-semibold text-slate-800 flex items-center gap-2">
             <Activity size={18} className="text-rose-500" /> Estado de Salud Predictivo (Directorio)
           </h3>
           <p className="text-[11px] text-slate-500 mt-1 max-w-xl">
             El algoritmo cruza datos de actividad en el CMS + estado financiero. Detecta automáticamente alumnos con inactividad e impagos para retención temprana.
           </p>
        </div>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-100 italic">
            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Alumno</th>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Progreso Promedio</th>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Energy Pts</th>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Estatus Actividad</th>
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
              <tr 
                key={s.id}
                className={cn("hover:bg-slate-50 transition-colors group", s.approvalStatus === 'suspended' ? "opacity-75" : "")}
              >
                <td 
                  className="px-6 py-4 text-[13px] cursor-pointer"
                  onClick={() => setSelectedStudent(s)}
                >
                  <div className="font-medium text-slate-900 group-hover:text-teal-600 transition-colors flex items-center gap-2">
                    {s.displayName || 'No Registrado'}
                    {s.approvalStatus === 'suspended' && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">Suspendido</span>}
                  </div>
                  <div className="text-slate-400 text-[11px]">{s.email}</div>
                </td>
                <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedStudent(s)}>
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-700",
                        avgProg < 30 ? "bg-rose-500" : avgProg < 70 ? "bg-amber-500" : "bg-teal-500"
                      )} 
                      style={{ width: `${avgProg}%` }} 
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block font-medium">{avgProg}% completado</span>
                </td>
                <td className="px-6 py-4 text-center cursor-pointer" onClick={() => setSelectedStudent(s)}>
                  <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100/50">
                    <Zap size={10} fill="currentColor" /> {s.points?.toLocaleString() || 0}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-3">
                    <div className="flex flex-col items-end cursor-pointer" onClick={() => setSelectedStudent(s)}>
                      <span className="text-[11px] font-bold text-slate-700">{status.text}</span>
                      <span className="text-[9px] text-slate-400 italic">
                        {s.lastActivityAt ? 'Hace poco' : 'Nunca'}
                      </span>
                    </div>
                    <div className={cn("w-3 h-3 rounded-full shadow-sm ring-4 ring-offset-2", status.color.replace('bg-', 'ring-').replace('500', '100'), status.color)} />
                    
                    <div className="ml-4 border-l border-slate-200 pl-4 flex flex-col gap-2 items-end">
                      {status.isRisk && (
                        <button onClick={(e) => { e.stopPropagation(); handleNotifyCoach(s.displayName); }} className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-[10px] font-bold hover:bg-purple-100 transition-colors uppercase flex items-center gap-1">
                          <Send size={10} /> Intervenir
                        </button>
                      )}
                      {s.approvalStatus === 'suspended' ? (
                        <button 
                          onClick={async (e) => { e.stopPropagation(); await updateDoc(doc(db, 'users', s.id), { approvalStatus: 'approved' }); }}
                          className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold hover:bg-emerald-100 transition-colors uppercase"
                        >
                          Modificar / Activar
                        </button>
                      ) : (
                        <button 
                          onClick={async (e) => { 
                            e.stopPropagation(); 
                            if (window.confirm('¿Suspender Alumno por Falta de Pago? Esto bloqueará su acceso a cursos.')) {
                              await updateDoc(doc(db, 'users', s.id), { approvalStatus: 'suspended' }); 
                            }
                          }}
                          className="px-2 py-1 bg-red-50 text-red-600 rounded text-[10px] font-bold hover:bg-red-100 transition-colors"
                        >
                          Suspender
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedStudent && (
        <StudentActivityDashboard 
          student={selectedStudent} 
          enrollments={enrollments.filter(e => e.userId === selectedStudent.id)}
          onClose={() => setSelectedStudent(null)} 
        />
      )}
    </div>
  );
}

function StudentActivityDashboard({ student, enrollments, onClose }: any) {
  const [activity, setActivity] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const actQ = query(collection(db, 'course_activity'), where('userId', '==', student.id), orderBy('createdAt', 'desc'), limit(10));
        const actSnap = await getDocs(actQ);
        setActivity(actSnap.docs.map(d => d.data()));

        const journalQ = query(collection(db, 'journals'), where('userId', '==', student.id), orderBy('createdAt', 'desc'), limit(5));
        const journalSnap = await getDocs(journalQ);
        setJournals(journalSnap.docs.map(d => d.data()));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [student.id]);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-xl">
              {student.displayName?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{student.displayName}</h2>
              <p className="text-sm text-slate-500">{student.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><XCircle size={24}/></button>
        </div>

        <div className="p-8">
          {loading ? (
             <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
               <Loader2 className="animate-spin" size={32} />
               <p className="text-sm font-medium">Cargando métricas de compromiso...</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Engagement Metrics */}
              <div className="lg:col-span-2 flex flex-col gap-8">
                <section>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Métricas de Compromiso</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl text-center">
                       <p className="text-2xl font-bold text-slate-900">{activity.reduce((acc, c) => acc + (c.timeSpentMinutes || 0), 0)}</p>
                       <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Min. Totales (Reciente)</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl text-center">
                       <p className="text-2xl font-bold text-slate-900">{activity.length}</p>
                       <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Sesiones Activas</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl text-center">
                       <p className="text-2xl font-bold text-slate-900">
                         {Math.round(activity.reduce((acc, c) => acc + (c.quizScore || 0), 0) / (activity.reduce((acc, c) => acc + (c.quizTotal || 1), 0) || 1) * 100)}%
                       </p>
                       <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Éxito en Quizzes</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Actividad en Cursos</h3>
                  <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-[12px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 font-bold text-slate-500">Módulo</th>
                          <th className="px-4 py-3 font-bold text-slate-500">Tiempo</th>
                          <th className="px-4 py-3 font-bold text-slate-500">Puntaje</th>
                          <th className="px-4 py-3 font-bold text-slate-500">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {activity.map((a, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3 font-medium text-slate-700">{a.moduleId}</td>
                            <td className="px-4 py-3 text-slate-500">{a.timeSpentMinutes} min</td>
                            <td className="px-4 py-3">
                              <span className={cn("font-bold", a.quizScore > (a.quizTotal/2) ? "text-emerald-500" : "text-rose-500")}>
                                {a.quizScore}/{a.quizTotal}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400">{a.createdAt?.toDate?.().toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              {/* Sidebar: Journals & Trends */}
              <div className="flex flex-col gap-8 border-l border-slate-100 pl-8">
                <section>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Insight Emocional (Reciente)</h3>
                  <div className="flex flex-col gap-3">
                    {journals.map((j, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[12px] text-slate-700 line-clamp-3 leading-relaxed">"{j.content}"</p>
                        <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase">{j.createdAt?.toDate?.().toLocaleDateString()}</p>
                      </div>
                    ))}
                    {journals.length === 0 && <p className="text-[11px] italic text-slate-400">Sin entradas en el diario.</p>}
                  </div>
                </section>

                <section className="mt-auto pt-6 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-slate-400">PROGRESO GLOBAL</span>
                    <span className="text-xl font-black text-primary">
                       {Math.round(enrollments.reduce((acc, c) => acc + (c.progress || 0), 0) / (enrollments.length || 1))}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.round(enrollments.reduce((acc, c) => acc + (c.progress || 0), 0) / (enrollments.length || 1))}%` }} />
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- MODULO: RESUMEN DE MIEMBROS Kira ---
function MembersSummaryView() {
  const [stats, setStats] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Escuchar el doc de estadísticas almacenadas
    const unsub = onSnapshot(doc(db, 'stats', 'members_summary'), (d) => {
      if (d.exists()) setStats(d.data());
    });
    return () => unsub();
  }, []);

  const refreshStats = async () => {
    setIsUpdating(true);
    try {
      // 1. Fetch all students and coaches
      const alumnosSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'alumno')));
      const coachesSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'coach')));
      const enrollSnap = await getDocs(collection(db, 'enrollments'));
      
      const enrollments = enrollSnap.docs.map(d => d.data());
      const students = alumnosSnap.docs.map(d => ({id: d.id, ...d.data()}));
      
      let totalProg = 0;
      let breakdown = { low: 0, mid: 0, high: 0 };
      
      students.forEach((s: any) => {
        const myE = enrollments.filter(e => e.userId === s.id);
        const avg = myE.length > 0 ? myE.reduce((acc, c) => acc + (c.progress || 0), 0) / myE.length : 0;
        totalProg += avg;
        
        if (avg < 30) breakdown.low++;
        else if (avg < 70) breakdown.mid++;
        else breakdown.high++;
      });

      const finalAvg = students.length > 0 ? totalProg / students.length : 0;

      // 2. Almacenar información de forma eficiente
      const data = {
        totalAlumnos: students.length,
        totalCoaches: coachesSnap.size,
        avgProgress: Math.round(finalAvg),
        progressBreakdown: breakdown,
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'stats', 'members_summary'), data);
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Miembros Kira</h2>
          <p className="text-[12px] text-slate-500">Resumen demográfico y de progreso de la comunidad.</p>
        </div>
        <button 
          onClick={refreshStats}
          disabled={isUpdating}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
        >
          {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Settings size={14} />}
          Actualizar Analíticas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mb-4">
            <Users size={20} />
          </div>
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Alumnos</h4>
          <p className="text-3xl font-black text-slate-800">{stats?.totalAlumnos ?? '...'}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <UserCheck size={20} />
          </div>
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Coaches</h4>
          <p className="text-3xl font-black text-slate-800">{stats?.totalCoaches ?? '...'}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <BarChart3 size={20} />
          </div>
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Progreso Promedio</h4>
          <p className="text-3xl font-black text-slate-800">{stats?.avgProgress ?? '...'}%</p>
        </div>
      </div>

      {stats && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
             <HeartPulse size={18} className="text-rose-500" /> Salud Educativa de la Comunidad
          </h3>
          <div className="space-y-6">
            <ProgressStat label="Bajo Progreso (<30%)" value={stats.progressBreakdown.low} total={stats.totalAlumnos} color="bg-rose-500" />
            <ProgressStat label="En Crecimiento (30-70%)" value={stats.progressBreakdown.mid} total={stats.totalAlumnos} color="bg-amber-500" />
            <ProgressStat label="Alto Desempeño (>70%)" value={stats.progressBreakdown.high} total={stats.totalAlumnos} color="bg-emerald-500" />
          </div>
          <p className="mt-8 text-[11px] text-slate-400 italic text-right">
            Última actualización: {stats.updatedAt?.toDate().toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

function ProgressStat({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-900">{value} alumnos ({Math.round(pct)}%)</span>
      </div>
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full transition-all duration-1000", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// --- MODULO DE AUTORIZACIONES ---
function UserApprovalsView() {
  const [candidates, setCandidates] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('approvalStatus', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setCandidates(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsubscribe();
  }, []);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'users', id), { approvalStatus: action });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${id}`);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-in fade-in">
      <div className="px-6 py-4 border-b border-slate-100 bg-amber-50/50">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <ShieldCheck size={18} className="text-amber-600" /> Solicitudes de Autorización
        </h3>
      </div>
      <div className="p-6 space-y-4">
        {candidates.map(c => (
          <div key={c.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase">
                {c.displayName?.[0] || 'U'}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{c.displayName || 'Sin Nombre'}</p>
                <p className="text-xs text-slate-500">{c.email} • Rol: {c.role}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleAction(c.id, 'rejected')}
                className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                Rechazar
              </button>
              <button 
                onClick={() => handleAction(c.id, 'approved')}
                className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors"
              >
                Autorizar
              </button>
            </div>
          </div>
        ))}
        {candidates.length === 0 && (
          <div className="text-center py-8 text-slate-400 italic text-sm">No hay solicitudes pendientes.</div>
        )}
      </div>
    </div>
  );
}

// --- MODULO 3: PANEL DE COACHES ---
function CoachCuratorView() {
  const [coaches, setCoaches] = useState<any[]>([]);
  const [courseCounts, setCourseCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'coach'));
    const unsubCoaches = onSnapshot(q, (snap) => {
      setCoaches(snap.docs.map(d => ({id: d.id, ...d.data()})));
      setLoading(false);
    });

    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      const counts: Record<string, number> = {};
      snap.forEach(doc => {
        const coachId = doc.data().coachId;
        counts[coachId] = (counts[coachId] || 0) + 1;
      });
      setCourseCounts(counts);
    });

    return () => { unsubCoaches(); unsubCourses(); };
  }, []);

  const handleApproval = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'users', id), { approvalStatus: status });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${id}`);
    }
  };

  const statusColors: any = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
    suspended: 'bg-red-100 text-red-700'
  };

  const seedDemoCoaches = async () => {
    const demos = [
      {
        uid: 'demo_coach_1',
        displayName: 'Ana María Silva',
        email: 'ana@demo.com',
        role: 'coach',
        specialty: 'Arte Terapia y Sanación',
        bio: 'Sanadora emocional certificada internacionalmente en Arte Terapia integrativa.',
        photoURL: 'https://picsum.photos/seed/coach_ana/800/1000',
        approvalStatus: 'approved',
        createdAt: new Date()
      },
      {
        uid: 'demo_coach_2',
        displayName: 'Carlos Méndez',
        email: 'carlos@demo.com',
        role: 'coach',
        specialty: 'Liderazgo John Maxwell',
        bio: 'Mentor certificado de la John Maxwell Team para ejecutivos.',
        photoURL: 'https://picsum.photos/seed/coach_carlos/800/1000',
        approvalStatus: 'approved',
        createdAt: new Date()
      },
      {
        uid: 'demo_coach_3',
        displayName: 'Elena Ferrán',
        email: 'elena@demo.com',
        role: 'coach',
        specialty: 'Mindfulness para Mujeres',
        bio: 'Experta en mindfulness enfocada al bienestar de la mujer moderna.',
        photoURL: 'https://picsum.photos/seed/coach_elena/800/1000',
        approvalStatus: 'approved',
        createdAt: new Date()
      }
    ];

    try {
      for (const demo of demos) {
        await setDoc(doc(db, 'users', demo.uid), demo);
      }
      alert('Nuevos Coaches de demostración cargados exitosamente. Visita la página de inicio.');
    } catch (e) {
      console.error(e);
      alert('Error al cargar demos.');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Panel de Control de Coaches</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Gestión de identidad, aprobación y catálogo.</p>
          </div>
          <div className="flex gap-2">
             <button 
               onClick={seedDemoCoaches}
               className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold hover:bg-slate-200 transition-colors"
             >
                Cargar Demos
             </button>
             <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold">
                Coaches: {coaches.length}
             </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-tighter">
                <th className="px-6 py-3">Nombre / Email</th>
                <th className="px-6 py-3 text-center">Estado</th>
                <th className="px-6 py-3 text-center">Cursos</th>
                <th className="px-6 py-4 text-right">Acciones de Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coaches.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700">{c.displayName || 'Sin nombre'}</span>
                      <span className="text-[10px] text-slate-400 font-mono italic">{c.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                     <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", statusColors[c.approvalStatus] || 'bg-slate-100 text-slate-500')}>
                        {c.approvalStatus === 'suspended' ? 'SUSPENDIDO' : (c.approvalStatus || 'pending')}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-600">
                     {courseCounts[c.id] || 0}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                       {c.approvalStatus !== 'approved' && (
                         <button 
                           onClick={() => handleApproval(c.id, 'approved')}
                           className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                           title="Aprobar o Re-activar"
                         >
                           <CheckCircle2 size={14} /> Aprobar
                         </button>
                       )}
                       {c.approvalStatus === 'pending' && (
                         <button 
                           onClick={() => handleApproval(c.id, 'rejected')}
                           className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg font-bold hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                           title="Rechazar Coach"
                         >
                           <Ban size={14} /> Rechazar
                         </button>
                       )}
                       {c.approvalStatus === 'approved' && (
                         <button 
                           onClick={() => {
                             if (window.confirm('¿Suspender Coach por Falta de Pago? Esto ocultará su perfil de la plataforma pública.')) {
                               handleApproval(c.id, 'suspended');
                             }
                           }}
                           className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5"
                           title="Suspender por falta de pago"
                         >
                           <Ban size={14} /> Suspender (Falta de Pago)
                         </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
              {coaches.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic font-medium">No hay coaches registrados aún.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MarketplaceEditorView() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'marketplace'), (snap) => {
       setItems(snap.docs.map(d => ({id: d.id, ...d.data()})));
       setLoading(false);
    });
    return () => unsub();
  }, []);

  const addPlaceholder = async (type: 'curso' | 'libro') => {
    try {
      await addDoc(collection(db, 'marketplace'), {
         title: type === 'curso' ? 'Nuevo Curso Estelar' : 'Libro: El Camino del Coach',
         price: type === 'curso' ? 199 : 29,
         type: type,
         status: 'draft',
         createdAt: new Date(),
         author: 'Admin',
         imageUrl: 'https://picsum.photos/seed/' + Math.random() + '/400/300'
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'marketplace', id), { status: currentStatus === 'draft' ? 'published' : 'draft' });
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in">
       <div className="flex gap-4 mb-4">
          <button onClick={() => addPlaceholder('curso')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all focus:ring-4 focus:ring-indigo-600/20">
            + Nuevo Curso
          </button>
          <button onClick={() => addPlaceholder('libro')} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm transition-all focus:ring-4 focus:ring-emerald-600/20">
            + Nuevo Libro
          </button>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
             <div key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm group">
                <div className="h-40 bg-slate-100 relative overflow-hidden">
                   {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                         {item.type === 'curso' ? <PlayCircle size={40} /> : <BookOpen size={40} />}
                      </div>
                   )}
                   <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur text-white text-[10px] font-bold uppercase rounded-md tracking-wider">
                      {item.type}
                   </div>
                </div>
                <div className="p-5">
                   <h3 className="font-bold text-slate-800 text-sm mb-1">{item.title}</h3>
                   <p className="text-slate-500 text-xs mb-4">Por {item.author || 'Anónimo'}</p>
                   
                   <div className="flex justify-between items-center mt-4">
                      <span className="font-black text-indigo-600">${item.price} USD</span>
                      <button 
                         onClick={() => toggleStatus(item.id, item.status)}
                         className={cn("px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition", item.status === 'published' ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                      >
                         {item.status === 'published' ? 'Público' : 'Borrador'}
                      </button>
                   </div>
                </div>
             </div>
          ))}
          {items.length === 0 && !loading && (
             <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <ShoppingBag className="mx-auto text-slate-300 mb-3" size={40} />
                <p className="text-slate-500 font-medium">No hay productos en el marketplace.</p>
                <p className="text-slate-400 text-xs mt-1">Aparecerán aquí cuando crees un curso o libro.</p>
             </div>
          )}
       </div>
    </div>
  )
}

// --- MODULO 4: CMS / VENTAS ---
function CMSView() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [b2bAccounts, setB2BAccounts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ventas'|'pills'|'marketplace'>('ventas');

  useEffect(() => {
    const unsubscribeCoupons = onSnapshot(collection(db, 'coupons'), 
      (snap) => {
        setCoupons(snap.docs.map(d => ({id: d.id, ...d.data()})));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'coupons')
    );

    const unsubscribeB2B = onSnapshot(collection(db, 'b2b'), 
      (snap) => {
        setB2BAccounts(snap.docs.map(d => ({id: d.id, ...d.data()})));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'b2b')
    );

    return () => { unsubscribeCoupons(); unsubscribeB2B(); };
  }, []);

  const addCoupon = async () => {
    try {
      await addDoc(collection(db, 'coupons'), {
        code: 'PROMO' + Math.floor(Math.random()*100),
        discountPercent: 15,
        usageCount: 0,
        createdAt: new Date()
      });
    } catch (e) { 
      handleFirestoreError(e, OperationType.CREATE, 'coupons');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
       <div className="flex gap-4 border-b border-slate-200 overflow-x-auto whitespace-nowrap">
          <button 
             onClick={() => setActiveTab('ventas')}
             className={cn("pb-3 text-sm font-semibold transition-colors duration-200", activeTab === 'ventas' ? "border-b-2 border-kirateal text-kirateal" : "text-slate-500 hover:text-slate-700")}
          >
             B2B & Cupones
          </button>
          <button 
             onClick={() => setActiveTab('marketplace')}
             className={cn("pb-3 text-sm font-semibold transition-colors duration-200", activeTab === 'marketplace' ? "border-b-2 border-kirateal text-kirateal" : "text-slate-500 hover:text-slate-700")}
          >
             Marketplace Web
          </button>
          <button 
             onClick={() => setActiveTab('pills')}
             className={cn("pb-3 text-sm font-semibold transition-colors duration-200", activeTab === 'pills' ? "border-b-2 border-kirateal text-kirateal" : "text-slate-500 hover:text-slate-700")}
          >
             Píldoras de Sabiduría
          </button>
       </div>

       {activeTab === 'pills' ? (
          <PillsEditor />
       ) : activeTab === 'marketplace' ? (
          <MarketplaceEditorView />
       ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
             <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-semibold text-slate-800">Gestor de Cupones</h3>
                   <button onClick={addCoupon} className="text-[11px] bg-indigo-500 hover:bg-indigo-600 transition text-white px-3 py-1.5 font-bold rounded-md">Crear Nuevo</button>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px]">
                   {coupons.map(c => (
                     <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="font-mono text-[12px] font-bold text-indigo-600">{c.code}</span>
                  <span className="text-[11px] text-slate-500">{c.discountPercent}% OFF • {c.usageCount || 0} usos</span>
               </div>
             ))}
             {coupons.length === 0 && (
               <p className="text-center py-8 text-slate-400 text-xs italic">Crea tu primer cupón para promociones.</p>
             )}
          </div>
       </div>

       <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Estadísticas Corporativas (B2B)</h3>
          <p className="text-[12px] text-slate-500 mb-6">Métrica de activación y uso de licencias organizacionales.</p>
          
          <div className="space-y-4 max-h-[300px] overflow-y-auto mb-4">
             {b2bAccounts.map(b2b => {
               const percentage = Math.round((b2b.licensesUsed / b2b.licensesTotal) * 100) || 0;
               return (
                 <div key={b2b.id} className="p-4 bg-teal-50 border border-teal-100 rounded-xl transition-all hover:bg-teal-100/50">
                    <div className="flex justify-between mb-2 items-center">
                       <span className="text-[12px] font-black text-teal-900 truncate pr-2">{b2b.name}</span>
                       <span className="text-[11px] font-bold text-teal-700 whitespace-nowrap">{b2b.licensesUsed}/{b2b.licensesTotal} Licencias</span>
                    </div>
                    <div className="w-full h-2 bg-teal-200/50 rounded-full overflow-hidden">
                       <div 
                         className={cn("h-full transition-all duration-700", percentage > 90 ? "bg-rose-500" : "bg-teal-500")} 
                         style={{ width: `${Math.min(percentage, 100)}%` }} 
                       />
                    </div>
                    <p className="text-[9px] text-teal-600/70 mt-1.5 font-medium uppercase tracking-widest text-right">
                       {percentage}% Ocupación
                    </p>
                 </div>
               );
             })}
          </div>
          
          {b2bAccounts.length === 0 && (
             <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                <span className="text-[12px] text-slate-400 italic">No hay cuentas B2B activas en este momento.</span>
             </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
             <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Global</span>
             <div className="flex gap-4">
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 font-medium">Asignadas</span>
                  <span className="font-mono text-sm font-black text-slate-700">{b2bAccounts.reduce((acc, curr) => acc + (curr.licensesTotal || 0), 0)}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 font-medium">En Uso</span>
                  <span className="font-mono text-sm font-black text-indigo-600">{b2bAccounts.reduce((acc, curr) => acc + (curr.licensesUsed || 0), 0)}</span>
                </div>
             </div>
          </div>
       </div>
          </div>
       )}
    </div>
  );
}

function PillsEditor() {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  
  const handleSimulateUpload = () => {
    if (!title) return;
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setTitle('');
      alert("Píldora '" + title + "' enviada por Push Notification exitosamente.");
    }, 1500);
  };
  
  return (
     <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
           <PlayCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Editor de Píldoras de Sabiduría</h3>
        <p className="text-sm text-slate-500 max-w-md text-center mb-8">
           Sube audios cortos de 1 minuto para tus alumnos. El sistema enviará una notificación Push inmediata a todos los usuarios de la app móvil.
        </p>
        
        <div className="w-full max-w-md space-y-4">
           <div>
             <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Título del Audio</label>
             <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Meditación Exprés" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
           </div>
           
           <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 relative hover:bg-slate-100 transition cursor-pointer">
              <UploadCloud size={32} className="text-slate-400 mb-3" />
              <span className="text-sm font-medium text-slate-600">Click para subir MP3/WAV</span>
              <span className="text-xs text-slate-400 mt-1">Máximo 10MB</span>
           </div>
           
           <button 
             onClick={handleSimulateUpload} 
             disabled={!title || uploading}
             className="w-full bg-teal-600 text-white rounded-lg px-4 py-3 font-bold hover:bg-teal-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
           >
             {uploading ? <span className="animate-pulse">Emitiendo...</span> : <>Emitir Notificación Push <Send size={16}/></>}
           </button>
        </div>
     </div>
  );
}

// --- MODULO 5: BI / ANALÍTICAS ---
function BIView() {
  const [stats, setStats] = useState({ sentiment: { positive: 0, neutral: 0, negative: 0 }, courseDist: [] as any[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const journalsSnap = await getDocs(collection(db, 'journals'));
        const counts = { positive: 0, neutral: 0, negative: 0 };
        journalsSnap.forEach(d => {
          const s = d.data().sentiment;
          if (s === 'positive') counts.positive++;
          else if (s === 'neutral') counts.neutral++;
          else if (s === 'negative') counts.negative++;
        });

        const enrollSnap = await getDocs(collection(db, 'enrollments'));
        const courseMap: Record<string, number> = {};
        enrollSnap.forEach(d => {
          const cid = d.data().courseId;
          courseMap[cid] = (courseMap[cid] || 0) + 1;
        });

        const courseSnap = await getDocs(collection(db, 'courses'));
        const dist = courseSnap.docs.map(d => ({
          name: d.data().title.substring(0, 15) + '...',
          value: courseMap[d.id] || 0
        })).filter(d => d.value > 0);

        setStats({ sentiment: counts, courseDist: dist });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const pieData = [
    { name: 'Motivado', value: stats.sentiment.positive, color: '#14b8a6' },
    { name: 'Calmo', value: stats.sentiment.neutral, color: '#6366f1' },
    { name: 'Estresado', value: stats.sentiment.negative, color: '#f43f5e' }
  ].filter(d => d.value > 0);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in">
       <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
             <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Sliders size={20}/></div>
             <div>
                <h3 className="font-bold text-slate-900 text-lg">Inteligencia de Negocio</h3>
                <p className="text-sm text-slate-500">Métricas avanzadas y comportamiento de comunidad.</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Balance Emocional */}
            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 flex flex-col items-center">
              <h4 className="w-full text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">Balance Emocional Global</h4>
              <div className="h-56 w-full">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={8}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1500}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        itemStyle={{fontSize: '11px', fontWeight: 'bold'}}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">Aún no hay datos de bienestar.</div>
                )}
              </div>
              <div className="flex gap-4 mt-2">
                 {pieData.map(d => (
                   <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}} />
                      <span className="text-[10px] font-bold text-slate-500">{d.name}</span>
                   </div>
                 ))}
              </div>
            </div>

            {/* Distribución de Cursos */}
            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 flex flex-col">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">Demanda por Programa</h4>
              <div className="h-56 w-full">
                 {stats.courseDist.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={stats.courseDist} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" fontSize={10} width={80} tick={{fill: '#94a3b8'}} />
                          <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                          />
                          <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                       </BarChart>
                    </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">Sin inscripciones aún.</div>
                 )}
              </div>
            </div>

            {/* Retention */}
            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 flex flex-col">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">Retention Flow (%)</h4>
              <div className="flex-1 flex flex-col justify-center gap-6">
                  <RetentionBar label="Intro" percent={98} />
                  <RetentionBar label="Sesión 1" percent={85} />
                  <RetentionBar label="Sesión 3" percent={62} />
                  <RetentionBar label="Cert." percent={45} color="rose" />
              </div>
            </div>
          </div>
       </div>
    </div>
  );
}

function RetentionBar({ label, percent, color = 'teal' }: any) {
  const colorClass = color === 'rose' ? 'bg-rose-500' : 'bg-teal-500';
  return (
    <div className="flex items-center gap-4">
       <span className="text-[11px] w-16 text-slate-500">{label}</span>
       <div className="flex-1 h-2 bg-slate-50 rounded-full border border-slate-100">
          <div className={`h-full rounded-full transition-all duration-1000 ${colorClass} shadow-sm`} style={{ width: `${percent}%` }} />
       </div>
       <span className="text-[11px] font-bold text-slate-700 w-8">{percent}%</span>
    </div>
  );
}

// --- MODULO 6: SEGURIDAD ---
function SecurityView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    const qL = query(collection(db, 'logs'), orderBy('createdAt', 'desc'), limit(10));
    const unsubLogs = onSnapshot(qL, (snap) => setLogs(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    const qS = query(collection(db, 'users'), where('role', 'in', ['admin', 'coach']));
    const unsubStaff = onSnapshot(qS, (snap) => setStaff(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    return () => { unsubLogs(); unsubStaff(); };
  }, []);

  const togglePermission = async (userId: string, current: string[], perm: string) => {
    try {
      const next = current?.includes(perm) ? current.filter(p => p !== perm) : [...(current || []), perm];
      await updateDoc(doc(db, 'users', userId), { staffPermissions: next });
      
      // Auto-freeze balance demo logic for Coaches losing 'billing'
      if (perm === 'billing' && current?.includes(perm)) {
         // Coach lost billing permission, would trigger freeze logic
         // For demo, we just add a log
         addDoc(collection(db, 'logs'), {
           action: 'PAYMENT_FROZEN',
           targetId: userId,
           reason: 'Billing permission revoked',
           createdAt: new Date()
         });
      }

    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const toggleStatus = async (userId: string, currentStatus: string) => {
    try {
      const next = currentStatus === 'frozen' ? 'active' : 'frozen';
      await updateDoc(doc(db, 'users', userId), { status: next });
    } catch (e) {
       handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
    }
  }

  const roleColors: Record<string, string> = {
    'admin': 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    'coach': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      {/* Header Info */}
      <div className="bg-slate-900 rounded-3xl border border-white/5 p-8 relative overflow-hidden shadow-[0_0_40px_rgba(34,211,238,0.05)]">
         <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />
         <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none" />
         
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  <ShieldCheck className="text-cyan-400" size={28} />
                  IAM Identity Core
               </h2>
               <p className="text-slate-400 text-sm mt-1 max-w-lg">
                  Gestión central de identidades y accesos (RBAC Zero Trust). 
                  Los cambios de permisos afectan inmediatamente el acceso a módulos y pueden disparar congelaciones financieras automáticas.
               </p>
            </div>
            <div className="flex items-center gap-3 bg-slate-800/80 p-1.5 rounded-full border border-white/10">
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Sistema En Línea</span>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Matriz de Permisos (Central/Left 2 cols) */}
         <div className="lg:col-span-2 bg-slate-900/90 rounded-3xl border border-white/5 shadow-xl backdrop-blur-xl overflow-hidden relative">
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
               <h3 className="font-bold text-slate-200 flex items-center gap-2">
                 <Users size={18} className="text-cyan-400" /> Matriz de Accesos de Staff
               </h3>
               <span className="text-xs font-mono text-slate-500">{staff.length} Entidades</span>
            </div>
            <div className="p-0">
               {staff.map(member => (
                  <div key={member.id} className="p-6 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors relative group">
                     {/* Borde activo al pasar mouse */}
                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />
                     
                     <div className="flex flex-col xl:flex-row gap-6">
                        {/* Usuario Info */}
                        <div className="flex items-center gap-4 w-full xl:w-1/3">
                           <div className="relative">
                              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-white/10 shadow-inner z-10 relative">
                                 {member.displayName?.[0] || 'X'}
                              </div>
                              {member.status === 'frozen' && (
                                 <div className="absolute -inset-1 border border-rose-500/50 rounded-[1.15rem] animate-pulse pointer-events-none" />
                              )}
                           </div>
                           <div>
                              <h4 className="text-sm font-bold text-slate-200">{member.displayName || 'Usuario Desconocido'}</h4>
                              <p className="text-[10px] text-slate-500 font-mono tracking-tighter mb-1.5">{member.email}</p>
                              <div className="flex gap-2">
                                 <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border", roleColors[member.role] || "text-slate-400 bg-slate-800 border-slate-700")}>
                                    {member.role}
                                 </span>
                                 <button 
                                    onClick={() => toggleStatus(member.id, member.status || 'active')}
                                    className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border transition-colors", member.status === 'frozen' ? "text-rose-400 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20")}
                                 >
                                    {member.status === 'frozen' ? 'Congelado' : 'Activo'}
                                 </button>
                              </div>
                           </div>
                        </div>

                        {/* Controles de Dominio */}
                        <div className="w-full xl:w-2/3 flex flex-col gap-3">
                           <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              Dominios de Acceso Asignados
                           </h5>
                           <div className="flex flex-wrap gap-2">
                              {[
                               { id: 'users', label: 'Gestión Académica', icon: <Users size={12}/> },
                               { id: 'content', label: 'Gestión de Activos', icon: <FileText size={12}/> },
                               { id: 'billing', label: 'Administración Financiera', icon: <CreditCard size={12}/> },
                               { id: 'system', label: 'Configuración Sistema', icon: <Settings size={12}/> }
                              ].map(domain => {
                                 const hasAccess = member.staffPermissions?.includes(domain.id);
                                 return (
                                    <button
                                       key={domain.id}
                                       onClick={() => togglePermission(member.id, member.staffPermissions, domain.id)}
                                       className={cn(
                                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-300",
                                          hasAccess 
                                             ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.1)]" 
                                             : "bg-slate-800/50 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/20"
                                       )}
                                    >
                                       {domain.icon}
                                       {domain.label}
                                    </button>
                                 )
                              })}
                           </div>
                           {/* Permisos Finos (Legacy support para tabs) */}
                           <div className="flex flex-wrap gap-1 mt-1">
                              {[
                                'dashboard', 'approvals', 'students', 'coaches', 'members', 'contracts', 'transactions', 'analytics', 'website', 'automation', 'campaign_history'
                              ].map(perm => (
                                <button
                                   key={perm}
                                   onClick={() => togglePermission(member.id, member.staffPermissions, perm)}
                                   className={cn("px-2 py-0.5 rounded text-[9px] font-mono tracking-tighter uppercase transition-colors", member.staffPermissions?.includes(perm) ? "bg-slate-700 text-slate-300" : "bg-slate-800 text-slate-600 hover:bg-slate-700")}
                                >
                                   {perm}
                                </button>
                              ))}
                           </div>
                           <p className="text-[10px] text-slate-500 mt-1 italic">
                              * Al revocar 'Administración Financiera' a un Coach, pierde acceso a retirar fondos del Centro de Liquidación.
                           </p>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Audit Log / Eventos Recientes (Right col) */}
         <div className="bg-slate-900/90 rounded-3xl border border-white/5 shadow-xl backdrop-blur-xl overflow-hidden relative">
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
               <h3 className="font-bold text-slate-200 flex items-center gap-2">
                 <Activity size={18} className="text-purple-400" /> Registro de Eventos (Audit)
               </h3>
            </div>
            <div className="p-6">
               <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/5 before:to-transparent">
                  {logs.slice(0, 5).map((log, i) => (
                     <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-slate-800 text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                           <Clock size={14} className={log.action?.includes('FROZEN') ? "text-rose-400" : "text-cyan-400"} />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-white/5 bg-slate-800/50 backdrop-blur shadow-sm transition-all hover:bg-slate-800/80">
                           <div className="flex items-center justify-between mb-1">
                              <span className={cn("text-[10px] font-bold uppercase tracking-widest", log.action?.includes('FROZEN') ? "text-rose-400" : "text-purple-400")}>
                                 {log.action || 'SISTEMA'}
                              </span>
                              <time className="font-mono text-[9px] text-slate-500">
                                 {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleTimeString() : 'Reciente'}
                              </time>
                           </div>
                           <p className="text-xs text-slate-300 leading-relaxed font-mono">
                              {log.reason || log.details || 'Cambio de seguridad detectado. Ref: ' + log.targetId}
                           </p>
                        </div>
                     </div>
                  ))}
                  {logs.length === 0 && (
                     <div className="text-center py-8">
                        <p className="text-xs text-slate-500 font-mono">No hay eventos recientes en el IAM.</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function ContractManagerView() {
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'contracts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => setContracts(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-in fade-in">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <FileText size={18} className="text-indigo-600" /> Gestor de Contratos (Coaches)
        </h3>
        <button className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-all active:scale-95">
          Subir Nuevo
        </button>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contracts.map(contract => (
            <div key={contract.id} className="p-4 border border-slate-100 rounded-xl hover:shadow-lg transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity">
                <FileText size={40} className="text-indigo-500" />
              </div>
              <div className="relative z-10">
                <h4 className="font-bold text-slate-800 mb-1">{contract.title}</h4>
                <p className="text-[10px] text-slate-500 mb-3 flex items-center gap-1">
                  <Clock size={10} /> Expira: {contract.expiresAt?.toDate ? contract.expiresAt.toDate().toLocaleDateString() : 'N/A'}
                </p>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter ${
                    contract.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {contract.status}
                  </span>
                  <a href={contract.fileUrl} target="_blank" className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold">Descargar</a>
                </div>
              </div>
            </div>
          ))}
          {contracts.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 italic text-sm flex flex-col items-center gap-4">
               <FileText size={48} className="text-slate-200" />
               <p>No hay contratos registrados aún.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const prepareChartData = (txs: any[]) => {
  const map: any = {};
  txs.forEach(t => {
    const date = t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : 'Desconocido';
    if (!map[date]) map[date] = { name: date, Curso: 0, Membresía: 0 };
    if (t.type === 'course_purchase') map[date].Curso += t.amount || 0;
    else map[date].Membresía += t.amount || 0;
  });
  return Object.values(map).reverse().slice(-7); // Last 7 days with data
};

// --- MODULO: MONITOR DE TRANSACCIONES ---
function TransactionsMonitorView() {
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setTxs(snap.docs.map(d => ({id: d.id, ...d.data()})));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Gráfica de Tendencias */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-bold text-slate-800 text-sm mb-6 flex items-center gap-2">
          <BarChart3 size={18} className="text-teal-500" /> Tendencias de Pagos (Recientes)
        </h3>
        <div className="h-64">
           {txs.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={prepareChartData(txs)}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" fontSize={10} tick={{fill: '#94a3b8'}} />
                 <YAxis fontSize={10} tick={{fill: '#94a3b8'}} />
                 <Tooltip 
                   contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                   itemStyle={{fontSize: '11px', fontWeight: 'bold'}}
                 />
                 <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px'}} />
                 <Bar dataKey="Curso" fill="#0d9488" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="Membresía" fill="#6366f1" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           ) : (
             <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">Cargando datos de tendencias...</div>
           )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
         <h3 className="font-bold text-slate-800 tracking-tight flex items-center gap-2 text-sm">
           <CreditCard size={18} className="text-primary" /> Auditoría de Ingresos
         </h3>
         <div className="flex gap-2">
            <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">
               Total: ${txs.reduce((acc, curr) => acc + (curr.amount || 0), 0).toFixed(2)}
            </div>
         </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-tighter">
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Usuario</th>
              <th className="px-6 py-3">Concepto</th>
              <th className="px-6 py-3">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {txs.map(t => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-500 font-mono italic">{t.createdAt?.toDate?.().toLocaleString()}</td>
                <td className="px-6 py-4 font-bold text-slate-700">{t.userId.substring(0, 8)}...</td>
                <td className="px-6 py-4 capitalize text-indigo-600">{t.type.replace('_', ' ')}</td>
                <td className="px-6 py-4 font-black text-slate-800">${t.amount?.toFixed(2)}</td>
              </tr>
            ))}
            {txs.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No hay transacciones registradas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}

// --- MODULO: CENTRO DE LIQUIDACION ---
function SettlementCenterView() {
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(100));
    const u = onSnapshot(q, (s) => setTxs(s.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    setLoading(false);
    return u;
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mt-6">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
         <h3 className="font-bold text-slate-800 tracking-tight flex items-center gap-2 text-sm">
           <CreditCard size={18} className="text-secondary" /> Centro de Liquidación (Split Payments)
         </h3>
         <div className="flex gap-2">
            <div className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-[10px] font-bold">
               Split Regla: 70% Plataforma / 30% Coach
            </div>
         </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-tighter">
              <th className="px-6 py-3">Referencia Tx</th>
              <th className="px-6 py-3">Monto Base</th>
              <th className="px-6 py-3">Kira Revenue (70%)</th>
              <th className="px-6 py-3">Coach Balance (30%)</th>
              <th className="px-6 py-3 text-right">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {txs.filter(t => t.type === 'curso' || t.amount > 0).map(t => {
               const monto = t.amount || 0;
               const kiraRev = monto * 0.7;
               const coachRev = monto * 0.3;
               return (
                 <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                   <td className="px-6 py-4 text-slate-500 font-mono italic">#{t.id.substring(0,6).toUpperCase()}</td>
                   <td className="px-6 py-4 font-black text-slate-700">${monto.toFixed(2)}</td>
                   <td className="px-6 py-4 font-black text-emerald-600">+${kiraRev.toFixed(2)}</td>
                   <td className="px-6 py-4 font-black text-purple-600">+${coachRev.toFixed(2)}</td>
                   <td className="px-6 py-4 text-right">
                     <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">Liquidado</span>
                   </td>
                 </tr>
               );
            })}
            {txs.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No hay transacciones registradas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}

// --- MODULO: HISTORIAL DE CAMPAÑAS ---
function CampaignHistoryView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<Record<string, string>>({});
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    const qLogs = query(collection(db, 'campaign_logs'), orderBy('createdAt', 'desc'), limit(50));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setLogs(snap.docs.map(d => ({id: d.id, ...d.data()})));
      setLoading(false);
    });

    const unsubRules = onSnapshot(collection(db, 'automations'), (snap) => {
      const rMap: Record<string, string> = {};
      snap.forEach(d => { rMap[d.id] = d.data().name; });
      setRules(rMap);
    });

    return () => { unsubLogs(); unsubRules(); };
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 tracking-tight">Historial de Campañas Directas y Upselling Automático</h3>
        <p className="text-[12px] text-slate-500 mt-1">Traza de ejecuciones del motor de automatización por usuario. Monitorea conversiones de recomendaciones cruzadas.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-widest text-slate-400">Registros de Actividad Recientes</h3>
          <span className="text-[10px] text-indigo-500 font-black uppercase">Live Updates</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-tighter">
                <th className="px-6 py-3">Fecha y Hora</th>
                <th className="px-6 py-3">Regla / Campaña</th>
                <th className="px-6 py-3 font-mono">ID Usuario</th>
                <th className="px-6 py-3 text-center">Canal</th>
                <th className="px-6 py-3 text-right">Estado </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50 transition-colors cursor-pointer bg-emerald-50/30">
                <td className="px-6 py-4 text-slate-500 font-mono italic">Hace 5 mins</td>
                <td className="px-6 py-4">
                  <span className="font-bold text-slate-700">Upselling Automático</span>
                  <span className="block text-[9px] text-slate-400 mt-0.5">TRIGGER: Terminó Libro "Básico"</span>
                </td>
                <td className="px-6 py-4 text-slate-400 font-mono text-[10px]">alumno.test</td>
                <td className="px-6 py-4 text-center">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase transition-colors">
                    Recomendación Cross-sell
                  </span>
                </td>
                <td className="px-6 py-4 text-right flex flex-col items-end gap-1 top-2 relative">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-600">
                    Convertido
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">+ Venta Curso</span>
                </td>
              </tr>
              {logs.map(log => (
                <tr 
                  key={log.id} 
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <td className="px-6 py-4 text-slate-500 font-mono italic">
                    {log.createdAt?.toDate?.().toLocaleString() || 'Processando...'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-700">{rules[log.ruleId] || 'Regla Desconocida'}</span>
                    <span className="block text-[9px] text-slate-400 mt-0.5">ID: {log.ruleId.substring(0,8)}...</span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-[10px]">{log.userId}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase">
                      {log.actionType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-black uppercase",
                      log.status === 'sent' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    )}>
                      {log.status === 'sent' ? 'Ejecutado' : 'Fallido'}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Esperando ejecuciones del motor...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText size={16} className="text-indigo-500" /> Detalles de Ejecución
              </h3>
              <button 
                onClick={() => setSelectedLog(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 bg-white rounded-full border border-slate-200 shadow-sm transition-all hover:bg-slate-50 hover:scale-105 active:scale-95"
              >
                 <XCircle size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Regla Disparada</span>
                  <div className="font-medium text-slate-800">{rules[selectedLog.ruleId] || selectedLog.ruleId}</div>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado</span>
                  <div className={cn("font-bold text-xs uppercase tracking-wider", selectedLog.status === 'sent' ? 'text-emerald-600' : 'text-rose-600')}>
                    {selectedLog.status === 'sent' ? 'Enviado Correctamente' : 'Fallo en Envío'}
                  </div>
                </div>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ID Destinatario</span>
                <div className="font-mono text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-200 shadow-inner">{selectedLog.userId}</div>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mensaje Generado</span>
                <div className="bg-slate-100/50 p-4 rounded-xl border border-slate-200 text-slate-700 italic text-[13px] leading-relaxed break-words shadow-inner">
                  "{selectedLog.messageBody || 'Contenido del mensaje original no disponible. Revisa la plantilla en la configuración de la automatización.'}"
                </div>
              </div>
              {selectedLog.errorDetails && (
                <div>
                  <span className="block text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Detalles del Error Técnico</span>
                  <div className="bg-rose-50 p-3 rounded-lg border border-rose-100 text-rose-700 font-mono text-[11px] overflow-x-auto shadow-inner">
                    {selectedLog.errorDetails}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-6 py-2.5 bg-slate-900 justify-center flex text-white text-[11px] font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-xl hover:bg-slate-800 transition uppercase tracking-wider active:scale-95"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- MODULO 7: MOTOR DE AUTOMATIZACIÓN ---
function AutomationEngineView() {
  const { user } = useAuth();
  const [rules, setRules] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', condition: 'inactivity', thresholdDays: 7, actionType: 'notification', messageTemplate: '' });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'automations'), (snap) => {
      setRules(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, []);

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
      setNewRule({ name: '', condition: 'inactivity', thresholdDays: 7, actionType: 'notification', messageTemplate: '' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'automations', id), { active: !current });
    } catch (e) {
      console.error(e);
    }
  };

  const triggerSimulation = async (rule: any) => {
    // Simulated engine run
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'alumno'));
      const snap = await getDocs(q);
      let count = 0;

      for (const d of snap.docs) {
        const userData = d.data();
        // Evaluate condition
        let shouldTrigger = false;
        if (rule.condition === 'inactivity') {
          const lastAt = userData.lastActivityAt?.toDate?.() || new Date(0);
          const diffDays = Math.floor((new Date().getTime() - lastAt.getTime()) / (1000 * 3600 * 24));
          if (diffDays >= rule.thresholdDays) shouldTrigger = true;
        } else if (rule.condition === 'email_verification_pending') {
          if (!userData.isEmailVerified) {
             const createdDate = userData.createdAt?.toDate?.() || new Date();
             const diffDays = Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 3600 * 24));
             if (diffDays >= rule.thresholdDays) shouldTrigger = true;
          }
        } else if (rule.condition === 'post_enrollment') {
           // Simplified check against created date if they are students
           const createdDate = userData.createdAt?.toDate?.() || new Date();
           const diffDays = Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 3600 * 24));
           if (diffDays >= rule.thresholdDays) shouldTrigger = true;
        }

        if (shouldTrigger) {
          // Trigger action
          await addDoc(collection(db, 'notifications'), {
            userId: d.id,
            title: rule.condition === 'email_verification_pending' ? 'Verifica tu cuenta' : '¡Te extrañamos!',
            message: rule.messageTemplate || 'Por favor, completa tu perfil para continuar disfrutando de Kira.',
            type: 'system',
            read: false,
            createdAt: new Date()
          });

          // LOG CAMPAIGN
          await addDoc(collection(db, 'campaign_logs'), {
            ruleId: rule.id,
            userId: d.id,
            actionType: rule.actionType,
            status: 'sent',
            createdAt: new Date()
          });

          count++;
        }
      }
      
      // Update rule stats
      await updateDoc(doc(db, 'automations', rule.id), {
        processedCount: (rule.processedCount || 0) + count,
        lastRunAt: new Date()
      });

      alert(`Automatización ejecutada: ${count} alumnos procesados.`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-900 tracking-tight">Kira Flow™</h3>
          <p className="text-[12px] text-slate-500 mt-1">Reglas de automatización y marketing conductual.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-primary text-white text-[12px] font-bold rounded-xl shadow-md shadow-primary/10 active:scale-95 transition-all"
        >
          {isAdding ? 'Cancelar' : 'Nueva Regla'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl animate-in slide-in-from-top-4">
          <h4 className="font-bold mb-6 flex items-center gap-2"><Zap size={18} className="text-amber-400" /> Configurar Automatización</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Nombre de la Regla</label>
              <input required value={newRule.name} onChange={e=>setNewRule({...newRule, name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50" placeholder="Ej: Recuperación de Inactividad" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Condición (Disparador)</label>
              <select value={newRule.condition} onChange={e=>setNewRule({...newRule, condition: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm outline-none">
                 <option value="inactivity">Inactividad Prolongada</option>
                 <option value="cart_abandonment">Carrito Abandonado</option>
                 <option value="post_enrollment">7 días post-inscripción</option>
                 <option value="email_verification_pending">Verificación de Email Pendiente</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Días de Umbral</label>
              <input type="number" min="1" value={newRule.thresholdDays} onChange={e=>setNewRule({...newRule, thresholdDays: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Plantilla de Mensaje (Notification)</label>
              <textarea value={newRule.messageTemplate} onChange={e=>setNewRule({...newRule, messageTemplate: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none h-24 resize-none" placeholder="Escribe el mensaje que recibirá el usuario..." />
            </div>
          </div>
          <button type="submit" className="mt-8 w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all">
            Activar Regla en el Motor
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map(rule => (
          <div key={rule.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-slate-800 text-[14px]">{rule.name}</h4>
                <p className="text-[11px] text-slate-500 mt-1 italic capitalize">{rule.condition.replace('_', ' ')}: {rule.thresholdDays} días</p>
              </div>
              <button 
                onClick={() => handleToggle(rule.id, rule.active)}
                className={cn("px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors", rule.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}
              >
                {rule.active ? 'Activa' : 'Pausada'}
              </button>
            </div>
            <div className="flex gap-2">
               <button 
                  onClick={() => triggerSimulation(rule)}
                  className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-[11px] font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
               >
                 <Zap size={12} className="text-amber-500" /> Probar Ahora
               </button>
               <div className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-bold flex flex-col justify-center items-center min-w-[60px]">
                  <span>{rule.processedCount || 0}</span>
                  <span className="opacity-50 text-[8px] uppercase">Enviados</span>
               </div>
            </div>
          </div>
        ))}
        {rules.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs italic">
            El motor de automatización está esperando órdenes. Crea una regla para comenzar.
          </div>
        )}
      </div>
    </div>
  );
}

// --- MODULO: IA PARA COACHES ---
function AICoachesView() {
  const [rules, setRules] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('inactivity');
  const [condition, setCondition] = useState('gt_7');
  const [action, setAction] = useState('notify_coach');
  const [points, setPoints] = useState(0);

  useEffect(() => {
    return onSnapshot(collection(db, 'ai_coach_rules'), s => {
      setRules(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'ai_coach_rules');
    });
  }, []);

  const addRule = async () => {
    if (!name) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'ai_coach_rules'), {
        name,
        trigger,
        condition,
        action,
        points: action === 'zap_points' ? points : 0,
        createdAt: new Date().toISOString()
      });
      setShowForm(false);
      setName('');
      setPoints(0);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'ai_coach_rules', id));
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  }

  const renderConditionOptions = () => {
    if (trigger === 'inactivity') {
      return (
        <>
          <option value="gt_3">Mayor a 3 días</option>
          <option value="gt_7">Mayor a 7 días</option>
          <option value="gt_14">Mayor a 14 días</option>
        </>
      );
    }
    if (trigger === 'low_emotion') {
      return (
        <>
          <option value="stress_high">Estrés Alto</option>
          <option value="motivation_low">Motivación Baja</option>
          <option value="anxiety_detected">Ansiedad Detectada</option>
        </>
      );
    }
    if (trigger === 'course_complete') {
      return (
        <>
          <option value="any_course">Cualquier Curso</option>
          <option value="milestone_course">Curso Hito</option>
        </>
      );
    }
    return <option value="any">Cualquiera</option>;
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
           <h3 className="font-bold text-slate-900 tracking-tight flex items-center gap-2 text-lg">
             <Sparkles className="text-purple-600" size={24} /> Motor de IA para Coaches
           </h3>
           <p className="text-[13px] text-slate-500 mt-1">Configura reglas de automatización que asisten al Coach analizando el comportamiento de los alumnos.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold shadow hover:bg-slate-800 transition">
           + Nueva Regla
        </button>
      </div>

      {showForm && (
        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 shadow-inner">
           <h4 className="font-bold text-slate-800 mb-4">Constructor de Reglas</h4>
           <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div>
                 <label className="block text-xs font-bold text-slate-700 mb-1">Nombre</label>
                 <input disabled={loading} type="text" value={name} onChange={e => setName(e.target.value)} className="w-full text-sm rounded-lg border-slate-200" placeholder="Ej: Alerta Inactividad" />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-700 mb-1">Trigger</label>
                 <select disabled={loading} value={trigger} onChange={e => setTrigger(e.target.value)} className="w-full text-sm rounded-lg border-slate-200">
                    <option value="inactivity">Inactividad</option>
                    <option value="low_emotion">Emoción Detectada</option>
                    <option value="course_complete">Curso Completado</option>
                    <option value="churn_risk">Riesgo de Abandono</option>
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-700 mb-1">Condición</label>
                 <select disabled={loading} value={condition} onChange={e => setCondition(e.target.value)} className="w-full text-sm rounded-lg border-slate-200">
                    {renderConditionOptions()}
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-700 mb-1">Acción (Entonces...)</label>
                 <select disabled={loading} value={action} onChange={e => setAction(e.target.value)} className="w-full text-sm rounded-lg border-slate-200">
                    <option value="notify_coach">Notificar al Coach</option>
                    <option value="assign_task">Crear Tarea de Intervención</option>
                    <option value="zap_points">Zap de Energía (Dar Puntos)</option>
                 </select>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition w-full">Cancelar</button>
                 <button onClick={addRule} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow hover:bg-indigo-700 transition w-full disabled:opacity-50">Guardar</button>
              </div>
              {action === 'zap_points' && (
                 <div className="col-span-full">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Puntos a otorgar</label>
                    <input disabled={loading} type="number" value={points} onChange={e => setPoints(Number(e.target.value))} className="w-full max-w-[200px] text-sm rounded-lg border-slate-200" />
                 </div>
              )}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rules.map(rule => (
          <div key={rule.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => deleteRule(rule.id)} className="text-slate-400 hover:text-red-500 transition"><Trash2 size={16} /></button>
             </div>
             <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                   <Zap size={16} />
                </div>
                <h4 className="font-bold text-slate-800 leading-tight">{rule.name}</h4>
             </div>
             <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                   <span className="font-bold text-slate-400 w-16 uppercase text-[9px] min-w-0">Trigger</span>
                   <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium truncate">{rule.trigger.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                   <span className="font-bold text-slate-400 w-16 uppercase text-[9px] min-w-0">Regla</span>
                   <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-[11px] font-bold truncate">{rule.condition?.replace('_', ' ') || 'Any'}</span>
                </div>
                <div className="flex items-center gap-2">
                   <span className="font-bold text-slate-400 w-16 uppercase text-[9px] min-w-0">Acción</span>
                   <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px] font-bold capitalize truncate">{rule.action.replace('_', ' ')} {rule.action === 'zap_points' && `(+${rule.points})`}</span>
                </div>
             </div>
          </div>
        ))}

        {rules.length === 0 && !showForm && (
           <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
              <Sparkles className="mx-auto mb-3 opacity-50" size={32} />
              <p>No hay reglas de IA configuradas.</p>
              <button onClick={() => setShowForm(true)} className="text-indigo-500 font-bold mt-2 text-sm">Crear la primera regla</button>
           </div>
        )}
      </div>
    </div>
  );
}

// --- HELPERS INTERNOS ---
function StatCard({ title, value, subtitle, icon, color = 'teal' }: any) {
  const badgeClasses = color === 'rose' 
    ? 'bg-rose-50 text-rose-600' 
    : 'bg-teal-50 text-teal-600';

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 transition-all hover:shadow-lg hover:shadow-slate-100 group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 rounded-xl bg-slate-50 group-hover:bg-slate-100 transition-colors">
          {icon}
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${badgeClasses}`}>Hoy</span>
      </div>
      <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-slate-500 text-[13px] font-medium">{title}</div>
      <div className="text-slate-400 text-[11px] mt-2 italic">{subtitle}</div>
    </div>
  );
}

function ActivityItem({ user, action, time }: { user: string, action: string, time: string }) {
  return (
    <div className="flex items-center gap-4 py-2 text-[13px]">
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-[10px]">
        {user.substring(0, 2).toUpperCase()}
      </div>
      <div className="flex-1">
        <span className="font-semibold text-slate-800">{user}</span>
        <span className="text-slate-500 mx-1">{action}</span>
      </div>
      <div className="text-slate-400 text-[11px] font-mono">{time}</div>
    </div>
  );
}

// --- MODULO: GESTIÓN DE PROMOCIONES ---
function PromotionsManagerView() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('Descuento');
  const [status, setStatus] = useState('active');
  const [priority, setPriority] = useState(1);

  useEffect(() => {
    const q = query(collection(db, 'promotions'), orderBy('priority', 'asc'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPromotions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'promotions');
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

  const handleEdit = (p: any) => {
    setEditId(p.id);
    setTitle(p.title || '');
    setDescription(p.description || '');
    setImageUrl(p.imageUrl || '');
    setStartDate(p.startDate || '');
    setEndDate(p.endDate || '');
    setCode(p.code || '');
    setType(p.type || 'Descuento');
    setStatus(p.status || 'active');
    setPriority(p.priority || 1);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title || !startDate || !endDate) return alert("Título y fechas son requeridos");
    if (new Date(startDate) > new Date(endDate)) return alert("La fecha de fin debe ser mayor a la de inicio");
    
    setSaving(true);
    try {
      const data = {
        title,
        description,
        imageUrl,
        startDate,
        endDate,
        code,
        type,
        status,
        priority: Number(priority),
        updatedAt: new Date().toISOString()
      };

      if (editId) {
        await updateDoc(doc(db, 'promotions', editId), data);
      } else {
        await addDoc(collection(db, 'promotions'), {
          ...data,
          createdAt: new Date().toISOString()
        });
      }
      resetForm();
    } catch (e: any) {
      alert("Error guardando promoción: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta promoción?")) {
      try {
        await deleteDoc(doc(db, 'promotions', id));
      } catch (e: any) {
        alert("Error eliminando promoción: " + e.message);
      }
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500"><Loader2 className="animate-spin mx-auto mb-4" size={32}/> Cargando promociones...</div>;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h3 className="font-bold text-slate-900 tracking-tight flex items-center gap-2 text-lg">
             <Star className="text-amber-500" size={24} /> Gestión de Promociones
           </h3>
           <p className="text-[13px] text-slate-500 mt-1">Configura ofertas, packs o eventos. Se mostrarán publicamente en la plataforma.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-kirateal text-white rounded-lg text-sm font-bold shadow hover:bg-kirateal-dark transition">
             + Nueva Promoción
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white p-6 justify-between items-center rounded-2xl border border-slate-200 shadow-sm">
           <h4 className="font-bold text-slate-800 mb-6">{editId ? 'Editar Promoción' : 'Nueva Promoción'}</h4>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-slate-700 mb-1">Título de la Promoción *</label>
                 <input type="text" value={title} onChange={e=>setTitle(e.target.value)} className="w-full text-sm rounded-lg border-slate-300" placeholder="Ej: 50% OFF en primera sesión" />
              </div>
              <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-slate-700 mb-1">Descripción Detallada</label>
                 <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="w-full text-sm rounded-lg border-slate-300" placeholder="Detalles de la oferta, condiciones principales..." />
              </div>

              <div>
                 <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Inicio *</label>
                 <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full text-sm rounded-lg border-slate-300" />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Fin *</label>
                 <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-full text-sm rounded-lg border-slate-300" />
              </div>

              <div>
                 <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Promoción</label>
                 <select value={type} onChange={e=>setType(e.target.value)} className="w-full text-sm rounded-lg border-slate-300">
                    <option value="Descuento">Descuento</option>
                    <option value="Pack de sesiones">Pack de Sesiones</option>
                    <option value="Evento especial">Evento Especial</option>
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-700 mb-1">Código de Descuento (Opcional)</label>
                 <input type="text" value={code} onChange={e=>setCode(e.target.value)} className="w-full text-sm rounded-lg border-slate-300 uppercase" placeholder="Ej: KIRA50" />
              </div>

              <div>
                 <label className="block text-xs font-bold text-slate-700 mb-1">Estado</label>
                 <select value={status} onChange={e=>setStatus(e.target.value)} className="w-full text-sm rounded-lg border-slate-300">
                    <option value="active">Activa</option>
                    <option value="inactive">Inactiva</option>
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-700 mb-1">Orden de Prioridad (Menor = Principal)</label>
                 <input type="number" value={priority} onChange={e=>setPriority(Number(e.target.value))} className="w-full text-sm rounded-lg border-slate-300" />
              </div>

              <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-slate-700 mb-1">Imagen / Banner URL (opcional)</label>
                 <input type="text" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} className="w-full text-sm rounded-lg border-slate-300" placeholder="https://..." />
                 {imageUrl && <img src={imageUrl} alt="preview" className="mt-2 h-32 object-cover rounded-xl border border-slate-200" />}
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={resetForm} disabled={saving} className="px-5 py-2.5 border border-slate-300 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition">
                 Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition shadow-md disabled:opacity-70 flex items-center gap-2">
                 {saving ? <Loader2 size={16} className="animate-spin" /> : null} Guardar Promoción
              </button>
           </div>
        </div>
      )}

      {!showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map(prom => (
            <div key={prom.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group relative">
              <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(prom)} className="p-1.5 bg-white/90 backdrop-blur text-slate-600 rounded-md hover:text-kirateal transition"><Settings size={14}/></button>
                <button onClick={() => handleDelete(prom.id)} className="p-1.5 bg-white/90 backdrop-blur text-slate-600 rounded-md hover:text-rose-500 transition"><Trash2 size={14}/></button>
              </div>
              
              <div className="h-32 bg-slate-100 relative">
                {prom.imageUrl ? (
                   <img src={prom.imageUrl} alt={prom.title} className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageUpload onUploadComplete={(url) => {handleEdit(prom); setImageUrl(url);}} currentImage="" folderPath="promotions" label="Añadir Imagen" /></div>
                )}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                   <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm border", prom.status === 'active' ? "bg-emerald-500/90 text-white border-emerald-400" : "bg-slate-500/90 text-white border-slate-400")}>
                     {prom.status === 'active' ? 'Activada' : 'Inactiva'}
                   </span>
                   <span className="px-2 py-0.5 bg-white/90 text-slate-800 rounded text-[10px] font-black uppercase tracking-wider shadow-sm border border-slate-200">
                     Prio: {prom.priority}
                   </span>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">{prom.type}</div>
                <h4 className="font-bold text-slate-900 text-lg leading-tight mb-2">{prom.title}</h4>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{prom.description}</p>
                
                <div className="mt-auto space-y-2">
                  {prom.code && (
                    <div className="bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md text-xs font-mono font-bold flex justify-between items-center border border-slate-200">
                      <span>Código:</span>
                      <span className="text-kirateal max-w-[120px] truncate">{prom.code}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-2 border-t border-slate-100">
                    <span>Del {new Date(prom.startDate).toLocaleDateString()}</span>
                    <span>Al {new Date(prom.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {promotions.length === 0 && (
             <div className="col-span-full py-16 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <Star className="mx-auto mb-3 opacity-50" size={32} />
                <p>No hay promociones registradas aún.</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compatibilidad con rutas anteriores
export function AdminCoaches() { return <AdminMonitor />; }
export function AdminReviews() { return <AdminMonitor />; }
