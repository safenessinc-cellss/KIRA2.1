import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpen, GraduationCap, Users } from 'lucide-react';

export function CoachAnalytics({ coachId }: { coachId?: string }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ courses: 0, enrollments: 0, students: 0, averageProgress: 0 });
  const [students, setStudents] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!coachId) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const coursesSnap = await getDocs(query(collection(db, 'courses'), where('coachId', '==', coachId)));
        const courseDocs = coursesSnap.docs;
        const enrollments: any[] = [];
        for (const courseDoc of courseDocs) {
          const course = { id: courseDoc.id, ...courseDoc.data() } as any;
          const enrollmentSnap = await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', course.id)));
          enrollmentSnap.docs.forEach(enrollmentDoc => enrollments.push({
            id: enrollmentDoc.id,
            userId: enrollmentDoc.data().userId,
            studentName: enrollmentDoc.data().studentName || 'Alumno',
            studentAvatar: enrollmentDoc.data().studentAvatar || '',
            courseTitle: course.title || 'Curso',
            progress: Number(enrollmentDoc.data().progress || 0),
            createdAt: enrollmentDoc.data().createdAt
          }));
        }
        const roster = new Map<string, any>();
        for (const enrollment of enrollments) {
          if (!enrollment.userId) continue;
          const existing = roster.get(enrollment.userId) || {
            id: enrollment.userId,
            name: enrollment.studentName,
            photoURL: enrollment.studentAvatar,
            progressValues: [],
            courses: []
          };
          existing.progressValues.push(enrollment.progress);
          existing.courses.push(enrollment.courseTitle);
          roster.set(enrollment.userId, existing);
        }
        const studentList = Array.from(roster.values()).map(student => ({
          ...student,
          courseProgress: Math.round(student.progressValues.reduce((sum: number, value: number) => sum + value, 0) / Math.max(1, student.progressValues.length))
        }));
        const today = new Date();
        const days = Array.from({ length: 7 }, (_, index) => {
          const date = new Date(today);
          date.setHours(0, 0, 0, 0);
          date.setDate(date.getDate() - (6 - index));
          return { key: date.toISOString().slice(0, 10), date: date.toLocaleDateString('es-ES', { weekday: 'short' }), enrollments: 0 };
        });
        for (const enrollment of enrollments) {
          const rawDate = enrollment.createdAt?.toDate ? enrollment.createdAt.toDate() : new Date(enrollment.createdAt || 0);
          if (Number.isNaN(rawDate.getTime())) continue;
          const day = days.find(item => item.key === rawDate.toISOString().slice(0, 10));
          if (day) day.enrollments += 1;
        }
        const averageProgress = enrollments.length ? Math.round(enrollments.reduce((sum, item) => sum + item.progress, 0) / enrollments.length) : 0;
        if (!cancelled) {
          setStudents(studentList);
          setStats({ courses: courseDocs.length, enrollments: enrollments.length, students: studentList.length, averageProgress });
          setChartData(days);
        }
      } catch (error) {
        console.error('Coach analytics could not be loaded:', error);
        if (!cancelled) { setStudents([]); setStats({ courses: 0, enrollments: 0, students: 0, averageProgress: 0 }); setChartData([]); }
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [coachId]);

  if (loading) return <div className="flex items-center justify-center py-20 text-sm text-slate-500">Cargando analítica real…</div>;

  return <div className="space-y-6">
    <div><h3 className="text-xl font-black text-slate-900">Analítica de tus cursos</h3><p className="mt-1 text-sm text-slate-500">Indicadores calculados a partir de cursos y matrículas reales. No se leen diarios privados ni se generan tendencias simuladas.</p></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat icon={<BookOpen size={19}/>} label="Cursos" value={stats.courses}/>
      <Stat icon={<GraduationCap size={19}/>} label="Matrículas" value={stats.enrollments}/>
      <Stat icon={<Users size={19}/>} label="Alumnos" value={stats.students}/>
      <Stat icon={<GraduationCap size={19}/>} label="Progreso medio" value={stats.averageProgress + '%'}/>
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h4 className="font-bold text-slate-900">Nuevas matrículas · últimos 7 días</h4>
      {stats.enrollments === 0 ? <p className="py-12 text-center text-sm text-slate-500">Todavía no hay matrículas para mostrar.</p> : <div className="mt-4 h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="enrollments" name="Matrículas" fill="#0d9488" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h4 className="mb-4 font-bold text-slate-900">Progreso de alumnos</h4>
      {students.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No hay alumnos inscritos en tus cursos.</p> : <div className="space-y-3">{students.map(student => <div key={student.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><div className="h-10 w-10 overflow-hidden rounded-full bg-slate-200">{student.photoURL ? <img src={student.photoURL} alt="" className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-sm font-bold text-slate-500">{student.name.slice(0,1).toUpperCase()}</div>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{student.name}</p><p className="truncate text-xs text-slate-500">{student.courses.join(' · ')}</p></div><span className="text-xs font-black text-kirateal">{student.courseProgress}%</span></div>)}</div>}
    </section>
  </div>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">{icon}</div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-3xl font-black text-slate-900">{value}</p></div>;
}
