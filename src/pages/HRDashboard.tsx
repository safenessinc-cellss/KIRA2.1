import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { Users, BarChart3, ShieldCheck, Building2, AlertCircle } from "lucide-react";

export function HRDashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [aggregates, setAggregates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const companyId = String(user?.companyId || "");

  useEffect(() => {
    let active = true;
    const loadCompanyData = async () => {
      setLoading(true);
      setError("");
      if (!companyId) {
        setEmployees([]);
        setAggregates([]);
        setLoading(false);
        return;
      }
      try {
        const [membersSnapshot, aggregatesSnapshot] = await Promise.all([
          getDocs(collection(db, "companies", companyId, "members")),
          getDocs(collection(db, "companies", companyId, "wellbeingAggregates"))
        ]);
        if (!active) return;
        setEmployees(membersSnapshot.docs.map(snapshot => ({ id: snapshot.id, ...snapshot.data() })));
        setAggregates(aggregatesSnapshot.docs.map(snapshot => ({ id: snapshot.id, ...snapshot.data() })));
      } catch (err) {
        console.error("Company portal data load failed:", err);
        if (active) setError("No fue posible cargar los datos autorizados de esta empresa. Verifica su asignación y permisos.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadCompanyData();
    return () => { active = false; };
  }, [companyId]);

  const activeEmployees = employees.filter(employee => employee.status === "active" || employee.status === "approved");
  const latestAggregate = aggregates.slice().sort((a, b) => String(b.periodEnd || b.createdAt || b.period || b.updatedAt || "").localeCompare(String(a.periodEnd || a.createdAt || a.period || a.updatedAt || "")))[0];
  const sampleSize = Number(latestAggregate?.sampleSize ?? latestAggregate?.cohortSize ?? latestAggregate?.participantCount ?? 0);
  const minimumCohortSize = Math.max(5, Number(latestAggregate?.minimumCohortSize ?? latestAggregate?.minCohortSize ?? 5));
  const privacyThresholdMet = Boolean(latestAggregate && sampleSize >= minimumCohortSize && latestAggregate.suppressed !== true);
  const highRiskCount = Number(latestAggregate?.highRiskCount ?? latestAggregate?.riskHigh ?? 0);
  const averageEngagement = Number(latestAggregate?.averageEngagement ?? latestAggregate?.engagementScore ?? 0);
  const hasWellbeingAggregate = Boolean(privacyThresholdMet && (latestAggregate.highRiskCount !== undefined || latestAggregate.riskHigh !== undefined || latestAggregate.averageEngagement !== undefined || latestAggregate.engagementScore !== undefined));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Building2 size={26} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-700">KIRA · Portal empresarial</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{user?.companyName || "Panel de empresa"}</h1>
            <p className="mt-1 text-sm text-slate-500">Gestión de licencias y análisis agregado de bienestar, respetando la privacidad individual.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">Acceso por organización</span>
        </div>
      </header>

      {!companyId && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div><p className="font-bold">Empresa todavía no asignada</p><p className="mt-1 text-sm">El administrador de KIRA debe asociar esta cuenta a una organización antes de habilitar los datos B2B.</p></div>
        </div>
      )}
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Colaboradores registrados</span><Users className="text-teal-700" size={20} /></div>
          <p className="mt-4 text-4xl font-black tabular-nums text-slate-900">{loading ? "—" : employees.length}</p>
          <p className="mt-2 text-xs text-slate-500">{activeEmployees.length} con estado activo registrado</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Check-ins con energía o claridad baja (agregado)</span><ShieldCheck className="text-teal-700" size={20} /></div>
          <p className="mt-4 text-4xl font-black tabular-nums text-slate-900">{loading || !hasWellbeingAggregate ? "—" : highRiskCount}</p>
          <p className="mt-2 text-xs text-slate-500">{hasWellbeingAggregate ? "Solo check-ins consentidos y agregados" : "Disponible cuando existan evaluaciones agregadas"}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Energía y claridad promedio</span><BarChart3 className="text-teal-700" size={20} /></div>
          <p className="mt-4 text-4xl font-black tabular-nums text-slate-900">{loading || !hasWellbeingAggregate ? "—" : averageEngagement.toFixed(1)}</p>
          <p className="mt-2 text-xs text-slate-500">{hasWellbeingAggregate ? `Muestra agregada de ${sampleSize} personas; mínimo ${minimumCohortSize}.` : `Oculto hasta alcanzar una muestra mínima de ${minimumCohortSize} personas.`}</p>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Equipo de la organización</h2>
          <p className="mt-1 text-sm text-slate-500">La lista procede exclusivamente del espacio de esta empresa.</p>
        </div>
        {loading ? <div className="p-10 text-center text-sm text-slate-500">Cargando equipo…</div> :
          employees.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No hay colaboradores asignados a esta organización.</div> :
          <div className="divide-y divide-slate-100">
            {employees.map(employee => (
              <div key={employee.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                <div className="min-w-0"><p className="truncate font-semibold text-slate-800">{employee.displayName || employee.name || "Colaborador"}</p><p className="mt-1 text-xs text-slate-500">{employee.department || "Área no definida"}{employee.jobTitle ? " · " + employee.jobTitle : ""}</p></div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{employee.status || "Sin estado"}</span>
              </div>
            ))}
          </div>
        }
      </section>

      <p className="text-xs leading-relaxed text-slate-400">KIRA no expone diarios personales, conversaciones privadas ni predicciones individuales a la empresa. Los indicadores de bienestar solo se mostrarán cuando existan agregados autorizados y suficientes para proteger la privacidad.</p>
    </div>
  );
}
