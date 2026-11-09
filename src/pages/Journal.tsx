import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { EnergyTierBadge } from "../components/EnergyTierBadge";
import { BookHeart, Sparkles, Pencil, Trash2, Loader2, Save, X } from "lucide-react";

type Entry = { id: string; content: string; sentiment?: string; createdAt?: any };

export function Journal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [content, setContent] = useState("");
  const [sentiment, setSentiment] = useState("positive");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.uid) { setEntries([]); setLoading(false); return; }
    setLoading(true);
    const entriesQuery = query(collection(db, "journals"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(50));
    return onSnapshot(entriesQuery, snapshot => {
      setEntries(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Entry)));
      setLoading(false);
    }, cause => {
      console.error("Private journal subscription failed:", cause);
      setError("No fue posible cargar tu diario privado.");
      setLoading(false);
    });
  }, [user?.uid]);

  const saveEntry = async () => {
    if (!user?.uid || !content.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await updateDoc(doc(db, "journals", editingId), { content: content.trim(), sentiment });
      } else {
        await addDoc(collection(db, "journals"), { userId: user.uid, content: content.trim(), sentiment, createdAt: serverTimestamp() });
      }
      setContent("");
      setEditingId(null);
      setAnalysis("");
    } catch (cause) {
      console.error("Journal save failed:", cause);
      setError("No se pudo guardar la entrada. Comprueba tu conexión e inténtalo nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const analyzeEntry = async () => {
    if (!content.trim() || analyzing) return;
    setAnalyzing(true);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Inicia sesión nuevamente.");
      const response = await fetch("/api/ai/analyze-journal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ text: content.trim(), mood: sentiment })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No fue posible analizar la reflexión.");
      setAnalysis(typeof payload.analysis === "string" ? payload.analysis : JSON.stringify(payload.analysis, null, 2));
    } catch (cause: any) {
      setError(cause?.message || "La IA no está disponible en este momento.");
    } finally {
      setAnalyzing(false);
    }
  };

  const editEntry = (entry: Entry) => {
    setEditingId(entry.id);
    setContent(entry.content);
    setSentiment(entry.sentiment || "positive");
    setAnalysis("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeEntry = async (id: string) => {
    if (!window.confirm("¿Eliminar esta entrada personal? Esta acción no se puede deshacer.")) return;
    try {
      await deleteDoc(doc(db, "journals", id));
      if (editingId === id) { setEditingId(null); setContent(""); }
    } catch (cause) {
      console.error("Journal delete failed:", cause);
      setError("No se pudo eliminar la entrada.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3"><div className="rounded-2xl bg-violet-50 p-3 text-violet-700"><BookHeart size={24}/></div><div><p className="text-xs font-black uppercase tracking-widest text-violet-700">Espacio privado</p><h1 className="text-2xl font-black text-slate-900">Diario de reflexión</h1><p className="text-sm text-slate-500">Tus entradas son visibles únicamente para ti.</p></div></div>
        <EnergyTierBadge/>
      </header>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap gap-2">
          {[["positive","Evolutivo 🌟"],["neutral","Estable 🌿"],["negative","Desafiante 🌪️"]].map(([value,label]) => <button key={value} type="button" onClick={() => setSentiment(value)} className={"rounded-xl border px-4 py-2 text-xs font-bold " + (sentiment === value ? "border-violet-300 bg-violet-50 text-violet-800" : "border-slate-200 text-slate-500")}>{label}</button>)}
        </div>
        <textarea value={content} onChange={event => setContent(event.target.value)} maxLength={20000} rows={8} placeholder="¿Qué estás sintiendo, aprendiendo o agradeciendo hoy?" className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"/>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-400">{content.length.toLocaleString()} / 20.000 caracteres</span><div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void analyzeEntry()} disabled={!content.trim() || analyzing} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 px-4 py-3 text-xs font-bold text-violet-700 disabled:opacity-50">{analyzing ? <Loader2 size={15} className="animate-spin"/> : <Sparkles size={15}/>}Analizar con KIRA</button>
          <button type="button" onClick={() => void saveEntry()} disabled={!content.trim() || saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>} {editingId ? "Actualizar" : "Guardar entrada"}</button>
          {editingId && <button type="button" onClick={() => {setEditingId(null);setContent("");}} className="inline-flex items-center gap-2 rounded-xl px-3 py-3 text-xs font-bold text-slate-500"><X size={15}/>Cancelar</button>}
        </div></div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {analysis && <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 p-5"><h2 className="mb-2 text-sm font-black text-violet-900">Reflexión asistida por KIRA</h2><pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-violet-950">{analysis}</pre></div>}
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-900">Mi historial</h2><p className="text-xs text-slate-500">Sincronizado en tiempo real</p></div><span className="text-xs font-bold text-slate-400">{entries.length} entradas</span></div>
        {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin text-violet-600"/></div> : entries.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Todavía no tienes entradas guardadas.</p> : <div className="divide-y divide-slate-100">{entries.map(entry => <article key={entry.id} className="py-4"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-widest text-violet-700">{entry.sentiment || "Reflexión"}</span><div className="flex gap-3"><button type="button" onClick={() => editEntry(entry)} className="inline-flex items-center gap-1 text-xs font-bold text-teal-700"><Pencil size={13}/>Editar</button><button type="button" onClick={() => void removeEntry(entry.id)} className="inline-flex items-center gap-1 text-xs font-bold text-rose-600"><Trash2 size={13}/>Eliminar</button></div></div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{entry.content}</p><time className="mt-2 block text-[10px] text-slate-400">{entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleString() : "Guardado"}</time></article>)}</div>}
      </section>
    </div>
  );
}
