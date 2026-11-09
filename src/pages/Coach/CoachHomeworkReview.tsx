import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { auth } from '@/src/firebase';
import { useAuth } from '@/src/hooks/useAuth';
import { useToast } from '@/src/hooks/useToast';
import { AlertCircle, CheckCircle2, Clock3, ExternalLink, FileText, Loader2, MessageSquareText, RefreshCw, Sparkles } from 'lucide-react';

type ReviewStatus = 'pending' | 'approved' | 'needs_correction';
interface HomeworkSubmission {
  id: string;
  studentId: string;
  studentName?: string;
  courseTitle?: string;
  assignmentTitle?: string;
  assignmentDescription?: string;
  submissionText?: string;
  submissionUrl?: string;
  attachments?: Array<{ name?: string; url: string }>;
  status: ReviewStatus | string;
  submittedAt?: any;
  score?: number;
  feedback?: string;
  energyPointsAwarded?: number;
}

function displayDate(value: any): string {
  const date = value?.toDate ? value.toDate() : value?.seconds ? new Date(value.seconds * 1000) : new Date(value || '');
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

export function CoachHomeworkReview() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<HomeworkSubmission[]>([]);
  const [selected, setSelected] = useState<HomeworkSubmission | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'needs_correction' | 'all'>('pending');
  const [score, setScore] = useState(80);
  const [feedback, setFeedback] = useState('');
  const [energyPoints, setEnergyPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) { setLoading(false); return; }
    setLoading(true);
    setLoadError('');
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/coach/homework', { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las entregas.');
      const next = Array.isArray(payload.items) ? payload.items as HomeworkSubmission[] : [];
      setItems(next);
      setSelected(current => current ? next.find(item => item.id === current.id) || null : null);
    } catch (err: any) {
      setLoadError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user?.uid) void load(); }, [user?.uid, load]);

  const counts = useMemo(() => ({
    pending: items.filter(item => item.status === 'pending').length,
    approved: items.filter(item => item.status === 'approved').length,
    needs_correction: items.filter(item => item.status === 'needs_correction').length
  }), [items]);

  const filtered = useMemo(() => items.filter(item => filter === 'all' || item.status === filter), [items, filter]);

  const choose = (item: HomeworkSubmission) => {
    setSelected(item);
    setScore(Number.isFinite(item.score) ? Number(item.score) : 80);
    setFeedback(item.feedback || '');
    setEnergyPoints(0);
  };

  const saveReview = async (status: 'approved' | 'needs_correction') => {
    if (!selected || !feedback.trim()) {
      toastError('Escribe una retroalimentación antes de guardar.');
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) { toastError('Tu sesión expiró. Vuelve a iniciar sesión.'); return; }
    setSaving(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/coach/homework/${encodeURIComponent(selected.id)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, score, feedback: feedback.trim(), energyPoints: status === 'approved' ? energyPoints : 0 })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo guardar la revisión.');
      success(status === 'approved'
        ? (payload.pointsAwarded ? `Tarea aprobada. ${payload.pointsAwarded} puntos de energía otorgados.` : 'Tarea aprobada y notificación enviada.')
        : 'Se solicitó una corrección y se notificó al alumno.');
      await load();
      setSelected(null);
    } catch (err: any) {
      toastError(err.message || 'No se pudo guardar la revisión.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-teal-700">Espacio de trabajo · Coach</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Revisión de tareas</h1>
          <p className="mt-1 text-sm text-slate-500">Evalúa entregas reales, comparte feedback y reconoce el progreso.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Actualizar
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { id: 'pending', label: 'Pendientes', value: counts.pending },
          { id: 'approved', label: 'Aprobadas', value: counts.approved },
          { id: 'needs_correction', label: 'Requieren corrección', value: counts.needs_correction },
          { id: 'all', label: 'Total', value: items.length }
        ].map(card => (
          <button key={card.id} onClick={() => setFilter(card.id as typeof filter)} className={`rounded-2xl border p-4 text-left transition ${filter === card.id ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <span className="block text-xs font-semibold text-slate-500">{card.label}</span>
            <span className="mt-1 block text-2xl font-black text-slate-900">{card.value}</span>
          </button>
        ))}
      </div>

      {loadError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle size={18}/>{loadError}</div>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-teal-700" size={32}/></div> : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <FileText className="mx-auto text-slate-300" size={42}/>
          <h2 className="mt-3 font-bold text-slate-800">Todavía no hay entregas</h2>
          <p className="mt-1 text-sm text-slate-500">Las tareas enviadas por tus alumnos aparecerán aquí. No se insertan datos de demostración.</p>
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-2">
            {filtered.map(item => (
              <button key={item.id} onClick={() => choose(item)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === item.id ? 'border-teal-600 bg-teal-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{item.assignmentTitle || 'Actividad'}</p>
                    <p className="mt-1 truncate text-xs text-slate-600">{item.studentName || 'Alumno'}</p>
                    <p className="mt-1 truncate text-xs text-slate-400">{item.courseTitle || 'Curso'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${item.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : item.status === 'needs_correction' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                    {item.status === 'approved' ? 'Aprobada' : item.status === 'needs_correction' ? 'Corregir' : 'Pendiente'}
                  </span>
                </div>
                <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-400"><Clock3 size={12}/>{displayDate(item.submittedAt)}</p>
              </button>
            ))}
            {filtered.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No hay entregas en este estado.</p>}
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {selected ? (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">{selected.courseTitle || 'Curso'}</p>
                  <h2 className="mt-1 text-xl font-black text-slate-900">{selected.assignmentTitle || 'Actividad'}</h2>
                  <p className="mt-1 text-sm text-slate-500">Entrega de {selected.studentName || 'Alumno'} · {displayDate(selected.submittedAt)}</p>
                </div>
                {selected.assignmentDescription && <div className="rounded-xl bg-slate-50 p-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Consigna</p><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.assignmentDescription}</p></div>}
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Respuesta del alumno</p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.submissionText || 'No se adjuntó texto.'}</p>
                  {selected.submissionUrl && <a href={selected.submissionUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:underline"><ExternalLink size={15}/>Abrir archivo adjunto</a>}
                  {selected.attachments?.map((file, index) => <a key={index} href={file.url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 text-sm font-semibold text-teal-700 hover:underline"><FileText size={15}/>{file.name || 'Archivo adjunto'}<ExternalLink size={13}/></a>)}
                </div>
                <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Calificación: {score}/100</label>
                    <input type="range" min="0" max="100" value={score} onChange={event => setScore(Number(event.target.value))} className="w-full accent-teal-700"/>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Retroalimentación</label>
                    <textarea value={feedback} onChange={event => setFeedback(event.target.value)} rows={5} maxLength={5000} placeholder="Describe los logros, oportunidades de mejora y próximos pasos..." className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"/>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Puntos de energía al aprobar</label>
                    <input type="number" min="0" max="100" value={energyPoints} onChange={event => setEnergyPoints(Math.max(0, Math.min(100, Number(event.target.value) || 0)))} className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"/>
                    <p className="mt-1 text-xs text-slate-400">Se otorgan una sola vez y solo al aprobar. Límite: 100 puntos.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button onClick={() => void saveReview('needs_correction')} disabled={saving || !feedback.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                      {saving ? <Loader2 className="animate-spin" size={16}/> : <MessageSquareText size={16}/>} Requiere corrección
                    </button>
                    <button onClick={() => void saveReview('approved')} disabled={saving || !feedback.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50">
                      {saving ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} Aprobar entrega
                    </button>
                  </div>
                </div>
              </div>
            ) : <div className="flex min-h-72 flex-col items-center justify-center text-center text-slate-400"><Sparkles size={34}/><p className="mt-3 text-sm font-semibold">Selecciona una entrega para revisarla</p></div>}
          </div>
        </div>
      )}
    </section>
  );
}
