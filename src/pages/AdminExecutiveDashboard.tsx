import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Activity, AlertCircle, ArrowUpRight, BookOpen, Building2, CheckCircle2, Clock3, CreditCard, RefreshCw, ShieldCheck, Users, UserCheck, FileBadge, Wallet } from 'lucide-react';

type Row = { id: string; [key: string]: any };
type SourceState = { rows: Row[]; loading: boolean; error: string };
const sources = ['users', 'transactions', 'courses', 'enrollments', 'certificateRequests', 'certificates', 'organizations', 'subscriptions'] as const;
type Source = typeof sources[number];
const emptySource = (): SourceState => ({ rows: [], loading: true, error: '' });
const dateOf = (value: any): Date | null => {
  if (!value) return null;
  try { const date = value?.toDate ? value.toDate() : new Date(value); return Number.isNaN(date.getTime()) ? null : date; } catch { return null; }
};
const statusOf = (row: Row) => String(row.status ?? row.paymentStatus ?? row.state ?? '').toLowerCase();
const isPaid = (row: Row) => ['paid', 'succeeded', 'successful', 'confirmed', 'complete', 'completed'].includes(statusOf(row));
const amountOf = (row: Row) => { const value = Number(row.amount ?? row.total ?? row.amountTotal ?? row.price ?? 0); return Number.isFinite(value) && value > 0 ? value : 0; };
const money = (amount: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount);

function Metric({ label, value, note, icon, tint, onClick }: { label: string; value: string | number; note: string; icon: React.ReactNode; tint: string; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className="group min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500/30">
    <div className="flex items-start justify-between gap-3"><span className="text-xs sm:text-sm font-semibold text-slate-500">{label}</span><span className={`rounded-xl p-2 ${tint}`}>{icon}</span></div>
    <div className="mt-3 flex items-end justify-between gap-2"><span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</span><ArrowUpRight size={15} className="mb-1 text-slate-300 transition group-hover:text-teal-600"/></div>
    <p className="mt-1 text-xs text-slate-500">{note}</p>
  </button>;
}
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm min-w-0"><div className="mb-4"><h2 className="font-bold text-slate-900">{title}</h2>{description && <p className="mt-1 text-xs text-slate-500">{description}</p>}</div>{children}</section>;
}

export function AdminExecutiveDashboard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [data, setData] = useState<Record<Source, SourceState>>(() => Object.fromEntries(sources.map(key => [key, emptySource()])) as Record<Source, SourceState>);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const unsubscribers = sources.map(source => onSnapshot(collection(db, source), snapshot => {
      setData(prev => ({ ...prev, [source]: { rows: snapshot.docs.map(d => ({ id: d.id, ...d.data() })), loading: false, error: '' } }));
    }, error => {
      console.error(`Admin dashboard source failed: ${source}`, error);
      setData(prev => ({ ...prev, [source]: { ...prev[source], loading: false, error: 'Fuente no disponible o permiso insuficiente' } }));
    }));
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [refreshKey]);

  const rows = (key: Source) => data[key].rows;
  const errors = sources.filter(key => data[key].error);
  const users = rows('users');
  const coachProfiles = users.filter(row => String(row.role ?? row.type ?? '').toLowerCase().includes('coach'));
  const approvedCoaches = coachProfiles.filter(row => row.approved === true || ['approved', 'active'].includes(statusOf(row)));
  const pendingCoaches = coachProfiles.filter(row => row.approved !== true && !['approved', 'active', 'rejected', 'suspended'].includes(statusOf(row)));
  const activeStudents = users.filter(row => ['student', 'learner', 'alumno'].includes(String(row.role ?? row.type ?? '').toLowerCase()) && row.disabled !== true);
  const publishedCourses = rows('courses').filter(row => ['published', 'active', 'live'].includes(String(row.status ?? '').toLowerCase()) || row.published === true);
  const organizations = rows('organizations').filter(row => !['archived', 'deleted', 'inactive'].includes(statusOf(row)));
  const enrollments = rows('enrollments').filter(row => !['cancelled', 'canceled', 'refunded'].includes(statusOf(row)));
  const paid = rows('transactions').filter(isPaid);
  const paidInPeriod = paid.filter(row => { const date = dateOf(row.paidAt ?? row.createdAt ?? row.updatedAt); return date ? Date.now() - date.getTime() <= period * 86400000 : false; });
  const revenue = paidInPeriod.reduce((sum, row) => sum + amountOf(row), 0);
  const certPending = rows('certificateRequests').filter(row => !row.issuedAt && !['approved', 'rejected', 'issued', 'revoked'].includes(statusOf(row)));
  const certIssued = rows('certificates').filter(row => ['issued', 'active', 'valid'].includes(statusOf(row)) || Boolean(row.issuedAt || row.certificateId));
  const activeSubscriptions = rows('subscriptions').filter(row => ['active', 'trialing'].includes(statusOf(row)));
  const pendingPayments = rows('transactions').filter(row => ['pending', 'processing', 'requires_action'].includes(statusOf(row)));
  const pendingPayouts = rows('transactions').filter(row => isPaid(row) && ['pending', 'unpaid', 'queued'].includes(String(row.payoutStatus ?? row.settlementStatus ?? '').toLowerCase()));
  const loading = sources.some(key => data[key].loading);
  const metric = (source: Source, value: number) => data[source].error ? '—' : value.toLocaleString('es-ES');
  const attention = [
    { title: 'Coaches por aprobar', count: pendingCoaches.length, tab: 'approvals', icon: <UserCheck size={16}/>, detail: 'Revisar perfil y documentación' },
    { title: 'Certificados pendientes', count: certPending.length, tab: 'certificates', icon: <FileBadge size={16}/>, detail: 'Validar inscripción, pago y progreso' },
    { title: 'Pagos pendientes', count: pendingPayments.length, tab: 'transactions', icon: <CreditCard size={16}/>, detail: 'No confirmar pagos desde el navegador' },
    { title: 'Liquidaciones pendientes', count: pendingPayouts.length, tab: 'settlement', icon: <Wallet size={16}/>, detail: 'Revisar payout status y transacciones' },
  ];
  const recent = [...rows('transactions')].sort((a,b) => (dateOf(b.paidAt ?? b.createdAt)?.getTime() ?? 0) - (dateOf(a.paidAt ?? a.createdAt)?.getTime() ?? 0)).slice(0,5);

  return <div className="min-w-0 space-y-5 sm:space-y-6">
    <header className="flex flex-col gap-4 rounded-2xl border border-teal-100 bg-gradient-to-r from-white via-teal-50/60 to-indigo-50/50 p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700"><Activity size={14}/> Administración · Resumen ejecutivo</div><h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Dashboard KIRA</h1><p className="mt-1 text-sm text-slate-600">Resumen operativo de registros reales. Selecciona una métrica para abrir el módulo.</p><p className="mt-2 text-xs text-slate-500">Actualizado {new Date().toLocaleString('es-ES')} · {loading ? 'Sincronizando fuentes…' : 'Suscripciones Firestore activas'}</p></div>
      <div className="flex flex-wrap items-center gap-2"><div className="flex rounded-xl border border-slate-200 bg-white p-1">{([7,30,90] as const).map(days=><button key={days} onClick={()=>setPeriod(days)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${period===days?'bg-teal-600 text-white':'text-slate-600 hover:bg-slate-50'}`}>{days} días</button>)}</div><button onClick={()=>setRefreshKey(x=>x+1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={14}/> Actualizar</button></div>
    </header>
    {errors.length > 0 && <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertCircle size={18} className="mt-0.5 shrink-0"/><div><strong>Algunas fuentes no están disponibles.</strong><p className="mt-1 text-xs">Los indicadores afectados muestran “—” en lugar de cero. Fuentes: {errors.join(', ')}. Revisa las reglas y la disponibilidad de Firestore.</p></div></div>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Usuarios registrados" value={metric('users',users.length)} note="Perfiles registrados" icon={<Users size={18}/>} tint="bg-blue-50 text-blue-600" onClick={()=>onNavigate?.('students')}/>
      <Metric label="Alumnos activos" value={metric('users',activeStudents.length)} note="Perfiles habilitados" icon={<Activity size={18}/>} tint="bg-emerald-50 text-emerald-600" onClick={()=>onNavigate?.('students')}/>
      <Metric label="Coaches aprobados" value={metric('users',approvedCoaches.length)} note="Aprobación registrada" icon={<ShieldCheck size={18}/>} tint="bg-violet-50 text-violet-600" onClick={()=>onNavigate?.('coaches')}/>
      <Metric label="Coaches pendientes" value={metric('users',pendingCoaches.length)} note="Requieren revisión" icon={<Clock3 size={18}/>} tint="bg-amber-50 text-amber-600" onClick={()=>onNavigate?.('approvals')}/>
      <Metric label="Organizaciones activas" value={metric('organizations',organizations.length)} note="Empresas registradas" icon={<Building2 size={18}/>} tint="bg-cyan-50 text-cyan-700" onClick={()=>onNavigate?.('organizations')}/>
      <Metric label="Cursos publicados" value={metric('courses',publishedCourses.length)} note="Disponibles en academia" icon={<BookOpen size={18}/>} tint="bg-indigo-50 text-indigo-600" onClick={()=>onNavigate?.('content')}/>
      <Metric label="Inscripciones" value={metric('enrollments',enrollments.length)} note="No canceladas/refundadas" icon={<Users size={18}/>} tint="bg-teal-50 text-teal-700" onClick={()=>onNavigate?.('enrollments')}/>
      <Metric label="Certificados emitidos" value={metric('certificates',certIssued.length)} note="Registros de emisión" icon={<CheckCircle2 size={18}/>} tint="bg-green-50 text-green-700" onClick={()=>onNavigate?.('certificates')}/>
      <Metric label="Ventas confirmadas" value={metric('transactions',paidInPeriod.length)} note={`Pagos confirmados · ${period} días`} icon={<CreditCard size={18}/>} tint="bg-sky-50 text-sky-700" onClick={()=>onNavigate?.('transactions')}/>
      <Metric label="Ingresos confirmados" value={data.transactions.error?'—':money(revenue)} note={`Monto registrado en USD · ${period} días`} icon={<Wallet size={18}/>} tint="bg-emerald-50 text-emerald-700" onClick={()=>onNavigate?.('transactions')}/>
      <Metric label="Certificados pendientes" value={metric('certificateRequests',certPending.length)} note="Solicitudes sin emisión" icon={<FileBadge size={18}/>} tint="bg-orange-50 text-orange-700" onClick={()=>onNavigate?.('certificates')}/>
      <Metric label="Suscripciones activas" value={metric('subscriptions',activeSubscriptions.length)} note="Estado active/trialing" icon={<CheckCircle2 size={18}/>} tint="bg-purple-50 text-purple-700" onClick={()=>onNavigate?.('subscriptions')}/>
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Section title="Pendientes de atención" description="Cola operativa; acciones enlazadas a módulos existentes."><div className="divide-y divide-slate-100">{attention.map(item=><button key={item.title} onClick={()=>onNavigate?.(item.tab)} className="flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0 hover:bg-slate-50/70"><span className="rounded-lg bg-slate-100 p-2 text-slate-600">{item.icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{item.title}</span><span className="block text-xs text-slate-500">{item.detail}</span></span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.count?'bg-amber-100 text-amber-800':'bg-slate-100 text-slate-600'}`}>{item.count}</span><ArrowUpRight size={14} className="text-slate-400"/></button>)}</div></Section>
      <Section title="Actividad financiera reciente" description="Transacciones recientes; registro no equivale a pago confirmado.">{data.transactions.loading ? <p className="text-sm text-slate-500">Cargando…</p> : data.transactions.error ? <p className="text-sm text-rose-600">No se pudo consultar la fuente financiera.</p> : recent.length===0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Todavía no hay transacciones registradas.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="pb-2 font-semibold">Fecha</th><th className="pb-2 font-semibold">Estado</th><th className="pb-2 text-right font-semibold">Monto</th></tr></thead><tbody className="divide-y divide-slate-100">{recent.map(row=><tr key={row.id}><td className="py-2.5 text-slate-600">{dateOf(row.paidAt ?? row.createdAt)?.toLocaleDateString('es-ES') ?? '—'}</td><td className="py-2.5"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${isPaid(row)?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-600'}`}>{statusOf(row)||'Sin estado'}</span></td><td className="py-2.5 text-right font-semibold tabular-nums text-slate-800">{money(amountOf(row))}</td></tr>)}</tbody></table></div>}</Section>
    </div>
    <p className="text-[11px] leading-relaxed text-slate-400">Integridad y privacidad: este panel no analiza diarios personales, conversaciones privadas ni transcripciones. Los datos dependen de las colecciones y reglas de Firestore. Los ingresos se filtran por estado confirmado; antes de conciliación contable, cotejar moneda y unidad del monto con Stripe.</p>
  </div>;
}
