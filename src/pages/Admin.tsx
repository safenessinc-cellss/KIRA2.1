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

  return (
    <div className="flex flex-col md:flex-row gap-8 p-6">
      {/* Sidebar */}
      <div className="w-full md:w-72 flex flex-col gap-4">
        
        {/* Logo en el sidebar */}
        <div className="flex justify-center mb-4 pt-2">
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
        {activeTab === 'dashboard' && <GlobalDashboardView />}
        {activeTab === 'analytics' && <BIView />}
        {activeTab === 'security' && isSuperAdmin && <SecurityView />}
        {activeTab === 'campaign_history' && <CampaignHistoryView />}
        {activeTab === 'ai_coaches' && <AICoachesView />}
        {activeTab === 'coaches' && <CoachCuratorView />}
        {activeTab === 'students' && <StudentManagementView />}
        {activeTab === 'content' && <CMSView />}
        {activeTab === 'promotions' && <PromotionsManagerView />}
        {activeTab === 'settlement' && <SettlementCenterView />}
        {activeTab === 'transactions' && <TransactionsMonitorView />}
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
        active 
          ? "bg-kirateal text-white shadow-md shadow-kirateal/20" 
          : "text-slate-600 hover:bg-slate-100"
      )}
    >
      <span className={active ? "text-white" : "text-slate-400"}>{icon}</span>
      {label}
    </button>
  );
}

// ============== COMPONENTES DE VISTA PRINCIPALES ==============

function GlobalDashboardView() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <LayoutDashboard className="text-kirateal" size={24} />
        Dashboard Ejecutivo
      </h2>
      <p className="text-slate-500">Bienvenido al panel de administración de KIRA.COACH</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <Users className="mx-auto text-kirateal mb-2" size={32} />
          <p className="text-2xl font-bold">0</p>
          <p className="text-xs text-slate-500">Usuarios Totales</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <CreditCard className="mx-auto text-emerald-500 mb-2" size={32} />
          <p className="text-2xl font-bold">$0</p>
          <p className="text-xs text-slate-500">Ingresos Totales</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <UserCheck className="mx-auto text-indigo-500 mb-2" size={32} />
          <p className="text-2xl font-bold">0</p>
          <p className="text-xs text-slate-500">Coaches Activos</p>
        </div>
      </div>
    </div>
  );
}

function BIView() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <BarChart3 className="text-kirateal" size={24} />
        Business Intelligence
      </h2>
      <p className="text-slate-500">Analíticas avanzadas de la plataforma</p>
    </div>
  );
}

function SecurityView() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <ShieldCheck className="text-kirateal" size={24} />
        Control de Identidad
      </h2>
      <p className="text-slate-500">Gestión de accesos y seguridad</p>
    </div>
  );
}

function CampaignHistoryView() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <AlertCircle className="text-kirateal" size={24} />
        Ciberseguridad y Logs
      </h2>
      <p className="text-slate-500">Registro de eventos y auditoría</p>
    </div>
  );
}

function AICoachesView() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Sparkles className="text-kirateal" size={24} />
        IA para Coaches
      </h2>
      <p className="text-slate-500">Configuración de reglas de IA</p>
    </div>
  );
}

function CoachCuratorView() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <UserCheck className="text-kirateal" size={24} />
        Gestión de Coaches
      </h2>
      <p className="text-slate-500">Administra los coaches de la plataforma</p>
    </div>
  );
}

function StudentManagementView() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Users className="text-kirateal" size={24} />
        Directorio de Alumnos
      </h2>
      <p className="text-slate-500">Visualiza y gestiona todos los estudiantes</p>
    </div>
  );
}

function CMSView() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <ShoppingBag className="text-kirateal" size={24} />
        CMS Académico
      </h2>
      <p className="text-slate-500">Gestión de contenido y marketplace</p>
    </div>
  );
}

function PromotionsManagerView() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Star className="text-kirateal" size={24} />
        Gestión de Promociones
      </h2>
      <p className="text-slate-500">Configura ofertas y descuentos</p>
    </div>
  );
}

function SettlementCenterView() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <PieChartIcon className="text-kirateal" size={24} />
        Centro de Liquidación
      </h2>
      <p className="text-slate-500">Gestión de pagos y splits</p>
    </div>
  );
}

function TransactionsMonitorView() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <CreditCard className="text-kirateal" size={24} />
        Finanzas Globales
      </h2>
      <p className="text-slate-500">Monitor de transacciones</p>
    </div>
  );
}

// Compatibilidad con rutas anteriores
export function AdminCoaches() { return <AdminMonitor />; }
export function AdminReviews() { return <AdminMonitor />; }
