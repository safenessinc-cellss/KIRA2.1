import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, updateDoc, doc, where, orderBy, limit, addDoc, onSnapshot, getDocs, setDoc } from 'firebase/firestore';
import { Users, LayoutDashboard, UserCheck, BookOpen, BarChart3, ShieldAlert, ShoppingBag, CreditCard, Star, Clock, AlertCircle, Ban, CheckCircle2, ShieldCheck, AlertTriangle, XCircle, Zap, FileText, Settings, HeartPulse, Loader2, Sliders, PlayCircle, UploadCloud, Send, Sparkles, TrendingUp, Activity, ChevronDown, ChevronRight, Eye, Trash2, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import { ImageUpload } from '../components/ImageUpload';
import { cn } from '../lib/utils';
import AdminApprovals from './AdminApprovals';

type AdminTab = 'dashboard' | 'approvals' | 'students' | 'coaches' | 'content' | 'analytics' | 'security' | 'transactions' | 'campaign_history' | 'settlement' | 'ai_coaches' | 'promotions';

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
    { id: 'approvals', label: 'Aprobaciones', icon: <ShieldCheck size={18}/>, category: 'Gobernanza y Acceso', perm: 'system' },
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
    if (searchQuery && !item.label.toLowerCase().includes(searchQuery.toLowerCase())) return false;
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
      <div className="w-full md:w-72 flex flex-col gap-4">
        <div className="relative group mb-2">
          <Zap className="absolute left-4 top-3.5 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Omnibar: Búsqueda y acciones..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-12 py-3 text-[13px] outline-none focus:border-cyan-500"
          />
          <div className="absolute right-4 top-3.5 flex items-center justify-center bg-slate-100 w-6 h-6 rounded text-slate-400 font-bold text-[10px]">
            ⌘K
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {categories.map(cat => (
            <div key={cat} className="flex flex-col mb-1">
              <button 
                onClick={() => toggleCategory(cat)}
                className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 rounded-xl"
              >
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{cat}</span>
                <span className="text-slate-400">
                  {expandedCategories[cat] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              </button>
              
              <div className={cn("flex flex-col gap-1 mt-1 overflow-hidden transition-all px-2", expandedCategories[cat] ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0")}>
                {filteredNav.filter(n => n.category === cat).map(item => (
                  <button 
                    key={item.id}
                    onClick={() => setActiveTab(item.id as AdminTab)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all ${
                      activeTab === item.id 
                        ? 'bg-teal-500 text-white shadow-md' 
                        : 'text-slate-600 hover:bg-white hover:text-teal-500'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {activeTab === 'dashboard' && <GlobalDashboardView />}
        {activeTab === 'analytics' && <BIView />}
        {activeTab === 'approvals' && <AdminApprovals />}
        {activeTab === 'coaches' && <div className="bg-white p-8 rounded-2xl"><h2 className="text-xl font-bold">Gestión de Coaches</h2><p className="text-slate-500 mt-2">Módulo en desarrollo...</p></div>}
        {activeTab === 'students' && <div className="bg-white p-8 rounded-2xl"><h2 className="text-xl font-bold">Directorio de Alumnos</h2><p className="text-slate-500 mt-2">Módulo en desarrollo...</p></div>}
        {activeTab === 'content' && <div className="bg-white p-8 rounded-2xl"><h2 className="text-xl font-bold">CMS Académico</h2><p className="text-slate-500 mt-2">Módulo en desarrollo...</p></div>}
        {activeTab === 'promotions' && <div className="bg-white p-8 rounded-2xl"><h2 className="text-xl font-bold">Gestión de Promociones</h2><p className="text-slate-500 mt-2">Módulo en desarrollo...</p></div>}
        {activeTab === 'settlement' && <div className="bg-white p-8 rounded-2xl"><h2 className="text-xl font-bold">Centro de Liquidación</h2><p className="text-slate-500 mt-2">Módulo en desarrollo...</p></div>}
        {activeTab === 'transactions' && <div className="bg-white p-8 rounded-2xl"><h2 className="text-xl font-bold">Finanzas Globales</h2><p className="text-slate-500 mt-2">Módulo en desarrollo...</p></div>}
        {activeTab === 'campaign_history' && <div className="bg-white p-8 rounded-2xl"><h2 className="text-xl font-bold">Historial de Campañas</h2><p className="text-slate-500 mt-2">Módulo en desarrollo...</p></div>}
        {activeTab === 'ai_coaches' && <div className="bg-white p-8 rounded-2xl"><h2 className="text-xl font-bold">IA para Coaches</h2><p className="text-slate-500 mt-2">Módulo en desarrollo...</p></div>}
        {activeTab === 'security' && isSuperAdmin && <div className="bg-white p-8 rounded-2xl"><h2 className="text-xl font-bold">IAM Identity Core</h2><p className="text-slate-500 mt-2">Módulo en desarrollo...</p></div>}
      </div>
    </div>
  );
}

// --- MODULO 1: TABLERO GLOBAL ---
function GlobalDashboardView() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">Dashboard Ejecutivo</h2>
      <p className="text-slate-500">Bienvenido al panel de administración de KIRA Coach.</p>
    </div>
  );
}

// --- MODULO: BI / ANALÍTICAS ---
function BIView() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">Business Intelligence</h2>
      <p className="text-slate-500">Métricas y análisis de la plataforma.</p>
    </div>
  );
}

// Compatibilidad
export function AdminCoaches() { return <AdminMonitor />; }
export function AdminReviews() { return <AdminMonitor />; }
