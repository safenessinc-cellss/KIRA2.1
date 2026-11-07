import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { Building2, Users, BarChart3, GraduationCap, Activity, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

type CorporateMetrics = {
  available: true;
  employeeCount: number;
  activeLearners: number;
  enrollmentCount: number;
  completedEnrollments: number;
  averageProgress: number;
  participationRate: number;
  sessionsCount: number;
  minimumGroupSize: number;
  lastUpdated: string;
};

export function HRDashboard() {
  const [metrics, setMetrics] = useState<CorporateMetrics | null>(null);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Tu sesión ha expirado. Vuelve a iniciar sesión.');
      const response = await fetch('/api/b2b/analytics', {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudieron consultar las métricas corporativas.');
      if (data.available === true) {
        setMetrics(data as CorporateMetrics);
        setUnavailableReason(null);
      } else {
        setMetrics(null);
        setUnavailableReason(String(data.reason || 'unavailable'));
      }
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar los datos corporativos.');
      setMetrics(null);
      setUnavailableReason(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!active) return;
      await loadAnalytics();
    };
    run();
    return () => { active = false; };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[320px]"><Loader2 className="animate-spin text-kirateal" size={32} /></div>;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8">
        <h2 className="text-lg font-bold text-rose-800">Error al cargar el reporte corporativo</h2>
        <p className="mt-2 text-sm text-rose-700">{error}</p>
        <button onClick={loadAnalytics} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-800 border border-rose-200"><RefreshCw size={16} /> Reintentar</button>
      </div>
    );
  }

  if (!metrics) {
    const message = unavailableReason === 'minimum_group_size'
      ? 'Los reportes agregados se habilitan cuando el grupo alcanza al menos 5 personas. No se muestran datos individuales ni se revela el tamaño del grupo.'
      : unavailableReason === 'organization_not_assigned'
        ? 'Tu cuenta corporativa todavía no está asociada a una organización. Solicita al superadministrador que complete la asignación.'
        : 'No hay datos corporativos disponibles en este momento.';
    return (
      <div className="space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-8">
          <div className="flex items-center gap-3"><Building2 className="text-kirateal" size={24} /><div><h1 className="text-2xl font-black text-slate-900">Bienestar Corporativo</h1><p className="text-sm text-slate-500">Reportes agregados y protegidos por privacidad.</p></div></div>
        </header>
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <ShieldCheck className="mx-auto mb-4 text-slate-400" size={42} />
          <h2 className="text-lg font-bold text-slate-800">Reporte no disponible</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">{message}</p>
          <button onClick={loadAnalytics} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"><RefreshCw size={16} /> Actualizar</button>
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Personas en la organización', value: metrics.employeeCount.toLocaleString(), icon: <Users size={22} />, color: 'indigo' },
    { label: 'Participación', value: metrics.participationRate + '%', icon: <Activity size={22} />, color: 'teal' },
    { label: 'Inscripciones', value: metrics.enrollmentCount.toLocaleString(), icon: <GraduationCap size={22} />, color: 'violet' },
    { label: 'Progreso promedio', value: metrics.averageProgress + '%', icon: <BarChart3 size={22} />, color: 'amber' },
  ];

  const colorClass: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    teal: 'bg-teal-50 text-teal-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in">
      <header className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Building2 className="text-kirateal" size={26} /><div><h1 className="text-2xl font-black text-slate-900">Bienestar Corporativo</h1><p className="mt-1 text-sm text-slate-500">Indicadores de adopción agregados. No incluye diarios, conversaciones privadas, notas de coaching ni predicciones individuales.</p></div></div>
          <button onClick={loadAnalytics} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"><RefreshCw size={16} /> Actualizar</button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className={'mb-4 flex h-11 w-11 items-center justify-center rounded-xl ' + colorClass[card.color]}>{card.icon}</div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{card.value}</p>
            <p className="mt-2 text-xs text-slate-400">Dato agregado de Firestore</p>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-8">
        <div className="mb-6 flex items-center gap-3"><ShieldCheck className="text-kirateal" size={22} /><div><h2 className="text-lg font-bold text-slate-900">Resumen del programa</h2><p className="text-sm text-slate-500">Solo se muestran agregados de grupos con tamaño suficiente para proteger la identidad.</p></div></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-semibold uppercase text-slate-500">Alumnos activos</p><p className="mt-2 text-2xl font-black text-slate-900">{metrics.activeLearners.toLocaleString()}</p></div>
          <div className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-semibold uppercase text-slate-500">Cursos completados</p><p className="mt-2 text-2xl font-black text-slate-900">{metrics.completedEnrollments.toLocaleString()}</p></div>
          <div className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-semibold uppercase text-slate-500">Sesiones registradas</p><p className="mt-2 text-2xl font-black text-slate-900">{metrics.sessionsCount.toLocaleString()}</p></div>
        </div>
        <p className="mt-6 text-xs text-slate-400">Última actualización: {new Date(metrics.lastUpdated).toLocaleString('es-ES')}</p>
      </section>
    </div>
  );
}
