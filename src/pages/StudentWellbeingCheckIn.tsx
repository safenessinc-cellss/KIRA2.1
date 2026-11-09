import React, { useCallback, useEffect, useState } from "react";
import { auth } from "@/src/firebase";
import { useAuth } from "@/src/hooks/useAuth";
import { useToast } from "@/src/hooks/useToast";
import { Activity, CheckCircle2, HeartPulse, Loader2, ShieldCheck } from "lucide-react";

type CheckIn = { energyLevel: number; clarityLevel: number; shareWithCompany: boolean; day: string };

export function StudentWellbeingCheckIn() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [energy, setEnergy] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [shareWithCompany, setShareWithCompany] = useState(false);
  const [saved, setSaved] = useState<CheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const hasCompany = Boolean(user?.companyId);

  const load = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) { setLoading(false); return; }
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/student/wellbeing/checkin", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar tu check-in.");
      if (payload.item) {
        setSaved(payload.item);
        setEnergy(Number(payload.item.energyLevel) || 3);
        setClarity(Number(payload.item.clarityLevel) || 3);
        setShareWithCompany(payload.item.shareWithCompany === true);
      }
    } catch (error) {
      console.error("Wellbeing check-in load failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user?.uid) void load(); }, [user?.uid, load]);

  const submit = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) { toastError("Tu sesión expiró. Vuelve a iniciar sesión."); return; }
    setSaving(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/wellbeing/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ energyLevel: energy, clarityLevel: clarity, shareWithCompany: hasCompany && shareWithCompany })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar tu check-in.");
      setSaved({ energyLevel: energy, clarityLevel: clarity, shareWithCompany: hasCompany && shareWithCompany, day: new Date().toISOString().slice(0, 10) });
      success(payload.pointsAwarded > 0 ? `Check-in guardado. +${payload.pointsAwarded} Energy Points.` : "Check-in actualizado.");
    } catch (error: any) {
      toastError(error.message || "No se pudo guardar tu check-in.");
    } finally {
      setSaving(false);
    }
  };

  const scale = (value: number, setValue: (value: number) => void) => (
    <div className="mt-3 grid grid-cols-5 gap-2">
      {[1,2,3,4,5].map(n => <button key={n} type="button" onClick={() => setValue(n)} aria-pressed={value === n} className={`min-h-12 rounded-xl border text-sm font-black transition ${value === n ? "border-teal-700 bg-teal-700 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-teal-300"}`}>{n}</button>)}
    </div>
  );

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800"><HeartPulse size={24}/></span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-teal-700">Autocuidado · Registro diario</p><h1 className="text-2xl font-black text-slate-900">Check-in de bienestar</h1></div></div>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">Registra cómo percibes tu energía y claridad hoy. Este registro no es un diagnóstico ni sustituye apoyo profesional.</p>
      </header>
      {loading ? <div className="flex justify-center rounded-2xl border border-slate-200 bg-white p-10"><Loader2 className="animate-spin text-teal-700" size={28}/></div> :
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-6">
          <div><div className="flex items-center justify-between gap-3"><label className="text-sm font-bold text-slate-800">¿Cómo está tu energía?</label><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-800">{energy}/5</span></div><p className="mt-1 text-xs text-slate-500">1 = muy baja · 5 = muy alta</p>{scale(energy,setEnergy)}</div>
          <div><div className="flex items-center justify-between gap-3"><label className="text-sm font-bold text-slate-800">¿Qué claridad mental percibes?</label><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-800">{clarity}/5</span></div><p className="mt-1 text-xs text-slate-500">1 = poca claridad · 5 = mucha claridad</p>{scale(clarity,setClarity)}</div>
          {hasCompany && <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input type="checkbox" checked={shareWithCompany} onChange={e => setShareWithCompany(e.target.checked)} className="mt-1 h-4 w-4 accent-teal-700"/>
            <span><span className="block text-sm font-bold text-slate-800">Permitir que este check-in contribuya a estadísticas agregadas de mi organización</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">RR. HH. nunca verá tu respuesta individual ni tu identidad en el informe. Solo se publican estadísticas de grupos con al menos cinco participantes. Puedes dejarlo desmarcado.</span></span>
          </label>}
          {!hasCompany && <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">Tu cuenta no está asociada a una organización. Este check-in será privado.</div>}
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            {saved && <p className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 size={15}/> Guardado hoy · {saved.day}</p>}
            <button onClick={() => void submit()} disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 py-3 text-sm font-bold text-white hover:bg-teal-900 disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin"/> : <Activity size={16}/>} Guardar check-in</button>
          </div>
        </div>
      </div>}
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600"><ShieldCheck size={18} className="shrink-0 text-teal-700"/>Tu diario personal y tus conversaciones no se utilizan para este indicador corporativo. El check-in se guarda separado y solo se comparte si activas el consentimiento de agregación.</div>
    </section>
  );
}
