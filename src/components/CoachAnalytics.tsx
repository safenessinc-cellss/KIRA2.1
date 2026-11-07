import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from "firebase/firestore";
import { Activity, GraduationCap, TrendingUp, BookOpen, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function CoachAnalytics({ coachId }: { coachId?: string }) {
  const [stats, setStats] = useState({ views: 0, favorites: 0, enrollments: 0 });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    if (!coachId) { setLoading(false); return; }
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [coachDoc, favoritesSnapshot, coursesSnapshot] = await Promise.all([
          getDoc(doc(db, "users", coachId)),
          getDocs(query(collection(db, "users"), where("favorites", "array-contains", coachId))),
          getDocs(query(collection(db, "courses"), where("coachId", "==", coachId)))
        ]);
        const courseIds = coursesSnapshot.docs.map(snapshot => snapshot.id);
        const courseById = new Map(coursesSnapshot.docs.map(snapshot => [snapshot.id, { id: snapshot.id, ...snapshot.data() }]));
        const enrollmentRows: any[] = [];
        const activityRows: any[] = [];
        const studentMap = new Map<string, any>();

        for (const courseId of courseIds) {
          const [enrollmentSnapshot, activitySnapshot] = await Promise.all([
            getDocs(query(collection(db, "enrollments"), where("courseId", "==", courseId))),
            getDocs(query(collection(db, "course_activity"), where("courseId", "==", courseId), orderBy("createdAt", "desc"), limit(20)))
          ]);
          for (const enrollmentDoc of enrollmentSnapshot.docs) {
            const enrollment = enrollmentDoc.data();
            enrollmentRows.push({ id: enrollmentDoc.id, ...enrollment, courseId });
            const studentId = String(enrollment.userId || "");
            if (studentId && !studentMap.has(studentId)) {
              const profile = await getDoc(doc(db, "users", studentId));
              if (profile.exists()) studentMap.set(studentId, { id: studentId, ...profile.data(), courseProgress: Number(enrollment.progress || 0) });
            } else if (studentId && studentMap.has(studentId)) {
              const existing = studentMap.get(studentId);
              existing.courseProgress = Math.max(Number(existing.courseProgress || 0), Number(enrollment.progress || 0));
            }
          }
          for (const activityDoc of activitySnapshot.docs) {
            const activity = activityDoc.data();
            activityRows.push({ id: activityDoc.id, ...activity, courseId, courseTitle: (courseById.get(courseId) as any)?.title || "Curso" });
          }
        }

        const sortedActivities = activityRows.sort((a, b) => {
          const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return bDate.getTime() - aDate.getTime();
        });
        const studentRows = Array.from(studentMap.values());
        const daily = Array.from({ length: 7 }).map((_, index) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - index));
          const key = date.toISOString().slice(0, 10);
          const matriculas = enrollmentRows.filter(row => {
            const created = row.createdAt?.toDate ? row.createdAt.toDate() : new Date(row.createdAt || 0);
            return Number.isFinite(created.getTime()) && created.toISOString().slice(0, 10) === key;
          }).length;
          const actividades = sortedActivities.filter(row => {
            const created = row.createdAt?.toDate ? row.createdAt.toDate() : new Date(row.createdAt || 0);
            return Number.isFinite(created.getTime()) && created.toISOString().slice(0, 10) === key;
          }).length;
          return { date: date.toLocaleDateString("es-ES", { weekday: "short" }), matriculas, actividades };
        });

        if (!active) return;
        setStats({ views: Number(coachDoc.data()?.viewCount || 0), favorites: favoritesSnapshot.size, enrollments: enrollmentRows.length });
        setStudents(studentRows);
        setRecentActivities(sortedActivities.slice(0, 6));
        setChartData(daily);
      } catch (error) {
        console.error("Coach analytics load failed:", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchStats();
    return () => { active = false; };
  }, [coachId]);

  const formatDate = (value: any) => {
    const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : "Fecha no disponible";
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-kirateal" size={32} /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="mb-4"><h3 className="text-xl font-black text-slate-800 tracking-tight">Analíticas de coaching</h3><p className="mt-1 text-sm text-slate-500">Actividad académica y datos reales de los cursos asignados a tu cuenta.</p></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AnalyticsStatCard icon={<Activity className="text-sky-500" />} label="Vistas de perfil" value={stats.views} />
        <AnalyticsStatCard icon={<BookOpen className="text-rose-500" />} label="Favoritos" value={stats.favorites} />
        <AnalyticsStatCard icon={<GraduationCap className="text-indigo-500" />} label="Matrículas" value={stats.enrollments} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3"><div className="rounded-lg bg-kirateal/10 p-2 text-kirateal"><TrendingUp size={20} /></div><div><h4 className="font-bold text-slate-800">Actividad académica · últimos 7 días</h4><p className="mt-1 text-xs text-slate-500">Matrículas y actividad de curso registrada; sin datos simulados.</p></div></div>
        <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" }} />
          <Area type="monotone" dataKey="matriculas" name="Matrículas" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.12} strokeWidth={3} />
          <Area type="monotone" dataKey="actividades" name="Actividades" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.12} strokeWidth={3} />
        </AreaChart></ResponsiveContainer></div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h4 className="mb-6 flex items-center gap-2 font-bold text-slate-800"><GraduationCap className="text-kirateal" size={18} /> Progreso de alumnos</h4>
          <div className="space-y-4">{students.length ? students.slice(0, 8).map(student => <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
            <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-bold text-slate-500">{student.photoURL ? <img src={student.photoURL} alt="" className="h-full w-full object-cover" /> : String(student.displayName || student.name || "U").slice(0, 1)}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{student.displayName || student.name || "Alumno"}</p><p className="truncate text-xs text-slate-500">{student.email || ""}</p></div></div>
            <span className="shrink-0 rounded-full bg-kirateal/10 px-2 py-1 text-xs font-bold text-kirateal">{Math.max(0, Math.min(100, Number(student.courseProgress || 0)))}%</span>
          </div>) : <p className="py-4 text-center text-sm italic text-slate-500">No hay alumnos inscritos aún.</p>}</div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h4 className="mb-6 flex items-center gap-2 font-bold text-slate-800"><BookOpen className="text-kirateal" size={18} /> Actividad de cursos</h4>
          <div className="space-y-3">{recentActivities.length ? recentActivities.map(activity => <div key={activity.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-slate-700">{activity.courseTitle}</span><span className="text-[10px] text-slate-400">{formatDate(activity.createdAt)}</span></div>
            <p className="mt-1 text-sm text-slate-600">{activity.action || activity.activityType || "Actividad registrada"}</p>
          </div>) : <p className="py-4 text-center text-sm italic text-slate-500">No hay actividad académica reciente.</p>}</div>
        </section>
      </div>
    </div>
  );
}

function AnalyticsStatCard({ icon, label, value }: any) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>{icon}</div><p className="mt-4 text-3xl font-black text-slate-900">{value}</p></div>;
}
