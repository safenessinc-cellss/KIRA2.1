import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { BarChart3, Building2, HeartPulse, ShieldCheck, Users } from "lucide-react";

type Aggregate = {
  id: string;
  periodEnd?: any;
  headcount?: number;
  highRiskCount?: number;
  riskHigh?: number;
  averageEngagement?: number;
  engagementScore?: number;
  burnoutPercent?: number;
  leaveCount?: number;
};

export function HRDashboard() {
  const { user } = useAuth();
  const [aggregates, setAggregates] = useState<Aggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const companyId = String(user?.companyId || user?.organizationId || user?.orgId || "");

  useEffect(() => {
    if (!companyId) {
      setAggregates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const unsubscribe = onSnapshot(
      collection(db, "companies", companyId, "wellbeingAggregates"),
      snapshot => {
        setAggregates(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Aggregate)));
        setLoading(false);
      },
      cause => {
        console.error("Company aggregate subscription failed:", cause);
        setError("No fue posible cargar los indicadores agregados autorizados de esta organización.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [companyId]);

  const latest = useMemo(() => aggregates.slice().sort((a, b) => {
    const dateValue = (value: any) => value?.toMillis ? value.toMillis() : new Date(value || 0).getTime();
    return dateValue(b.periodEnd) - dateValue(a.periodEnd);
  })[0], [aggregates]);

  const metrics = [
    { label: "Colaboradores (agregado)", value: latest?.headcount, icon: Users, suffix: "" },
    { label: "Riesgo elevado agregado", value: latest?.highRiskCount ?? latest?.riskHigh, icon: ShieldCheck, suffix: "" },
    { label: "Engagement promedio", value: latest?.averageEngagement ?? latest?.engagementScore, icon: BarChart3, suffix: "" },
    { label: "Burnout estimado", value: latest?.burnoutPercent, icon: HeartPulse, suffix: "%" },
    { label: "Licencias (agregado)", value: latest?.leaveCount, icon: Users, suffix: "" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Building2 size={26} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-700">KIRA · Portal empresarial</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{user?.companyName || "Panel de empresa"}</h1>
            <p className="mt-1 text-sm text-slate-500">Indicadores agregados de bienestar, sin acceso a información personal.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">Acceso por organización</span>
        </div>
      </header>

      {!companyId && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Esta cuenta todavía no está asociada a una organización.</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(metric => {
          const Icon = metric.icon;
          const hasValue = metric.value !== undefined && metric.value !== null;
          return <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">{metric.label}</span><Icon className="text-teal-700" size={20} /></div>
            <p className="mt-4 text-4xl font-black tabular-nums text-slate-900">{loading || !hasValue ? "—" : Number(metric.value).toLocaleString(undefined, { maximumFractionDigits: 1 }) + metric.suffix}</p>
          </article>;
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Privacidad empresarial</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Este portal no consulta ni muestra registros de miembros, nombres, correos, departamentos, diarios personales, notas, transcripciones ni evaluaciones individuales. Solo consume documentos agregados publicados por un proceso autorizado. Las métricas de grupos pequeños deben suprimirse para evitar la reidentificación.</p>
        {latest?.periodEnd && <p className="mt-3 text-xs text-slate-400">Último período informado: {String(latest.periodEnd)}</p>}
        {!loading && aggregates.length === 0 && <p className="mt-3 text-sm text-slate-500">Aún no hay indicadores agregados publicados para esta organización.</p>}
      </section>
    </div>
  );
}
