import React, { useCallback, useEffect, useState } from 'react';
import { auth } from '../../firebase';
import { Activity, AlertCircle, BadgeCheck, BookOpen, CalendarClock, CircleDollarSign, Funnel, FileBadge, Loader2, Plus, RefreshCw, Users } from 'lucide-react';

type DashboardData = {
  sales?: { grossByCurrency: Record<string, number>; netByCurrency: Record<string, number> };
  enrollments?: { newCount: number };
  leads?: { byStage: Record<string, number>; total: number };
  conversion?: { rate: number; converted: number; qualified: number };
  topCourses?: Array<{ courseId: string; title: string; revenueByCurrency: Record<string, number> }>;
  overdueInvoices?: number;
  students?: { active: number; atRisk: number | null };
  certificates?: { issued: number };
  generatedAt: string;
  source: string;
};

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('La sesión expiró. Vuelve a iniciar sesión.');
  const response = await fetch(path, {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'No se pudo completar la operación.');
  return payload as T;
}

const number = (value: number) => new Intl.NumberFormat('es-ES').format(value || 0);
const money = (values: Record<string, number>) => {
  const entries = Object.entries(values || {});
  if (!entries.length) return '—';
  return entries.map(([currency, amount]) => new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount / 100)).join(' · ');
};

export function BackofficeDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const result = await api<DashboardData>('/api/admin/dashboard?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to));
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el dashboard.');
    } finally {
      setBusy(false);
    }
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);

  const cards = [
    { show: !!data?.sales, title: 'Ventas del período', value: data?.sales ? money(data.sales.grossByCurrency) : '—', detail: 'Ingresos brutos confirmados', icon: CircleDollarSign },
    { show: !!data?.enrollments, title: 'Matrículas nuevas', value: number(data?.enrollments?.newCount || 0), detail: 'Creadas en el período', icon: BookOpen },
    { show: !!data?.leads, title: 'Leads captados', value: number(data?.leads?.total || 0), detail: 'Leads registrados', icon: Funnel },
    { show: !!data?.conversion, title: 'Conversión lead → matrícula', value: (data?.conversion?.rate || 0).toFixed(1) + '%', detail: number(data?.conversion?.converted || 0) + ' convertidos', icon: Activity },
    { show: data?.overdueInvoices !== undefined, title: 'Cuotas vencidas', value: number(data?.overdueInvoices || 0), detail: 'Facturas vencidas o abiertas fuera de fecha', icon: AlertCircle },
    { show: !!data?.students, title: 'Alumnos activos', value: number(data?.students?.active || 0), detail: data?.students?.atRisk === null ? 'Asistencia pendiente' : number(data?.students?.atRisk || 0) + ' en riesgo', icon: Users },
    { show: !!data?.certificates, title: 'Certificados emitidos', value: number(data?.certificates?.issued || 0), detail: 'Emitidos en el período', icon: FileBadge },
    { show: data?.topCourses !== undefined, title: 'Cursos con ventas', value: number(data?.topCourses?.length || 0), detail: 'Top 5 por ingresos', icon: BadgeCheck }
  ];

  return <section className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-teal-700">KIRA · Backoffice</p><h2 className="mt-1 text-xl font-black text-slate-900">Visión general de ventas y matrículas</h2><p className="mt-1 text-sm text-slate-500">Indicadores obtenidos del backend y de registros persistidos.</p></div>
      <button onClick={() => void load()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"><RefreshCw size={16} className={busy ? 'animate-spin' : ''}/> Actualizar</button>
    </header>
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <label className="text-xs font-semibold text-slate-600">Desde<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"/></label>
      <label className="text-xs font-semibold text-slate-600">Hasta<input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"/></label>
      <button onClick={() => void load()} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white">Aplicar período</button>
      {data && <span className="text-xs text-slate-400">Actualizado: {new Date(data.generatedAt).toLocaleString()}</span>}
    </div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {busy && !data ? <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-slate-500"><Loader2 className="mr-2 animate-spin"/> Cargando indicadores…</div> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.filter(card => card.show).map(card => <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{card.title}</span><span className="rounded-xl bg-teal-50 p-2 text-teal-700"><card.icon size={18}/></span></div><p className="mt-4 text-2xl font-black tracking-tight text-slate-900">{card.value}</p><p className="mt-1 text-xs text-slate-500">{card.detail}</p></article>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {data?.leads && <article className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-900">Leads por etapa</h3><div className="mt-4 space-y-3">{Object.entries(data.leads.byStage || {}).map(([stage, count]) => <div key={stage}><div className="mb-1 flex justify-between text-xs"><span className="capitalize text-slate-600">{stage}</span><b>{number(count)}</b></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: Math.min(100, (count / Math.max(1, data?.leads.total || 1)) * 100) + '%' }}/></div></div>)}</div></article>}
        {data?.topCourses !== undefined && <article className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-900">Top 5 cursos por ingresos</h3>{!data.topCourses.length ? <p className="mt-4 text-sm text-slate-500">Todavía no hay ventas de cursos en el período.</p> : <div className="mt-3 divide-y divide-slate-100">{data.topCourses.map(course => <div key={course.courseId} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0 truncate text-sm font-semibold text-slate-700">{course.title}</span><b className="shrink-0 text-sm text-slate-900">{money(course.revenueByCurrency)}</b></div>)}</div>}</article>}
      </div>
      <p className="text-[11px] text-slate-400">Fuente: {data?.source || 'backend Firestore'}. Los ingresos netos solo se mostrarán cuando exista conciliación de reembolsos; no se estiman a partir de ventas brutas.</p>
    </>}
  </section>;
}

type Lead = { id: string; fullName: string; email?: string; phone?: string; source: string; stage: string; courseInterest?: string; assignedTo?: string; score?: number; consentGdpr: boolean; createdAt?: string };
type LeadView = 'leads' | 'interactions' | 'converted';
type InteractionRecord = { id: string; leadId: string; leadName: string; channel: string; outcome: string; notes: string; nextActionAt?: string | null; createdAt: string };

export function BackofficeCRM({ view = 'leads' }: { view?: LeadView }) {
  const [items, setItems] = useState<Lead[]>([]);
  const [interactions, setInteractions] = useState<InteractionRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [stage, setStage] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [leadForm, setLeadForm] = useState({ fullName: '', email: '', phone: '', source: 'manual', campaign: '', courseInterest: '', assignedTo: '', consentGdpr: false });
  const [interaction, setInteraction] = useState({ channel: 'whatsapp', outcome: 'interested', notes: '', nextActionAt: '' });
  const [studentUid, setStudentUid] = useState('');

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      if (view === 'interactions') {
        const result = await api<{ items: InteractionRecord[] }>('/api/admin/crm/interactions');
        setInteractions(result.items || []);
      } else {
        const query = new URLSearchParams();
        if (stage) query.set('stage', stage);
        const result = await api<{ items: Lead[] }>('/api/admin/crm/leads?' + query.toString());
        setItems(result.items || []);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar los leads.'); }
    finally { setBusy(false); }
  }, [stage, view]);

  useEffect(() => { void load(); }, [load]);

  const createLead = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    try {
      await api('/api/admin/crm/leads', 'POST', leadForm);
      setLeadForm({ fullName: '', email: '', phone: '', source: 'manual', campaign: '', courseInterest: '', assignedTo: '', consentGdpr: false });
      setMessage('Lead guardado en KIRA.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo crear el lead.'); }
  };

  const addInteraction = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selected) return;
    try {
      await api('/api/admin/crm/leads/' + encodeURIComponent(selected.id) + '/interactions', 'POST', interaction);
      setMessage('Intento de contacto registrado y auditado.'); setInteraction({ channel: 'whatsapp', outcome: 'interested', notes: '', nextActionAt: '' });
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo registrar el contacto.'); }
  };

  const convert = async () => {
    if (!selected || !studentUid.trim()) return;
    try {
      await api('/api/admin/crm/leads/' + encodeURIComponent(selected.id) + '/convert-to-enrollment', 'POST', { studentUid: studentUid.trim(), courseId: selected.courseInterest });
      setMessage('Matrícula creada y lead convertido.'); setStudentUid(''); setSelected(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo convertir el lead.'); }
  };

  const visible = items.filter(item => view === 'converted' ? item.stage === 'enrolled' : view === 'interactions' ? true : item.stage !== 'enrolled');
  const title = view === 'converted' ? 'Inscripciones confirmadas' : view === 'interactions' ? 'Intentos de contacto' : 'Leads captados';

  return <section className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-teal-700">Embudo de ventas · CRM</p><h2 className="mt-1 text-xl font-black text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">Los datos personales se entregan mediante API autenticada; no se leen directamente desde Firestore.</p></div><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold"><RefreshCw size={15}/> Actualizar</button></header>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
    {view === 'leads' && <form onSubmit={createLead} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-4">
      <input required maxLength={180} placeholder="Nombre completo" value={leadForm.fullName} onChange={e => setLeadForm({ ...leadForm, fullName: e.target.value })} className="rounded-lg border p-2 text-sm"/>
      <input type="email" maxLength={180} placeholder="Email" value={leadForm.email} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} className="rounded-lg border p-2 text-sm"/>
      <input maxLength={40} placeholder="Teléfono" value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} className="rounded-lg border p-2 text-sm"/>
      <select value={leadForm.source} onChange={e => setLeadForm({ ...leadForm, source: e.target.value })} className="rounded-lg border p-2 text-sm"><option value="manual">Manual</option><option value="landing">Landing</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="referido">Referido</option></select>
      <input maxLength={120} placeholder="Campaña" value={leadForm.campaign} onChange={e => setLeadForm({ ...leadForm, campaign: e.target.value })} className="rounded-lg border p-2 text-sm"/>
      <input placeholder="ID del curso de interés" value={leadForm.courseInterest} onChange={e => setLeadForm({ ...leadForm, courseInterest: e.target.value })} className="rounded-lg border p-2 text-sm"/>
      <input placeholder="UID del responsable (opcional)" value={leadForm.assignedTo} onChange={e => setLeadForm({ ...leadForm, assignedTo: e.target.value })} className="rounded-lg border p-2 text-sm"/>
      <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={leadForm.consentGdpr} onChange={e => setLeadForm({ ...leadForm, consentGdpr: e.target.checked })}/> Consentimiento de contacto / LGPD</label>
      <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white md:col-span-4"><Plus size={15}/> Crear lead</button>
    </form>}
    {view !== 'interactions' && <div className="flex flex-wrap items-center gap-3"><select value={stage} onChange={e => setStage(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Todas las etapas</option>{['new','contacted','qualified','enrolled','lost'].map(s => <option key={s} value={s}>{s}</option>)}</select><span className="text-xs text-slate-500">{number(visible.length)} registros</span></div>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {busy ? <div className="p-8 text-center text-sm text-slate-500"><Loader2 className="mr-2 inline animate-spin"/> Cargando…</div> : view === 'interactions' ? (!interactions.length ? <div className="p-10 text-center"><CalendarClock className="mx-auto mb-3 text-slate-300" size={28}/><p className="font-semibold text-slate-700">Todavía no hay intentos de contacto.</p><p className="mt-1 text-xs text-slate-500">Abre un lead en Leads Captados para registrar llamada, WhatsApp, email o reunión.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Prospecto</th><th className="p-3">Canal</th><th className="p-3">Resultado</th><th className="p-3">Notas</th><th className="p-3">Próxima acción</th><th className="p-3">Fecha</th></tr></thead><tbody className="divide-y divide-slate-100">{interactions.map(item => <tr key={item.id}><td className="p-3 font-semibold">{item.leadName || item.leadId}</td><td className="p-3 capitalize">{item.channel}</td><td className="p-3">{item.outcome}</td><td className="max-w-64 truncate p-3 text-xs text-slate-500">{item.notes || '—'}</td><td className="p-3 text-xs">{item.nextActionAt ? new Date(item.nextActionAt).toLocaleString() : '—'}</td><td className="p-3 text-xs text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td></tr>)}</tbody></table></div>) : !visible.length ? <div className="p-10 text-center"><Users className="mx-auto mb-3 text-slate-300" size={28}/><p className="font-semibold text-slate-700">Todavía no hay registros en esta vista.</p><p className="mt-1 text-xs text-slate-500">Crea un lead o conecta una landing después de habilitar la integración verificada.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Prospecto</th><th className="p-3">Origen</th><th className="p-3">Etapa</th><th className="p-3">Consentimiento</th><th className="p-3">Creado</th><th className="p-3">Acción</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map(item => <tr key={item.id}><td className="p-3"><b>{item.fullName}</b><div className="text-xs text-slate-500">{item.email || item.phone || 'Sin contacto'}</div></td><td className="p-3 capitalize">{item.source}</td><td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{item.stage}</span></td><td className="p-3">{item.consentGdpr ? 'Sí' : 'No'}</td><td className="p-3 text-xs text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td><td className="p-3"><button onClick={() => setSelected(item)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Abrir</button></td></tr>)}</tbody></table></div>}
    </div>
    {selected && <div className="grid gap-4 rounded-2xl border border-teal-200 bg-white p-4 xl:grid-cols-2"><div><div className="flex items-center justify-between"><h3 className="font-bold">{selected.fullName}</h3><button onClick={() => setSelected(null)} className="text-xs text-slate-500">Cerrar</button></div><p className="mt-1 text-xs text-slate-500">{selected.email || selected.phone || 'Sin contacto'} · {selected.stage}</p><form onSubmit={addInteraction} className="mt-4 space-y-2"><h4 className="text-sm font-bold">Registrar intento de contacto</h4><div className="grid grid-cols-2 gap-2"><select value={interaction.channel} onChange={e => setInteraction({ ...interaction, channel: e.target.value })} className="rounded-lg border p-2 text-sm">{['call','whatsapp','email','meeting','sms'].map(x => <option key={x}>{x}</option>)}</select><select value={interaction.outcome} onChange={e => setInteraction({ ...interaction, outcome: e.target.value })} className="rounded-lg border p-2 text-sm">{['no_answer','left_message','interested','not_interested','scheduled'].map(x => <option key={x}>{x}</option>)}</select></div><textarea maxLength={2000} placeholder="Notas del contacto" value={interaction.notes} onChange={e => setInteraction({ ...interaction, notes: e.target.value })} className="min-h-20 w-full rounded-lg border p-2 text-sm"/><label className="block text-xs text-slate-500">Próxima acción<input type="datetime-local" value={interaction.nextActionAt} onChange={e => setInteraction({ ...interaction, nextActionAt: e.target.value })} className="mt-1 block rounded-lg border p-2 text-sm"/></label><button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Guardar interacción</button></form></div><div><h4 className="font-bold">Convertir a matrícula</h4><p className="mt-1 text-xs text-slate-500">Solo se permite con consentimiento y etapa contactado/calificado. Debe existir una cuenta de alumno.</p><input value={studentUid} onChange={e => setStudentUid(e.target.value)} placeholder="UID Firebase del alumno" className="mt-3 w-full rounded-lg border p-2 text-sm"/><button onClick={() => void convert()} disabled={!studentUid.trim() || !selected.courseInterest} className="mt-2 rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Convertir y crear matrícula</button></div></div>}
  </section>;
}
