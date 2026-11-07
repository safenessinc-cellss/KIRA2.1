import React, { useEffect, useState } from 'react';
import { addDoc, collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { LifeBuoy, Loader2, Send } from 'lucide-react';

export function CoachCloudSupport() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    const q = query(collection(db, 'supportTickets'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false); setError('');
    }, err => {
      console.error('Coach support ticket subscription failed', err);
      setLoading(false); setError('No se pudo cargar el historial. Verifica las reglas de Firestore.');
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.uid || !subject.trim() || !description.trim() || saving) return;
    setSaving(true); setError('');
    try {
      await addDoc(collection(db, 'supportTickets'), {
        userId: user.uid,
        userEmail: user.email ?? null,
        role: 'coach',
        subject: subject.trim(),
        description: description.trim(),
        status: 'open',
        priority: 'normal',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      setSubject(''); setDescription('');
    } catch (err) {
      console.error('Support ticket create failed', err);
      setError('No se pudo enviar la solicitud. El servidor o las reglas de Firestore rechazaron la operación.');
    } finally { setSaving(false); }
  };

  return <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
    <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center gap-3"><span className="rounded-xl bg-teal-50 p-3 text-teal-700"><LifeBuoy size={22}/></span><div><h1 className="text-xl font-bold text-slate-900">Soporte para coaches</h1><p className="text-sm text-slate-500">Crea solicitudes y consulta el historial de tickets de tu cuenta.</p></div></div></header>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-bold text-slate-900">Nueva solicitud</h2>
      <input required maxLength={120} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Asunto" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/30"/>
      <textarea required maxLength={5000} rows={5} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe el problema o la consulta…" className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/30"/>
      <div className="flex justify-end"><button disabled={saving || !subject.trim() || !description.trim()} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} {saving?'Enviando…':'Enviar solicitud'}</button></div>
    </form>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-4 font-bold text-slate-900">Mis solicitudes</h2>{loading ? <p className="text-sm text-slate-500">Cargando tickets…</p> : tickets.length===0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Todavía no has creado solicitudes.</p> : <div className="space-y-3">{tickets.map(ticket=><article key={ticket.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h3 className="font-semibold text-slate-800">{ticket.subject}</h3><span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{ticket.status || 'open'}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{ticket.description}</p><p className="mt-2 text-xs text-slate-400">{ticket.createdAt?.toDate?.().toLocaleString('es-ES') || 'Fecha no disponible'}</p></article>)}</div>}</section>
  </main>;
}
