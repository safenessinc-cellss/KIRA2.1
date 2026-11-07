import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { Activity, GraduationCap, Loader2, BookOpen, TrendingUp, Award, Users } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

type EnrollmentRow = {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  progress: number;
  status?: string;
  createdAt?: any;
};

type CourseSummary = {
  id: string;
  title: string;
  enrollments: number;
  completed: number;
};

type DayPoint = { date: string; enrollments: number };

export function CoachAnalytics({ coachId }: { coachId?: string }) {
  const [stats, setStats] = useState({ views: 0, enrollments: 0, students: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<DayPoint[]>([]);
  const [enrollmentRows, setEnrollmentRows] = useState<EnrollmentRow[]>([]);
  const [courseSummary, setCourseSummary] = useState<CourseSummary[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      if (!coachId) {
        setError('No se pudo identificar al coach.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const coachDoc = await getDoc(doc(db, 'users', coachId));
        const rawViews = coachDoc.exists() ? coachDoc.data()?.viewCount : 0;
        const views = typeof rawViews === 'number' && Number.isFinite(rawViews) && rawViews >= 0 ? rawViews : 0;

        const coursesSnap = await getDocs(query(collection(db, 'courses'), where('coachId', '==', coachId)));
        const courses = coursesSnap.docs.map(courseDoc => ({
          id: courseDoc.id,
          title: String(courseDoc.data().title || courseDoc.data().name || 'Curso sin título'),
        }));

        const records: EnrollmentRow[] = [];
        const summaryMap = new Map<string, CourseSummary>();
        for (const course of courses) {
          summaryMap.set(course.id, { id: course.id, title: course.title, enrollments: 0, completed: 0 });
          const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', course.id)));
          for (const enrollmentDoc of enrollSnap.docs) {
            const data = enrollmentDoc.data();
            const userId = typeof data.userId === 'string' ? data.userId : '';
            if (!userId) continue;
            const progressValue = Number(data.progress);
            const progress = Number.isFinite(progressValue) ? Math.max(0, Math.min(100, progressValue)) : 0;
            const status = typeof data.status === 'string' ? data.status : undefined;
            const completed = progress >= 100 || status === 'completed';
            records.push({
              id: enrollmentDoc.id,
              userId,
              courseId: course.id,
              courseTitle: course.title,
              progress,
              status,
              createdAt: data.createdAt,
            });
            const summary = summaryMap.get(course.id)!;
            summary.enrollments += 1;
            if (completed) summary.completed += 1;
          }
        }

        if (cancelled) return;
        const uniqueLearners = new Set(records.map(row => row.userId));
        setEnrollmentRows(records.sort((a, b) => b.progress - a.progress));
        setCourseSummary(Array.from(summaryMap.values()).sort((a, b) => b.enrollments - a.enrollments));
        setStats({
          views,
          enrollments: records.length,
          students: uniqueLearners.size,
          completed: records.filter(row => row.progress >= 100 || row.status === 'completed').length,
        });

        if (records.length === 0) {
          setChartData([]);
        } else {
          const days: Array<DayPoint & { key: string }> = Array.from({ length: 7 }, (_, index) => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - (6 - index));
            return {
              key: date.toDateString(),
              date: date.toLocaleDateString('es-ES', { weekday: 'short' }),
              enrollments: 0,
            };
          });
          const dayMap = new Map(days.map(day => [day.key, day]));
          for (const row of records) {
            const createdAt = row.createdAt?.toDate ? row.createdAt.toDate() : row.createdAt instanceof Date ? row.createdAt : null;
            if (!createdAt || Number.isNaN(createdAt.getTime())) continue;
            const day = new Date(createdAt);
            day.setHours(0, 0, 0, 0);
            const point = dayMap.get(day.toDateString());
            if (point) point.enrollments += 1;
          }
          setChartData(days.map(({ date, enrollments }) => ({ date, enrollments })));
        }
      } catch (err) {
        console.error('Error fetching coach analytics:', err);
        if (!cancelled) setError('No se pudieron cargar las analíticas. Verifica tus permisos y vuelve a intentarlo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStats();
    return () => { cancelled = true; };
  }, [coachId]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-kirateal" size={32} /></div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        <p className="font-semibold">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="mb-4">
        <h3 className="text-xl font-black text-slate-800 tracking-tight">Analíticas del Coach</h3>
        <p className="text-sm text-slate-500 mt-1">Indicadores calculados a partir de cursos e inscripciones reales. No se incluyen diarios privados ni tendencias inventadas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsStatCard icon={<Activity className="text-sky-500" />} label="Vistas de Perfil" value={stats.views} color="sky" />
        <AnalyticsStatCard icon={<Users className="text-rose-500" />} label="Alumnos Únicos" value={stats.students} color="rose" />
        <AnalyticsStatCard icon={<GraduationCap className="text-indigo-500" />} label="Inscripciones" value={stats.enrollments} color="indigo" />
        <AnalyticsStatCard icon={<Award className="text-emerald-600" />} label="Completados" value={stats.completed} color="emerald" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-kirateal/10 rounded-lg text-kirateal"><TrendingUp size={20} /></div>
          <div>
            <h4 className="font-bold text-slate-800">Inscripciones (últimos 7 días)</h4>
            <p className="text-xs text-slate-500">Fuente: fecha de creación de las inscripciones.</p>
          </div>
        </div>
        {chartData.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-12">Todavía no hay inscripciones registradas para mostrar.</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="enrollments" name="Inscripciones" stroke="#0f766e" strokeWidth={3} fill="#14b8a6" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-slate-800 flex items-center gap-2"><GraduationCap className="text-kirateal" size={18} /> Progreso de inscripciones</h4>
          </div>
          <div className="space-y-3">
            {enrollmentRows.length > 0 ? enrollmentRows.slice(0, 8).map(row => (
              <div key={row.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{row.courseTitle}</p>
                    <p className="text-xs text-slate-500">Alumno #{row.userId.slice(-6)}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-kirateal bg-kirateal/10 px-2 py-1 rounded-full">{row.progress}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-kirateal" style={{ width: row.progress + '%' }} />
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-500 italic text-center py-4">No hay inscripciones reales asociadas a tus cursos.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-slate-800 flex items-center gap-2"><BookOpen className="text-kiragold" size={18} /> Rendimiento por curso</h4>
          </div>
          <div className="space-y-3">
            {courseSummary.length > 0 ? courseSummary.slice(0, 8).map(course => (
              <div key={course.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{course.title}</p>
                  <p className="text-xs text-slate-500">{course.completed} de {course.enrollments} completados</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{course.enrollments} alumnos</span>
              </div>
            )) : (
              <p className="text-sm text-slate-500 italic text-center py-4">No hay cursos publicados o registros disponibles.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsStatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: 'sky' | 'rose' | 'indigo' | 'emerald' }) {
  const colors = {
    sky: 'bg-sky-50 text-sky-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors[color])}>{icon}</div>
        <span className="text-[10px] font-semibold text-slate-400">Firestore</span>
      </div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
      <h4 className="text-2xl font-black text-slate-900">{value.toLocaleString()}</h4>
    </div>
  );
}
