import React, { useCallback, useEffect, useState } from "react";
import { auth } from "@/src/firebase";
import { useAuth } from "@/src/hooks/useAuth";
import { useToast } from "@/src/hooks/useToast";
import { AlertCircle, CheckCircle2, Clock3, ExternalLink, FileText, Loader2, RefreshCw, Send } from "lucide-react";

type Submission = {
  id: string;
  status: "pending" | "approved" | "needs_correction" | string;
  submittedAt?: string;
  score?: number;
  feedback?: string;
  submissionText?: string;
  submissionUrl?: string;
};
type HomeworkItem = {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  courseTitle?: string;
  dueAt?: string | null;
  submission?: Submission | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha límite";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : date.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

export function StudentHomework() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [selected, setSelected] = useState<HomeworkItem | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) { setLoading(false); return; }
    setLoading(true);
    setLoadError("");
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/student/homework", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudieron cargar las actividades.");
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setSelected(current => current ? (payload.items || []).find((item: HomeworkItem) => item.id === current.id) || null : null);
    } catch (error: any) {
      setLoadError(error.message || "No fue posible conectar con KIRA.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user?.uid) void load(); }, [user?.uid, load]);

  const openSubmission = (item: HomeworkItem) => {
    setSelected(item);
    setSubmissionText(item.submission?.status === "needs_correction" ? item.submission.submissionText || "" : "");
    setSubmissionUrl(item.submission?.status === "needs_correction" ? item.submission.submissionUrl || "" : "");
  };

  const submit = async () => {
    if (!selected) return;
    if (!submissionText.trim() && !submissionUrl.trim()) { toastError("Escribe tu respuesta o agrega un enlace HTTPS."); return; }
    if (submissionUrl.trim() && !/^https:\/\//i.test(submissionUrl.trim())) { toastError("El enlace debe comenzar por https://."); return; }
    const currentUser = auth.currentUser;
    if (!currentUser) { toastError("Tu sesión expiró. Vuelve a iniciar sesión."); return; }
    setSaving(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/student/homework/${encodeURIComponent(selected.id)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ submissionText: submissionText.trim(), submissionUrl: submissionUrl.trim() })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo enviar la actividad.");
      success("Actividad enviada al coach para revisión.");
      setSelected(null);
      setSubmissionText("");
      setSubmissionUrl("");
      await load();
    } catch (error: any) {
      toastError(error.message || "No se pudo enviar la actividad.");
    } finally {
      setSaving(false);
    }
  };

  const counts = {
    pending: items.filter(item => item.submission?.status === "pending").length,
    correction: items.filter(item => item.submission?.status === "needs_correction").length,
    approved: items.filter(item => item.submission?.status === "approved").length
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-teal-700">Mi aprendizaje</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Actividades y entregas</h1>
          <p className="mt-1 text-sm text-slate-500">Consulta las actividades de tus cursos, entrega tus respuestas y recibe feedback del coach.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Actualizar</button>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase text-slate-400">En revisión</p><p className="mt-1 text-2xl font-black text-slate-900">{counts.pending}</p></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-[10px] font-bold uppercase text-amber-700">Por corregir</p><p className="mt-1 text-2xl font-black text-amber-900">{counts.correction}</p></div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-[10px] font-bold uppercase text-emerald-700">Aprobadas</p><p className="mt-1 text-2xl font-black text-emerald-900">{counts.approved}</p></div>
      </div>

      {loadError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{loadError}</div>}
      {loading ? <div className="flex justify-center rounded-2xl border border-slate-200 bg-white p-12"><Loader2 className="animate-spin text-teal-700" size={28}/></div> :
        items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><FileText className="mx-auto text-slate-300" size={36}/><h2 className="mt-3 font-bold text-slate-800">Todavía no tienes actividades asignadas</h2><p className="mt-1 text-sm text-slate-500">Cuando tu coach publique una actividad, aparecerá aquí.</p></div> :
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map(item => {
            const status = item.submission?.status;
            const label = status === "approved" ? "Aprobada" : status === "pending" ? "En revisión" : status === "needs_correction" ? "Necesita corrección" : "Pendiente";
            const color = status === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status === "needs_correction" ? "border-amber-200 bg-amber-50 text-amber-800" : status === "pending" ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-slate-50 text-slate-600";
            return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">{item.courseTitle || "Curso"}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{item.title}</h2></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${color}`}>{label}</span></div>
              {item.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{item.description}</p>}
              <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14}/> Fecha límite: {formatDate(item.dueAt)}</p>
              {status === "needs_correction" && item.submission?.feedback && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="mb-1 text-[10px] font-bold uppercase">Feedback del coach</p>{item.submission.feedback}</div>}
              {status === "approved" && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><p className="font-bold">Calificación: {item.submission?.score ?? "—"}/100</p>{item.submission?.feedback && <p className="mt-1">{item.submission.feedback}</p>}</div>}
              <div className="mt-4 flex justify-end">
                {(!status || status === "needs_correction") ? <button onClick={() => openSubmission(item)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-800 px-4 py-2 text-xs font-bold text-white hover:bg-teal-900"><Send size={14}/>{status === "needs_correction" ? "Enviar corrección" : "Entregar actividad"}</button> : <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><CheckCircle2 size={15}/> Entrega registrada</span>}
              </div>
            </article>;
          })}
        </div>
      }

      {selected && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Enviar actividad">
        <div className="w-full max-w-xl rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">{selected.courseTitle}</p><h2 className="mt-1 text-xl font-black text-slate-900">{selected.title}</h2></div><button onClick={() => setSelected(null)} className="rounded-lg px-3 py-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">✕</button></div>
          <label className="mt-5 block text-xs font-bold text-slate-700">Tu respuesta</label>
          <textarea value={submissionText} onChange={e => setSubmissionText(e.target.value)} rows={6} maxLength={10000} placeholder="Escribe tu respuesta o reflexión de la actividad…" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"/>
          <label className="mt-4 block text-xs font-bold text-slate-700">Enlace de archivo o recurso (opcional)</label>
          <input value={submissionUrl} onChange={e => setSubmissionUrl(e.target.value)} placeholder="https://…" type="url" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"/>
          <p className="mt-2 text-[11px] text-slate-500">Solo se aceptan enlaces HTTPS. No incluyas información sensible de otras personas.</p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={() => setSelected(null)} disabled={saving} className="min-h-10 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancelar</button><button onClick={() => void submit()} disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>} Enviar al coach</button></div>
        </div>
      </div>}
    </section>
  );
}
