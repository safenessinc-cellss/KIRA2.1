import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { Activity, HeartPulse, GraduationCap, Sparkles, TrendingUp, Loader2, BookOpen } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export function CoachAnalytics({ coachId }: { coachId?: string }) {
  const [stats, setStats] = useState({
    views: 0,
    favorites: 0,
    enrollments: 0,
    zapsGenerated: 0
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [recentJournals, setRecentJournals] = useState<any[]>([]);

  useEffect(() => {
    if (!coachId) return;

    const fetchStats = async () => {
      try {
        // 1. Get views from coach doc
        const coachDoc = await getDoc(doc(db, 'users', coachId));
        const views = coachDoc.data()?.viewCount || 0;

        // 2. Get favorites count by querying users
        const favsQuery = query(collection(db, 'users'), where('favorites', 'array-contains', coachId));
        const favsSnap = await getDocs(favsQuery);
        const favorites = favsSnap.size;

        // 3. Get enrollments for this coach's courses
        const coursesQuery = query(collection(db, 'courses'), where('coachId', '==', coachId));
        const coursesSnap = await getDocs(coursesQuery);
        const coachCourseIds = coursesSnap.docs.map(d => d.id);
        
        let enrollments = 0;
        let studentsList: any[] = [];
        if (coachCourseIds.length > 0) {
           const enrollQuery = query(collection(db, 'enrollments'), where('courseId', 'in', coachCourseIds));
           const enrollSnap = await getDocs(enrollQuery);
           enrollments = enrollSnap.size;
           
           // Get students progress
           const studentsMap = new Map();
           for (const eDoc of enrollSnap.docs) {
             const sId = eDoc.data().userId;
             if (!studentsMap.has(sId)) {
               const sProfile = await getDoc(doc(db, 'users', sId));
               if (sProfile.exists()) {
                 studentsMap.set(sId, { id: sId, ...sProfile.data(), courseProgress: eDoc.data().progress || 0 });
               }
             }
           }
           studentsList = Array.from(studentsMap.values());
        }

        setStudents(studentsList);

        // Fetch recent journals from these students
        if (studentsList.length > 0) {
          const studentIds = studentsList.map(s => s.id);
          // Firestore 'in' has a limit, we just limit to 10 max or chunk. Let's do chunk of 10.
          const idsChunk = studentIds.slice(0, 10);
          const jq = query(collection(db, 'journals'), where('userId', 'in', idsChunk), orderBy('createdAt', 'desc'), limit(5));
           try {
             const jSnap = await getDocs(jq);
             const jdocs = await Promise.all(jSnap.docs.map(async d => {
                const data = d.data();
                // Find student name
                const stu = studentsList.find(s => s.id === data.userId);
                return { id: d.id, ...data, studentName: stu?.name || 'Alumno' };
             }));
             setRecentJournals(jdocs);
           } catch {
             // Index might be missing, ignoring journals gracefully 
           }
        }

        // Generate mock chart data (past 7 days)
        const mockChart = Array.from({length: 7}).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return {
            date: d.toLocaleDateString('es-ES', { weekday: 'short' }),
            visitas: Math.floor(Math.random() * 50) + (i * 10),
            zaps: Math.floor(Math.random() * 100) + (i * 20)
          };
        });
        setChartData(mockChart);

        setStats({
          views,
          favorites,
          enrollments,
          zapsGenerated: Math.floor(views * 1.5 + enrollments * 10)
        });
      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [coachId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="animate-spin text-kirateal" size={32} />
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="mb-4">
         <h3 className="text-xl font-black text-slate-800 tracking-tight">Analíticas Élite</h3>
         <p className="text-sm text-slate-500 mt-1">Monitorea el impacto de tu consciencia en la comunidad.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <AnalyticsStatCard 
           icon={<Activity className="text-sky-500" />} 
           label="Vistas de Perfil" 
           value={stats.views} 
           trend="+12%" 
           color="sky" 
         />
         <AnalyticsStatCard 
           icon={<HeartPulse className="text-rose-500" />} 
           label="Favoritos" 
           value={stats.favorites} 
           trend="+5" 
           color="rose" 
         />
         <AnalyticsStatCard 
           icon={<GraduationCap className="text-indigo-500" />} 
           label="Alumnos Inscritos" 
           value={stats.enrollments} 
           trend="+2" 
           color="indigo" 
         />
         <AnalyticsStatCard 
           icon={<Sparkles className="text-kiragold" />} 
           label="Impacto (Zaps)" 
           value={stats.zapsGenerated} 
           trend="Epic" 
           color="gold" 
         />
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
         <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-kirateal/10 rounded-lg text-kirateal">
               <TrendingUp size={20} />
            </div>
            <h4 className="font-bold text-slate-800">Crecimiento y Zaps (7 Días)</h4>
         </div>
         <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorZaps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                  labelStyle={{ color: '#64748b', fontSize: '12px', marginBottom: '8px' }}
                />
                <Area type="monotone" dataKey="zaps" name="Zaps" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorZaps)" />
                <Area type="monotone" dataKey="visitas" name="Visitas" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorVisits)" />
              </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Progress */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="text-kirateal" size={18} />
              Progreso de Alumnos
            </h4>
          </div>
          <div className="space-y-4">
            {students.length > 0 ? students.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                     {s.photoUrl ? <img src={s.photoUrl} alt="Avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">{s.name?.[0] || 'U'}</div>}
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-800">{s.name || 'Usuario'}</p>
                     <p className="text-xs text-slate-500 line-clamp-1">{s.email}</p>
                   </div>
                 </div>
                 <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-kirateal bg-kirateal/10 px-2 py-1 rounded-full">{s.courseProgress}% Completado</span>
                 </div>
              </div>
            )) : (
              <p className="text-sm text-slate-500 italic text-center py-4">No hay alumnos inscritos aún.</p>
            )}
          </div>
        </div>

        {/* Recent Journals */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="text-kiragold" size={18} />
              Últimas Entradas (IA)
            </h4>
          </div>
          <div className="space-y-4">
             {recentJournals.length > 0 ? recentJournals.map(j => (
               <div key={j.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                     <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">{j.studentName}</span>
                     <span className={cn(
                       "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                       j.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-700' :
                       j.sentiment === 'negative' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
                     )}>
                       {j.sentiment || 'neutral'}
                     </span>
                  </div>
                  <p className="text-sm text-slate-600 italic line-clamp-2">"{j.content}"</p>
               </div>
             )) : (
               <p className="text-sm text-slate-500 italic text-center py-4">Sin entradas de diario recientes.</p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsStatCard({ icon, label, value, trend, color }: any) {
  const colors: any = {
    sky: "bg-sky-50 text-sky-600",
    rose: "bg-rose-50 text-rose-600",
    indigo: "bg-indigo-50 text-indigo-600",
    gold: "bg-kiragold/10 text-kiragold"
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
       <div className="flex justify-between items-start mb-4">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors[color])}>
             {icon}
          </div>
          <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", colors[color])}>{trend}</span>
       </div>
       <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
       <h4 className="text-2xl font-black text-slate-900">{value.toLocaleString()}</h4>
    </div>
  );
}
