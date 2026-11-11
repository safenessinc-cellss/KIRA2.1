import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { CheckCircle2, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

type Plan = { id: string; title: string; description?: string; price: number; currency: string; durationDays: number; status: 'draft' | 'published' };

export function AdminMembershipPlansView() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [durationDays, setDurationDays] = useState(365);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  useEffect(() => onSnapshot(collection(db, 'membershipPlans'), snap => {
    setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() } as Plan)).sort((a, b) => a.title.localeCompare(b.title)));
    setLoading(false);
  }, err => { console.error(err); error('No se pudieron cargar los planes.'); setLoading(false); }), [error]);

  const reset = () => { setEditing(null); setTitle(''); setDescription(''); setPrice(0); setCurrency('USD'); setDurationDays(365); setStatus('draft'); };
  const startEdit = (plan: Plan) => {
    setEditing(plan.id); setTitle(plan.title); setDescription(plan.description || '');
    setPrice(Number(plan.price)); setCurrency(plan.currency || 'USD');
    setDurationDays(Number(plan.durationDays || 365)); setStatus(plan.status || 'draft');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !title.trim() || !Number.isFinite(price) || price <= 0 || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
      error('Completa nombre, precio positivo y duración entre 1 y 3650 días.'); return;
    }
    setSaving(true);
    const data = { title: title.trim(), description: description.trim(), price, currency, durationDays, status, updatedAt: serverTimestamp(), updatedBy: user.uid };
    try {
      if (editing) await updateDoc(doc(db, 'membershipPlans', editing), data);
      else await addDoc(collection(db, 'membershipPlans'), { ...data, createdAt: serverTimestamp(), createdBy: user.uid });
      success(status === 'published' ? 'Plan guardado y publicado.' : 'Borrador de plan guardado.');
      reset();
    } catch (e) { console.error(e); error('No se pudo guardar el plan. Verifica tus permisos.'); }
    finally { setSaving(false); }
  };

  const remove = async (plan: Plan) => {
    if (!window.confirm('¿Eliminar este plan del catálogo? Las membresías ya compradas se conservarán.')) return;
    try { await deleteDoc(doc(db, 'membershipPlans', plan.id)); success('Plan eliminado del catálogo.'); }
    catch (e) { console.error(e); error('No se pudo eliminar el plan.'); }
  };

  return <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div><h2 className="text-lg font-black text-slate-900">{editing ? 'Editar plan' : 'Crear plan de membresía'}</h2><p className="mt-1 text-xs text-slate-500">Planes de pago únicos con vigencia definida. La activación ocurre únicamente tras el webhook verificado.</p></div>
      <label className="block text-xs font-bold text-slate-600">Nombre del plan<input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
      <label className="block text-xs font-bold text-slate-600">Descripción<textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-bold text-slate-600">Precio<input type="number" required min="0.01" step="0.01" value={price} onChange={e => setPrice(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
        <label className="block text-xs font-bold text-slate-600">Moneda<select value={currency} onChange={e => setCurrency(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option>USD</option><option>BRL</option><option>EUR</option></select></label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-bold text-slate-600">Vigencia (días)<input type="number" required min="1" max="3650" step="1" value={durationDays} onChange={e => setDurationDays(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
        <label className="block text-xs font-bold text-slate-600">Estado<select value={status} onChange={e => setStatus(e.target.value as 'draft' | 'published')} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="draft">Borrador</option><option value="published">Publicado</option></select></label>
      </div>
      <div className="flex gap-2"><button disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-wide text-white disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin" /> : editing ? <CheckCircle2 size={15} /> : <Plus size={15} />}{editing ? 'Guardar cambios' : 'Crear plan'}</button>{editing && <button type="button" onClick={reset} className="rounded-xl bg-slate-100 px-4 py-3 text-xs font-bold text-slate-600">Cancelar</button>}</div>
    </form>
    <section className="space-y-3">
      <div><h3 className="text-lg font-black text-slate-900">Planes configurados</h3><p className="text-xs text-slate-500">Solo los planes publicados aparecen en el panel de coach.</p></div>
      {loading ? <div className="p-8 text-center text-sm text-slate-500">Cargando planes…</div> : plans.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Todavía no hay planes. Crea uno para habilitar la compra de membresías.</div> : plans.map(plan => <article key={plan.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-slate-900">{plan.title}</h4><span className={plan.status === 'published' ? 'rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700' : 'rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600'}>{plan.status === 'published' ? 'Publicado' : 'Borrador'}</span></div><p className="mt-1 text-xs text-slate-500">{plan.description || 'Sin descripción'} · {plan.durationDays} días</p><p className="mt-2 text-sm font-black text-slate-800">{Number(plan.price).toFixed(2)} {plan.currency}</p></div><div className="flex gap-2"><button onClick={() => startEdit(plan)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><Pencil size={13}/>Editar</button><button onClick={() => remove(plan)} className="flex items-center gap-1 rounded-lg border border-rose-100 px-3 py-2 text-xs font-bold text-rose-600"><Trash2 size={13}/>Eliminar</button></div></article>)}
    </section>
  </div>;
}
