import React, { useEffect, useState } from 'react';
import { auth } from '@/src/firebase';
import { useAuth } from '@/src/hooks/useAuth';
import { Activity, AlertCircle, Clock3, Loader2, RefreshCw, Star, Target, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface CoachAnalytics {
  generatedAt: string;
  source: string;
  scope: 'own' | 'all';
  retention: { uniqueClients: number; returningClients: number; rate: number };
  sessions: { total: number; weekly: Array<{ week: string; sessions: number }> };
  hours: number | null;
  monthlyHours: Array<{ month: string; hours: number }>;
  satisfaction: { average: number | null; responses: number };
  funnel: { new: number; contacted: number; qualified: number; enrolled: number; lost: number };
  enrollments: number;
  leads: number;
  coverage: { durationTrackedSessions: number; totalSessions: number; sessionsWithClientIdentity: number; sessionsWithoutClientIdentity: number };
}

const emptyMetrics: CoachAnalytics = {
  generatedAt: '', source: '', scope: 'own',
  retention: { uniqueClients: 0, returningClients: 0, rate: 0 },
  sessions: { total: 0, weekly: [] }, hours: null, monthlyHours: [],
  satisfaction: { average: null, responses: 0 },
  funnel: { new: 0, contacted: 0, qualified: 0, enrolled: 0, lost: 0 },
  enrollments: 0, leads: 0, coverage: { durationTrackedSessions: 0, totalSessions: 0, sessionsWithClientIdentity: 0, sessionsWithoutClientIdentity: 0 }
};

export function CoachCrmAudit() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<CoachAnalytics>(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) { setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/coach/analytics', { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las métricas.');
      setMetrics(payload as CoachAnalytics);
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user?.uid) void load(); }, [user?.uid]);

  const funnelRows = [
    { stage: 'Nuevo', value: metrics.funnel.new },
    { stage: 'Contactado', value: metrics.funnel.contacted },
    { stage: 'Calificado', value: metrics.funnel.qualified },
    { stage: 'Inscrito', value: metrics.funnel.enrolled },
    { stage: 'Perdido', value: metrics.funnel.lost }
  ];
  const cards = [
    { label: 'Clientes identificados', value: metrics.retention.uniqueClients, detail: 'Identificados por ID o nombre en sesión', icon: Users },
    { label: 'Recurrencia de clientes', value: `${metrics.retention.rate}%`, detail: `${metrics.retention.returningClients} con más de una sesión identificada`, icon: Activity },
    { label: 'Sesiones impartidas', value: metrics.sessions.total, detail: 'Sesiones registradas en KIRA', icon: Target },
    { label: 'Leads asignados', value: metrics.leads || 0, detail: 'Prospectos bajo responsabilidad del coach', icon: Users },
    { label: 'Valoración de cursos', value: metrics.satisfaction.average === null ? '—' : `${metrics.satisfaction.average.toFixed(1)}/5`, detail: `${metrics.satisfaction.responses} reseñas de cursos asociados`, icon: Star }
  ];

  if (loading) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-teal-700" size={32}/></div>;

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-teal-700">Espacio de trabajo · Coach</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">CRM y auditoría de clientes</h1>
          <p className="mt-1 text-sm text-slate-500">Indicadores calculados a partir de sesiones, leads, matrículas y valoraciones reales de KIRA.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={15}/>Actualizar</button>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle size={18}/>{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(card => {
          const Icon = card.icon;
          return <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold text-slate-500">{card.label}</p><span className="rounded-xl bg-teal-50 p-2 text-teal-700"><Icon size={18}/></span></div>
            <p className="mt-3 text-3xl font-black text-slate-900">{card.value}</p>
            <p className="mt-1 text-xs text-slate-400">{card.detail}</p>
          </article>;
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">Recurrencia semanal de sesiones</h2>
          <p className="mt-1 text-xs text-slate-500">Últimas seis semanas con actividad registrada.</p>
          <div className="mt-4 h-64">
            {metrics.sessions.weekly.length ? <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.sessions.weekly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="week" tick={{ fontSize: 10 }} tickFormatter={value => String(value).slice(5)}/>
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }}/>
                <Tooltip/>
                <Bar dataKey="sessions" name="Sesiones" fill="#1B4D5D" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-400">Sin sesiones registradas en este período.</div>}
          </div>
        </article>

        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">Embudo de conversión</h2>
          <p className="mt-1 text-xs text-slate-500">Leads asignados al coach, agrupados por etapa CRM.</p>
          <div className="mt-4 h-64">
            {funnelRows.some(row => row.value > 0) ? <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelRows} layout="vertical" margin={{ left: 12, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }}/>
                <YAxis type="category" dataKey="stage" width={88} tick={{ fontSize: 11 }}/>
                <Tooltip/>
                <Bar dataKey="value" name="Prospectos" fill="#1B4D5D" radius={[0,6,6,0]}/>
              </BarChart>
            </ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-400">No hay prospectos asignados a este coach.</div>}
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">Horas de coaching por mes</h2>
        <p className="mt-1 text-xs text-slate-500">Solo se suman duraciones registradas explícitamente en las sesiones.</p>
        <div className="mt-4 h-56">
          {metrics.monthlyHours.length ? <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.monthlyHours}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="month" tick={{ fontSize: 10 }}/>
              <YAxis allowDecimals tick={{ fontSize: 10 }}/>
              <Tooltip/>
              <Bar dataKey="hours" name="Horas" fill="#C5A059" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-400">Aún no hay duraciones mensuales registradas.</div>}
        </div>
      </article>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800"><Clock3 size={18} className="text-teal-700"/><h2 className="font-bold">Horas de coaching</h2></div>
          <p className="mt-3 text-3xl font-black text-slate-900">{metrics.hours === null ? 'No disponible' : `${metrics.hours} h`}</p>
          <p className="mt-1 text-xs text-slate-500">{metrics.coverage.durationTrackedSessions} de {metrics.coverage.totalSessions} sesiones contienen duración explícita. No se estima tiempo cuando el registro no lo incluye.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800"><Users size={18} className="text-teal-700"/><h2 className="font-bold">Matrículas relacionadas</h2></div>
          <p className="mt-3 text-3xl font-black text-slate-900">{metrics.enrollments}</p>
          <p className="mt-1 text-xs text-slate-500">Matrículas asociadas a cursos propios del coach.</p>
        </article>
      </div>

      <footer className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Fuente: {metrics.source || 'API de analítica KIRA'}. {metrics.generatedAt ? `Actualizado: ${new Date(metrics.generatedAt).toLocaleString('es-ES')}.` : ''}
        Identidad del cliente disponible en {metrics.coverage.sessionsWithClientIdentity || 0} de {metrics.coverage.totalSessions} sesiones; la recurrencia solo cuenta sesiones con cliente identificado. La duración solo se suma cuando está registrada explícitamente o existen horas de inicio y fin. Los indicadores sin datos de origen se muestran como no disponibles, nunca como cifras estimadas.
      </footer>
    </section>
  );
}
