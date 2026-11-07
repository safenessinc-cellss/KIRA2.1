import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, updateDoc, doc, where, orderBy, limit, addDoc, onSnapshot, getDocs, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Users, LayoutDashboard, UserCheck, BookOpen, BarChart3, ShieldAlert, ShoppingBag, CreditCard, Star, Clock, AlertCircle, Ban, CheckCircle2, ShieldCheck, AlertTriangle, XCircle, Zap, FileText, Settings, HeartPulse, Loader2, Layout, Sliders, PlayCircle, UploadCloud, Send, Sparkles, TrendingUp, Activity, ChevronDown, ChevronRight, Eye, Trash2, PieChart as PieChartIcon, Search, Menu, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import { ImageUpload } from '../components/ImageUpload';
import { AdminBooksView } from './AdminBooksView';
import { cn } from '../lib/utils';
import { AdminExecutiveDashboard } from './AdminExecutiveDashboard';
import { useToast } from '../hooks/useToast';
import { Logo } from '../components/Brand';

type AdminTab = string;

export function AdminMonitor() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [profile, setProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    { id: 'dashboard', label: 'Dashboard ejecutivo', icon: <LayoutDashboard size={18}/>, category: 'Inicio y métricas' },
    { id: 'analytics', label: 'Analítica e indicadores', icon: <TrendingUp size={18}/>, category: 'Inicio y métricas', perm: 'system' },
    { id: 'global_reports', label: 'Reportes globales', icon: <BarChart3 size={18}/>, category: 'Inicio y métricas', perm: 'system', planned: true },
    { id: 'approvals', label: 'Aprobaciones y onboarding', icon: <ShieldCheck size={18}/>, category: 'Personas y acceso', perm: 'users' },
    { id: 'students', label: 'Alumnos', icon: <Users size={18}/>, category: 'Personas y acceso', perm: 'users' },
    { id: 'coaches', label: 'Coaches', icon: <UserCheck size={18}/>, category: 'Personas y acceso', perm: 'users' },
    { id: 'organizations', label: 'Empresas y organizaciones', icon: <Users size={18}/>, category: 'Personas y acceso', perm: 'users', planned: true },
    { id: 'security', label: 'Roles, permisos y accesos', icon: <ShieldCheck size={18}/>, category: 'Administración del sistema', superOnly: true },
    { id: 'campaign_history', label: 'Auditoría, logs y seguridad', icon: <ShieldAlert size={18}/>, category: 'Administración del sistema', perm: 'system' },
    { id: 'content', label: 'Cursos y contenidos', icon: <ShoppingBag size={18}/>, category: 'Academia y certificados', perm: 'billing' },
    { id: 'books', label: 'Biblioteca y ebooks', icon: <BookOpen size={18}/>, category: 'Academia y certificados', perm: 'users' },
    { id: 'enrollments', label: 'Inscripciones y progreso', icon: <BookOpen size={18}/>, category: 'Academia y certificados', perm: 'users', planned: true },
    { id: 'certificates', label: 'Solicitudes y certificados', icon: <FileText size={18}/>, category: 'Academia y certificados', perm: 'users' },
    { id: 'ai_coaches', label: 'Herramientas IA para coaches', icon: <Sparkles size={18}/>, category: 'Academia y certificados', perm: 'system' },
    { id: 'marketplace_profiles', label: 'Perfiles públicos de coaches', icon: <UserCheck size={18}/>, category: 'Marketplace', perm: 'users', planned: true },
    { id: 'marketplace_products', label: 'Productos y servicios', icon: <ShoppingBag size={18}/>, category: 'Marketplace', perm: 'billing', planned: true },
    { id: 'marketplace_courses', label: 'Cursos publicados', icon: <BookOpen size={18}/>, category: 'Marketplace', perm: 'billing', planned: true },
    { id: 'marketplace_books', label: 'Libros publicados', icon: <BookOpen size={18}/>, category: 'Marketplace', perm: 'billing', planned: true },
    { id: 'marketplace_sessions', label: 'Sesiones de coaching', icon: <Clock size={18}/>, category: 'Marketplace', perm: 'users', planned: true },
    { id: 'marketplace_orders', label: 'Pedidos', icon: <CreditCard size={18}/>, category: 'Marketplace', perm: 'billing', planned: true },
    { id: 'marketplace_bookings', label: 'Reservas', icon: <Clock size={18}/>, category: 'Marketplace', perm: 'users', planned: true },
    { id: 'marketplace_reviews', label: 'Valoraciones y reseñas', icon: <Star size={18}/>, category: 'Marketplace', perm: 'users' },
    { id: 'marketplace_moderation', label: 'Moderación', icon: <ShieldAlert size={18}/>, category: 'Marketplace', perm: 'system', planned: true },
    { id: 'transactions', label: 'Pagos y transacciones', icon: <CreditCard size={18}/>, category: 'Finanzas', perm: 'billing' },
    { id: 'refunds', label: 'Reembolsos', icon: <CreditCard size={18}/>, category: 'Finanzas', perm: 'billing', planned: true },
    { id: 'commissions', label: 'Comisiones', icon: <PieChartIcon size={18}/>, category: 'Finanzas', perm: 'billing', planned: true },
    { id: 'settlement', label: 'Liquidaciones de coaches', icon: <PieChartIcon size={18}/>, category: 'Finanzas', perm: 'billing' },
    { id: 'invoicing', label: 'Facturación', icon: <FileText size={18}/>, category: 'Finanzas', perm: 'billing', planned: true },
    { id: 'subscriptions', label: 'Suscripciones', icon: <CreditCard size={18}/>, category: 'Finanzas', perm: 'billing', planned: true },
    { id: 'reconciliation', label: 'Conciliación financiera', icon: <BarChart3 size={18}/>, category: 'Finanzas', perm: 'billing', planned: true },
    { id: 'promotions', label: 'Promociones y cupones', icon: <Star size={18}/>, category: 'Marketing y ventas', perm: 'billing' },
    { id: 'campaigns', label: 'Campañas', icon: <Send size={18}/>, category: 'Marketing y ventas', perm: 'billing', planned: true },
    { id: 'landing_pages', label: 'Landing pages', icon: <Layout size={18}/>, category: 'Marketing y ventas', perm: 'system', planned: true },
    { id: 'conversion', label: 'Conversión', icon: <TrendingUp size={18}/>, category: 'Marketing y ventas', perm: 'system', planned: true },
    { id: 'sales_tracking', label: 'Seguimiento comercial', icon: <Activity size={18}/>, category: 'Marketing y ventas', perm: 'billing', planned: true },
    { id: 'contracts', label: 'Contratos corporativos', icon: <FileText size={18}/>, category: 'Empresas y bienestar B2B', perm: 'system' },
    { id: 'corporate_plans', label: 'Planes corporativos', icon: <Settings size={18}/>, category: 'Empresas y bienestar B2B', perm: 'system', planned: true },
    { id: 'licenses', label: 'Licencias', icon: <CheckCircle2 size={18}/>, category: 'Empresas y bienestar B2B', perm: 'system', planned: true },
    { id: 'employees', label: 'Empleados', icon: <Users size={18}/>, category: 'Empresas y bienestar B2B', perm: 'system', planned: true },
    { id: 'corporate_reports', label: 'Reportes agregados', icon: <BarChart3 size={18}/>, category: 'Empresas y bienestar B2B', perm: 'system', planned: true },
    { id: 'corporate_billing', label: 'Facturación corporativa', icon: <CreditCard size={18}/>, category: 'Empresas y bienestar B2B', perm: 'system', planned: true },
    { id: 'ai_settings', label: 'Configuración de IA', icon: <Sparkles size={18}/>, category: 'KIRA AI y configuración', perm: 'system', planned: true },
    { id: 'ai_usage', label: 'Uso y consumo IA', icon: <Activity size={18}/>, category: 'KIRA AI y configuración', perm: 'system', planned: true },
    { id: 'ai_providers', label: 'Modelos y proveedores', icon: <Settings size={18}/>, category: 'KIRA AI y configuración', perm: 'system', planned: true },
    { id: 'ai_quotas', label: 'Límites y cuotas', icon: <Sliders size={18}/>, category: 'KIRA AI y configuración', perm: 'system', planned: true },
    { id: 'website', label: 'Tema visual, branding y marca', icon: <Layout size={18}/>, category: 'Administración del sistema', perm: 'system' },
    { id: 'settings', label: 'Configuración general', icon: <Settings size={18}/>, category: 'Administración del sistema', perm: 'system', planned: true },
    { id: 'integrations', label: 'Integraciones y servicios externos', icon: <Zap size={18}/>, category: 'Administración del sistema', perm: 'system', planned: true },
    { id: 'notifications', label: 'Notificaciones del sistema', icon: <AlertCircle size={18}/>, category: 'Administración del sistema', perm: 'system', planned: true },
    { id: 'platform', label: 'Parámetros de plataforma', icon: <Sliders size={18}/>, category: 'Administración del sistema', perm: 'system', planned: true },
    { id: 'automation', label: 'Automatizaciones del sistema', icon: <Zap size={18}/>, category: 'Administración del sistema', perm: 'system' },
  ];
  const filteredNav = navItems.filter(item => {
    if (searchQuery && !item.label.toLowerCase().includes(searchQuery.toLowerCase()) && !item.category.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const canOpen = (item: any) => item.superOnly ? isSuperAdmin : hasPerm(item);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Inicio y métricas': true,
    'Personas y acceso': true,
    'Academia y certificados': true,
    'Finanzas': true,
    'Marketing y ventas': true
  });

  const categories = Array.from(new Set(filteredNav.map(n => n.category)));

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const selectAdminTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="relative flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:hidden">
        <div className="flex min-w-0 items-center gap-2"><Logo size={34} /><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">Centro de Mando</p><p className="truncate text-xs text-slate-500">Administración KIRA</p></div></div>
        <button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menú de módulos" aria-expanded={mobileMenuOpen} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700"><Menu size={20}/></button>
      </div>
      {mobileMenuOpen && <button type="button" aria-label="Cerrar menú" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-[70] bg-slate-950/40 lg:hidden" />}
      {/* Único menú administrativo: drawer en móvil y sidebar en escritorio */}
      <aside className={cn("flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl lg:sticky lg:top-4 lg:z-auto lg:w-72 lg:shrink-0 lg:shadow-sm", mobileMenuOpen ? "fixed inset-y-0 left-0 z-[80] w-[min(20rem,88vw)] overflow-y-auto rounded-none" : "hidden lg:flex")}>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-indigo-50 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3"><Logo size={38}/><div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-700">KIRA COACH</div><div className="mt-1 text-sm font-extrabold text-slate-900">Ecosistema de Bienestar</div><div className="mt-1 text-[11px] text-slate-500">Centro de Mando</div></div></div>
          <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Cerrar menú" className="rounded-lg p-2 text-slate-500 hover:bg-white lg:hidden"><X size={18}/></button>
        </div>
        {/* Búsqueda rápida de módulos */}
        <div className="relative group mb-2">
           <Zap className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={16} />
           <input 
             type="text" 
             placeholder="Buscar módulo..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-12 py-3 text-[13px] outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 shadow-sm transition-all"
           />
           <div className="absolute right-4 top-3.5 flex items-center justify-center bg-slate-100 w-6 h-6 rounded text-slate-400 font-bold text-[10px] border border-slate-200 shadow-inner">
             ⌘K
           </div>
        </div>


        <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-1">
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
                    disabled={!canOpen(item)}
                    onClick={() => canOpen(item) && selectAdminTab(item.id as AdminTab)} 
                    icon={item.icon} 
                    label={item.label} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Área principal: dashboard inicial y contenido del módulo seleccionado */}
      <div className="min-w-0 flex-1 w-full">
        {activeTab === 'dashboard' && hasPerm(navItems.find(i=>i.id==='dashboard')) && <GlobalDashboardView onNavigate={(tab) => setActiveTab(tab)} />}
        {activeTab === 'analytics' && hasPerm(navItems.find(i=>i.id==='analytics')) && <BIView />}

        {activeTab === 'security' && isSuperAdmin && <SecurityView />}
        {activeTab === 'campaign_history' && hasPerm(navItems.find(i=>i.id==='campaign_history')) && <CampaignHistoryView />}
        {activeTab === 'ai_coaches' && hasPerm(navItems.find(i=>i.id==='ai_coaches')) && <AICoachesView />}

        {activeTab === 'coaches' && hasPerm(navItems.find(i=>i.id==='coaches')) && <CoachManagementView />}
        {activeTab === 'approvals' && hasPerm(navItems.find(i=>i.id==='approvals')) && <UserApprovalsView />}
        {activeTab === 'students' && hasPerm(navItems.find(i=>i.id==='students')) && <StudentManagementView />}
        {activeTab === 'books' && hasPerm(navItems.find(i=>i.id==='books')) && <AdminBooksView />}
        {activeTab === 'certificates' && hasPerm(navItems.find(i=>i.id==='certificates')) && <CertificateRequestsAdminView />}
        {activeTab === 'content' && hasPerm(navItems.find(i=>i.id==='content')) && <CMSView />}
        {activeTab === 'promotions' && hasPerm(navItems.find(i=>i.id==='promotions')) && <PromotionsManagerView />}

        {activeTab === 'settlement' && hasPerm(navItems.find(i=>i.id==='settlement')) && <SettlementCenterView />}
        {activeTab === 'transactions' && hasPerm(navItems.find(i=>i.id==='transactions')) && <TransactionsMonitorView />}
        {activeTab === 'contracts' && hasPerm(navItems.find(i=>i.id==='contracts')) && <ContractManagerView />}
        {activeTab === 'website' && hasPerm(navItems.find(i=>i.id==='website')) && <WebsiteConfigView />}
        {activeTab === 'automation' && hasPerm(navItems.find(i=>i.id==='automation')) && <AutomationEngineView />}
        {activeTab === 'marketplace_reviews' && hasPerm(navItems.find(i=>i.id==='marketplace_reviews')) && <ReviewModerationView />}
        {navItems.some(item => item.id === activeTab && (item as any).planned) && <AdminPlannedModuleView item={navItems.find(item => item.id === activeTab)!} />}
      </div>
    </div>
  );
}

function CoachManagementView() {
  const [coaches, setCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), snapshot => {
      const rows: any[] = snapshot.docs.map(d=>({id:d.id,...d.data()}));
      setCoaches(rows.filter(row=>String(row.role || '').toLowerCase()==='coach'));
      setLoading(false); setError('');
    }, err => { console.error('Coach registry failed',err); setLoading(false); setError('No se pudo cargar la lista de coaches.'); });
    return () => unsubscribe();
  }, []);
  const filtered=coaches.filter(row=>`${row.displayName||row.name||''} ${row.email||''} ${row.specialty||''}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-bold text-slate-900">Gestión de coaches</h2><p className="mt-1 text-sm text-slate-500">{coaches.length} perfiles de coach registrados</p></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar coach…" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:max-w-xs"/></div>{error&&<p role="alert" className="text-sm text-rose-600">{error}</p>}{loading?<p className="text-sm text-slate-500">Cargando coaches…</p>:filtered.length===0?<p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No se encontraron coaches.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[550px] text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="pb-3">Coach</th><th className="pb-3">Especialidad</th><th className="pb-3">Aprobación</th><th className="pb-3">Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(row=><tr key={row.id}><td className="py-3"><div className="font-semibold text-slate-800">{row.displayName||row.name||'Coach'}</div><div className="text-xs text-slate-500">{row.email||row.id}</div></td><td className="py-3">{row.specialty||row.specialties?.join?.(', ')||'—'}</td><td className="py-3">{row.approvalStatus||row.status|| (row.approved?'approved':'pending')}</td><td className="py-3">{row.status||'—'}</td></tr>)}</tbody></table></div>}</div>;
}

function ReviewModerationView() {
  const { user } = useAuth();
  const [reviews,setReviews]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState<string|null>(null);
  const isSuperAdmin=user?.email==='safeness.c.a@gmail.com';
  useEffect(()=>{const unsubscribe=onSnapshot(query(collection(db,'reviews'),orderBy('createdAt','desc'),limit(100)),snapshot=>{setReviews(snapshot.docs.map(d=>({id:d.id,...d.data()})));setLoading(false);setError('');},err=>{console.error('Review moderation failed',err);setLoading(false);setError('No se pudieron cargar reseñas.');});return()=>unsubscribe();},[]);
  const toggle=async(review:any)=>{if(!isSuperAdmin||busy)return;setBusy(review.id);setError('');try{await updateDoc(doc(db,'reviews',review.id),{status:review.status==='hidden'?'published':'hidden',moderatedBy:user?.uid,moderatedAt:new Date()});}catch(err){console.error(err);setError('No se pudo actualizar la reseña.');}finally{setBusy(null);}};
  return <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><div><h2 className="text-xl font-bold text-slate-900">Valoraciones y reseñas</h2><p className="mt-1 text-sm text-slate-500">Moderación de reseñas reales de usuarios. No se crean reseñas de ejemplo.</p></div>{error&&<p role="alert" className="text-sm text-rose-600">{error}</p>}{loading?<p className="text-sm text-slate-500">Cargando reseñas…</p>:reviews.length===0?<p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No hay reseñas registradas.</p>:<div className="space-y-3">{reviews.map(review=><article key={review.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="font-semibold text-slate-800">Curso: {review.courseId||'—'} · {review.rating??'—'}/5</div><p className="mt-1 text-sm text-slate-600">{review.comment||'Sin comentario'}</p><p className="mt-1 text-xs text-slate-400">Autor UID: {review.userId||'—'} · {review.status||'pending'}</p></div><button disabled={!isSuperAdmin||busy===review.id} onClick={()=>toggle(review)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">{review.status==='hidden'?'Publicar':'Ocultar'}</button></div></article>)}</div>}</div>;
}

function UserApprovalsView() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const isSuperAdmin = user?.email === 'safeness.c.a@gmail.com';

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      const rows: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(rows.filter(row => String(row.status || '').toLowerCase() === 'pending' || (String(row.role || '').toLowerCase().includes('coach') && row.approved !== true && !['approved','rejected','active'].includes(String(row.status || '').toLowerCase()))));
      setLoading(false); setError('');
    }, err => { console.error('User approval list failed', err); setLoading(false); setError('No se pudieron cargar las aprobaciones. Revisa los permisos de Firestore.'); });
    return () => unsub();
  }, []);

  const decide = async (row: any, approved: boolean) => {
    if (!isSuperAdmin) { setError('Solo el superadministrador puede aprobar o rechazar usuarios.'); return; }
    if (!user?.uid || busy) return;
    const ok = window.confirm(approved ? '¿Aprobar este usuario?' : '¿Rechazar esta solicitud?');
    if (!ok) return;
    setBusy(row.id); setError('');
    try {
      const update: any = { status: approved ? 'approved' : 'rejected', approvalStatus: approved ? 'approved' : 'rejected', reviewedAt: new Date(), reviewedBy: user.uid };
      if (approved) { update.approved = true; update.approvedAt = new Date(); update.approvedBy = user.uid; }
      await updateDoc(doc(db, 'users', row.id), update);
    } catch (err) { console.error(err); setError('No se pudo guardar la decisión. El servidor/Firestore rechazó la operación.'); }
    finally { setBusy(null); }
  };

  return <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <div><h2 className="text-xl font-bold text-slate-900">Aprobaciones y onboarding</h2><p className="mt-1 text-sm text-slate-500">Solicitudes pendientes reales de usuarios y coaches.</p></div>
    {error && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    {loading ? <p className="text-sm text-slate-500">Cargando solicitudes…</p> : items.length===0 ? <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No hay solicitudes pendientes.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="pb-3">Usuario</th><th className="pb-3">Rol</th><th className="pb-3">Estado</th><th className="pb-3 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map(row=><tr key={row.id}><td className="py-3"><div className="font-semibold text-slate-800">{row.displayName || row.name || 'Usuario'}</div><div className="text-xs text-slate-500">{row.email || row.id}</div></td><td className="py-3">{row.role || 'Sin rol'}</td><td className="py-3"><span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">{row.status || 'Pendiente'}</span></td><td className="py-3 text-right"><div className="inline-flex gap-2"><button disabled={!isSuperAdmin || busy===row.id} onClick={()=>decide(row,true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Aprobar</button><button disabled={!isSuperAdmin || busy===row.id} onClick={()=>decide(row,false)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">Rechazar</button></div></td></tr>)}</tbody></table></div>}
  </div>;
}

function StudentManagementView() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      const rows: any[] = snap.docs.map(d=>({id:d.id,...d.data()})); setStudents(rows.filter(row=>['student','alumno','learner'].includes(String(row.role || row.type || '').toLowerCase())));
      setLoading(false); setError('');
    }, err => { console.error('Students list failed', err); setLoading(false); setError('No se pudo cargar el listado de alumnos.'); });
    return () => unsub();
  }, []);
  const filtered = students.filter(row => `${row.displayName || row.name || ''} ${row.email || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-bold text-slate-900">Gestión de alumnos</h2><p className="mt-1 text-sm text-slate-500">{students.length} perfiles de alumno</p></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre o email…" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:max-w-xs"/></div>{error && <p role="alert" className="text-sm text-rose-600">{error}</p>}{loading ? <p className="text-sm text-slate-500">Cargando alumnos…</p> : filtered.length===0 ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No se encontraron alumnos con esos criterios.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="pb-3">Alumno</th><th className="pb-3">Estado</th><th className="pb-3">ID</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(row=><tr key={row.id}><td className="py-3"><div className="font-semibold text-slate-800">{row.displayName || row.name || 'Alumno'}</div><div className="text-xs text-slate-500">{row.email || 'Email no disponible'}</div></td><td className="py-3">{row.status || (row.disabled ? 'Deshabilitado' : 'Activo')}</td><td className="py-3 font-mono text-xs text-slate-500">{row.id}</td></tr>)}</tbody></table></div>}</div>;
}

function CMSView() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'courses'), snap => { setCourses(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); setError(''); }, err => { console.error('Course admin source failed', err); setLoading(false); setError('No se pudieron cargar los cursos.'); });
    return () => unsub();
  }, []);
  return <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><div><h2 className="text-xl font-bold text-slate-900">Cursos y contenidos</h2><p className="mt-1 text-sm text-slate-500">Listado de cursos registrados en Firestore; edición/publicación segura pendiente de backend.</p></div>{error && <p role="alert" className="text-sm text-rose-600">{error}</p>}{loading ? <p className="text-sm text-slate-500">Cargando cursos…</p> : courses.length===0 ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No hay cursos registrados.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="pb-3">Curso</th><th className="pb-3">Estado</th><th className="pb-3">Precio</th><th className="pb-3">Coach</th></tr></thead><tbody className="divide-y divide-slate-100">{courses.map(row=><tr key={row.id}><td className="py-3 font-semibold text-slate-800">{row.title || 'Sin título'}</td><td className="py-3">{row.status || (row.published ? 'Publicado' : 'Borrador')}</td><td className="py-3">{row.price != null ? `${row.currency || 'USD'} ${row.price}` : '—'}</td><td className="py-3">{row.coachName || row.coachId || '—'}</td></tr>)}</tbody></table></div>}</div>;
}

function AdminPlannedModuleView({ item }: { item: any }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
    <div className="mb-3 flex items-center gap-3"><span className="rounded-xl bg-amber-50 p-3 text-amber-700">{item.icon}</span><div><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Módulo pendiente de implementación</p><h2 className="text-xl font-bold text-slate-900">{item.label}</h2></div></div>
    <p className="max-w-2xl text-sm leading-relaxed text-slate-600">El módulo está organizado en la navegación, pero sus operaciones y APIs aún no están implementadas ni validadas. No se muestran registros de ejemplo ni se permiten acciones simuladas.</p>
    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><strong>Estado:</strong> pendiente de conectar datos reales, permisos backend, validaciones, auditoría y pruebas. No utilizar para operaciones productivas.</div>
  </div>;
}

function NavButton({ active, onClick, icon, label, disabled = false }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, disabled?: boolean }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Tu rol no tiene permiso para abrir este módulo' : label}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-[13px] font-medium transition-all ${
        active 
          ? 'bg-kirateal text-white shadow-md shadow-kirateal/10' 
          : disabled
            ? 'text-slate-400 opacity-70 cursor-not-allowed'
            : 'text-slate-600 hover:bg-slate-50 hover:text-kirateal'
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {disabled && <ShieldAlert size={13} aria-label="Sin permisos" />}
    </button>
  );
}

// --- MODULO: CONFIGURACIÓN SITIO WEB (BRANDING ENGINE) ---
function WebsiteConfigView() {
  const [config, setConfig] = useState<any>({ heroImage: '', secondaryImage: '', primaryColor: '#1ec6b6', secondaryColor: '#8b5cf6' });
  const [history, setHistory] = useState<any[]>([]);

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
function GlobalDashboardView({ onNavigate }: { onNavigate?: (tab: string) => void }) { return <AdminExecutiveDashboard onNavigate={onNavigate} />; }

function BIView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [range, setRange] = useState<30 | 90>(30);

  useEffect(() => {
    let alive = true;
    Promise.all([getDocs(collection(db, 'users')), getDocs(collection(db, 'enrollments')), getDocs(collection(db, 'courses'))])
      .then(([userSnap, enrollSnap, courseSnap]) => {
        if (!alive) return;
        setUsers(userSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setEnrollments(enrollSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setError('');
      })
      .catch(err => { console.error('Admin analytics source failed', err); if (alive) setError('No se pudieron cargar los datos analíticos. Comprueba permisos de Firestore.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const asDate = (value: any) => { try { const date = value?.toDate ? value.toDate() : new Date(value); return Number.isNaN(date.getTime()) ? null : date; } catch { return null; } };
  const trend = Array.from({ length: range === 30 ? 30 : 12 }, (_, index) => {
    const d = new Date(); d.setDate(d.getDate() - (range === 30 ? (29-index) : (11-index)*7));
    const key = d.toISOString().slice(0, range === 30 ? 10 : 7);
    const label = range === 30 ? d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : d.toLocaleDateString('es-ES', { month: 'short', day: '2-digit' });
    const usersCount = users.filter(row => { const date = asDate(row.createdAt ?? row.registeredAt); return date && date.toISOString().slice(0, range === 30 ? 10 : 7) === key; }).length;
    const enrollCount = enrollments.filter(row => { const date = asDate(row.createdAt ?? row.enrolledAt); return date && date.toISOString().slice(0, range === 30 ? 10 : 7) === key; }).length;
    return { label, users: usersCount, enrollments: enrollCount };
  });
  const coursesDemand = courses.map(course => ({ name: String(course.title || 'Curso').slice(0, 24), enrolled: enrollments.filter(row => row.courseId === course.id).length })).filter(row => row.enrolled > 0).sort((a,b)=>b.enrolled-a.enrolled).slice(0,8);
  const activeEnrollments = enrollments.filter(row => !['cancelled','canceled','refunded'].includes(String(row.status || '').toLowerCase())).length;

  return <div className="space-y-5">
    <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-bold text-slate-900">Analítica e indicadores</h2><p className="mt-1 text-sm text-slate-500">Tendencias calculadas a partir de usuarios, cursos e inscripciones reales.</p></div><div className="flex rounded-xl bg-slate-100 p-1">{([30,90] as const).map(days=><button key={days} onClick={()=>setRange(days)} className={cn("rounded-lg px-3 py-2 text-xs font-bold",range===days?"bg-white text-slate-900 shadow-sm":"text-slate-500")}>{days===30?'30 días':'12 semanas'}</button>)}</div></header>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    {loading ? <div className="rounded-xl bg-white p-6 text-sm text-slate-500">Cargando datos reales…</div> : <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><StatCard title="Usuarios registrados" value={users.length.toLocaleString('es-ES')} subtitle="Registros en users" icon={<Users className="text-blue-500"/>}/><StatCard title="Inscripciones activas" value={activeEnrollments.toLocaleString('es-ES')} subtitle="Sin cancelación/refund" icon={<BookOpen className="text-teal-500"/>}/><StatCard title="Cursos disponibles" value={courses.length.toLocaleString('es-ES')} subtitle="Registros en courses" icon={<BookOpen className="text-violet-500"/>}/></div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><h3 className="font-bold text-slate-900">Nuevos usuarios e inscripciones</h3><p className="mt-1 text-xs text-slate-500">Período {range===30?'diario':'semanal'} · no se extrapolan datos faltantes.</p>{trend.some(row=>row.users||row.enrollments)?<div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" fontSize={10}/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Line dataKey="users" name="Usuarios" stroke="#0d9488" strokeWidth={2} dot={false}/><Line dataKey="enrollments" name="Inscripciones" stroke="#6366f1" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div>:<div className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No hay fechas válidas en las fuentes para graficar el período.</div>}</div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><h3 className="font-bold text-slate-900">Demanda por curso</h3><p className="mt-1 text-xs text-slate-500">Conteo de inscripciones agrupadas por courseId.</p>{coursesDemand.length?<div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={coursesDemand} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="name" width={110} fontSize={10}/><Tooltip/><Bar dataKey="enrolled" name="Inscripciones" fill="#0d9488" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></div>:<div className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Todavía no hay inscripciones vinculadas a cursos.</div>}</div>
      </div>
    </>}
  </div>;
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
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const qL = query(collection(db, 'logs'), orderBy('createdAt', 'desc'), limit(10));
    const unsubLogs = onSnapshot(qL, (snap) => setLogs(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    const qS = query(collection(db, 'users'), where('role', 'in', ['admin', 'coach']));
    const unsubStaff = onSnapshot(qS, (snap) => setStaff(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    return () => { unsubLogs(); unsubStaff(); };
  }, []);

  const handleSearch = async () => {
    if (!searchEmail) return;
    setSearchLoading(true);
    setSearchResult(null);
    try {
      const q = query(collection(db, 'users'), where('email', '==', searchEmail.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setSearchResult({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        alert("Usuario con ese email no fue encontrado.");
      }
    } catch(e) {
      handleFirestoreError(e, OperationType.GET, 'users');
    }
    setSearchLoading(false);
  }

  const changeRole = async (userId: string, newRole: string) => {
    if (!confirm(`¿Estás seguro de cambiar el rol a ${newRole}?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      if (searchResult && searchResult.id === userId) {
        setSearchResult({...searchResult, role: newRole});
      }
      // Log interaction
      addDoc(collection(db, 'logs'), {
         action: 'ROLE_CHANGED',
         targetId: userId,
         reason: `Role changed to ${newRole}`,
         createdAt: new Date()
      });
      alert("Rol actualizado correctamente.");
    } catch(e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
    }
  }

  const togglePermission = async (userId: string, current: string[], perm: string) => {
    try {
      const next = current?.includes(perm) ? current.filter(p => p !== perm) : [...(current || []), perm];
      await updateDoc(doc(db, 'users', userId), { staffPermissions: next });
      


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
         {/* Búsqueda y Asignación de Roles */}
         <div className="lg:col-span-3 bg-slate-900/90 rounded-3xl border border-white/5 shadow-xl backdrop-blur-xl p-6 relative mb-2">
             <h3 className="font-bold text-slate-200 flex items-center gap-2 mb-4">
               <ShieldCheck size={18} className="text-cyan-400" /> Búsqueda y Asignación de Roles
             </h3>
             <div className="flex flex-col sm:flex-row gap-3">
               <input 
                 type="email" 
                 placeholder="Ingrese email del usuario (ej: admin@kira.com)" 
                 value={searchEmail} 
                 onChange={e => setSearchEmail(e.target.value)} 
                 className="flex-1 rounded-xl bg-slate-800/50 border border-white/10 text-white px-4 py-2.5 text-sm outline-none focus:border-cyan-500/50 transition-colors"
                 onKeyDown={e => e.key === 'Enter' && handleSearch()}
               />
               <button 
                 onClick={handleSearch} 
                 disabled={searchLoading || !searchEmail}
                 className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-xl px-6 py-2.5 text-sm font-bold transition-colors shadow-[0_0_15px_rgba(34,211,238,0.15)] flex items-center justify-center gap-2 disabled:opacity-50"
               >
                 {searchLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                 Buscar Usuario
               </button>
             </div>
             
             {searchResult && (
               <div className="mt-6 flex flex-col md:flex-row items-center gap-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                 <div className="flex items-center gap-4 flex-1">
                   <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                     {searchResult.displayName?.[0] || 'X'}
                   </div>
                   <div>
                     <p className="text-white font-bold">{searchResult.displayName || 'Sin Nombre'}</p>
                     <p className="text-slate-400 text-sm">{searchResult.email}</p>
                     <div className="mt-1">
                       <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border", roleColors[searchResult.role] || "text-slate-400 bg-slate-800 border-slate-700")}>
                          Rol Actual: {searchResult.role}
                       </span>
                     </div>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-3">
                    <select 
                      value="" 
                      onChange={(e) => {
                         if (e.target.value) changeRole(searchResult.id, e.target.value);
                      }}
                      className="bg-slate-800 border border-white/10 rounded-lg text-sm text-white px-3 py-2 outline-none focus:border-cyan-500/50"
                    >
                      <option value="">Cambiar Rol a...</option>
                      <option value="admin">Administrador (admin)</option>
                      <option value="coach">Coach (coach)</option>
                      <option value="alumno">Alumno (alumno)</option>
                    </select>
                 </div>
               </div>
             )}
         </div>

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
  const map: Record<string, { name: string; Curso: number; Membresía: number; date: Date }> = {};
  txs.filter(t => ['paid','succeeded','successful','confirmed','complete','completed'].includes(String(t.status ?? t.paymentStatus ?? '').toLowerCase()) && Number(t.amount) > 0).forEach(t => {
    const dateObj = t.paidAt?.toDate ? t.paidAt.toDate() : t.createdAt?.toDate ? t.createdAt.toDate() : null;
    if (!dateObj) return;
    const date = dateObj.toLocaleDateString('es-ES');
    if (!map[date]) map[date] = { name: date, Curso: 0, Membresía: 0, date: dateObj };
    if (t.type === 'course_purchase' || t.type === 'curso') map[date].Curso += Number(t.amount) || 0;
    else if (t.type === 'coach_membership' || t.type === 'membership') map[date].Membresía += Number(t.amount) || 0;
  });
  return Object.values(map).sort((a,b)=>a.date.getTime()-b.date.getTime()).slice(-7).map(({date,...row})=>row);
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
                <td className="px-6 py-4 font-bold text-slate-700">{t.userEmail || (t.userId ? t.userId.substring(0, 8) + '...' : 'Unknown')}</td>
                <td className="px-6 py-4 capitalize text-indigo-600">{(t.type || '').replace('_', ' ')}</td>
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
  const [error, setError] = useState('');
  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(200));
    const unsubscribe = onSnapshot(q, snapshot => { setTxs(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); setError(''); }, err => { console.error('Settlement transactions unavailable', err); setLoading(false); setError('No se pudieron cargar las transacciones.'); });
    return unsubscribe;
  }, []);
  const paid = txs.filter(t => ['paid','succeeded','successful','confirmed','complete','completed'].includes(String(t.status ?? t.paymentStatus ?? '').toLowerCase()));
  const amount = (t:any) => Number(t.amount ?? t.total ?? 0);
  return <div className="space-y-4 animate-in fade-in">
    <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold text-slate-900">Liquidaciones de coaches</h2><p className="mt-1 text-sm text-slate-500">Transacciones con pago confirmado y estado de payout registrado. No se aplica un split fijo ni se declara liquidado sin evidencia.</p><div className="mt-3 text-xs text-slate-500">{paid.length} pagos confirmados · {txs.length} transacciones consultadas</div></div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      {loading ? <p className="p-5 text-sm text-slate-500">Cargando transacciones…</p> : <table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">Referencia</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Monto registrado</th><th className="px-4 py-3">Pago</th><th className="px-4 py-3">Liquidación</th></tr></thead><tbody className="divide-y divide-slate-100">{paid.map(t=><tr key={t.id}><td className="px-4 py-3 font-mono text-xs">{t.id}</td><td className="px-4 py-3">{t.createdAt?.toDate?.().toLocaleDateString('es-ES') || '—'}</td><td className="px-4 py-3 font-semibold">{amount(t).toLocaleString('es-ES',{style:'currency',currency:String(t.currency||'USD').toUpperCase()})}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Confirmado</span></td><td className="px-4 py-3">{t.payoutStatus || t.settlementStatus || 'Sin estado de payout'}</td></tr>)}{!paid.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">{txs.length===0?'No hay transacciones registradas.':'No hay pagos confirmados en la fuente consultada.'}</td></tr>}</tbody></table>}
    </div>
  </div>;
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
                    <span className="block text-[9px] text-slate-400 mt-0.5">ID: {log.ruleId ? log.ruleId.substring(0,8) + '...' : 'N/A'}</span>
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

  // No se ejecutan automatizaciones desde el cliente: falta scheduler/backend seguro.


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
              <span className={cn("px-2 py-1 rounded-lg text-[10px] font-bold uppercase", rule.active ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-400")}>
                {rule.active ? 'Configurada (sin ejecución)' : 'Pausada'}
              </span>
            </div>
            <div className="flex gap-2">
               <span className="flex-1 py-2 bg-slate-50 text-slate-400 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 cursor-not-allowed" aria-disabled="true">
                 <Zap size={12} /> Scheduler backend no disponible
               </span>
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
        {(user || 'U').substring(0, 2).toUpperCase()}
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
    const q = query(collection(db, 'promotions'));
    const unsub = onSnapshot(q, (snap) => {
      const proms = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      proms.sort((a, b) => {
         const pA = typeof a.priority === 'number' ? a.priority : 99;
         const pB = typeof b.priority === 'number' ? b.priority : 99;
         if (pA === pB) {
            const dA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dB - dA;
         }
         return pA - pB;
      });
      setPromotions(proms);
      setLoading(false);
    }, (error) => {
      setLoading(false);
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
                 <label className="block text-xs font-bold text-slate-700 mb-1">Imagen / Banner de Promoción (Beca KIRA 2026)</label>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                       <ImageUpload 
                          onUploadComplete={(url) => setImageUrl(url)}
                          currentImage={imageUrl}
                          folderPath="promotions"
                          label="Subir Imagen de Beca"
                       />
                    </div>
                    <div>
                       <input 
                          type="text" 
                          value={imageUrl} 
                          onChange={e=>setImageUrl(e.target.value)} 
                          className="w-full text-sm rounded-lg border-slate-300 px-4 py-2" 
                          placeholder="O pega una URL externa de imagen..." 
                       />
                    </div>
                 </div>
                 {imageUrl && <img src={imageUrl} alt="preview" className="mt-3 h-32 object-cover rounded-xl border border-slate-200" />}
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


function CertificateRequestsAdminView() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isSuperAdmin = user?.email === 'safeness.c.a@gmail.com';

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'certificateRequests'), snap => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
      setError('');
    }, err => {
      console.error('certificateRequests subscription failed', err);
      setError('No se pudieron cargar solicitudes. Revisa las reglas de Firestore y la colección certificateRequests.');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const decide = async (request: any, status: 'approved' | 'rejected') => {
    if (!isSuperAdmin) { setError('Solo el superadministrador puede tomar esta decisión.'); return; }
    if (status === 'approved') {
      const paid = request.paymentStatus === 'paid' || request.paid === true;
      const completed = request.courseCompleted === true || Number(request.progress) >= 100;
      if (!paid || !completed) {
        setError('No se aprueba: la solicitud no contiene evidencia de pago confirmado y curso completado. La validación autoritativa debe ejecutarse en backend.');
        return;
      }
    }
    try {
      await updateDoc(doc(db, 'certificateRequests', request.id), {
        status, reviewedBy: user?.uid, reviewedAt: new Date()
      });
      setError('');
    } catch (err) {
      console.error(err);
      setError('No se pudo actualizar la solicitud. Verifica permisos de Firestore.');
    }
  };

  const pending = requests.filter(r => !['approved','rejected','issued'].includes(String(r.status || 'pending')));
  return <div className="space-y-5">
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><FileText className="text-kirateal"/> Certificados y credenciales</h2>
      <p className="text-sm text-slate-500 mt-2">Revisión de solicitudes de alumnos. La aprobación administrativa no equivale a emitir, firmar o publicar un certificado.</p>
      <div className="flex gap-2 flex-wrap mt-4 text-xs">
        <span className="rounded-full bg-amber-50 text-amber-700 px-3 py-1">Pendientes: {pending.length}</span>
        <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1">Aprobadas: {requests.filter(r=>r.status==='approved').length}</span>
        <span className="rounded-full bg-slate-100 text-slate-600 px-3 py-1">Emitidas: {requests.filter(r=>r.status==='issued').length}</span>
        <span className="rounded-full bg-rose-50 text-rose-700 px-3 py-1">Rechazadas: {requests.filter(r=>r.status==='rejected').length}</span>
      </div>
    </section>
    {error && <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 p-3 text-sm">{error}</div>}
    {loading ? <div className="p-8 text-center text-slate-500">Cargando solicitudes reales…</div> :
      requests.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">Todavía no hay solicitudes en certificateRequests.</div> :
      <div className="space-y-3">{requests.map(req => <article key={req.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900">{req.courseTitle || req.courseName || req.title || 'Curso no identificado'}</div>
          <div className="text-sm text-slate-500 mt-1">Alumno: {req.studentName || req.userName || req.userEmail || req.userId || 'Sin identificar'}</div>
          <div className="text-xs text-slate-400 mt-1">Coach: {req.coachName || req.coachId || 'No especificado'} · Estado: {req.status || 'pending'}</div>
          <div className="text-xs text-slate-400 mt-1">ID: {req.id}</div>
        </div>
        {req.status !== 'issued' && <div className="flex gap-2">
          {req.status !== 'approved' && <button onClick={()=>decide(req,'approved')} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">Aprobar solicitud</button>}
          {req.status !== 'rejected' && <button onClick={()=>decide(req,'rejected')} className="px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold">Rechazar</button>}
        </div>}
      </article>)}</div>}
  </div>;
}

// Compatibilidad con rutas anteriores
export function AdminCoaches() { return <AdminMonitor />; }
export function AdminReviews() { return <AdminMonitor />; }
