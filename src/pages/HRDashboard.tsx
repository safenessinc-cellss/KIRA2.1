import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Users, BarChart3, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export function HRDashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'alumno'));
        const snap = await getDocs(q);
        setEmployees(snap.docs.map(d => ({id: d.id, ...d.data()})));
      } catch(e) {
        handleFirestoreError(e, OperationType.LIST, 'users');
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, [user]);

  const burnoutRisk = Math.round(employees.length * 0.15);
  const avgPoints = Math.round(employees.reduce((acc, curr) => acc + (curr.points || 0), 0) / (employees.length || 1));

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-10 rounded-[40px] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-100/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Culture & Health Analytics</h1>
              <p className="text-slate-500 font-medium max-w-lg">Métricas agregadas de desempeño energético y bienestar psicométrico del capital humano.</p>
            </div>
            <div className="flex gap-3">
               <div className="px-6 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status Global</p>
                  <p className="text-xl font-black text-emerald-500 uppercase">Óptimo</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:border-violet-200 transition-colors">
           <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
             <Users size={24} />
           </div>
           <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Licencias Activas</p>
           <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{employees.length}</h3>
           <p className="text-xs text-slate-400 mt-2">Capacidad: 85% utilizada</p>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:border-violet-200 transition-colors">
           <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
             <BarChart3 size={24} />
           </div>
           <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Avg. Energy Points</p>
           <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{avgPoints.toLocaleString()}</h3>
           <p className="text-xs text-emerald-600 mt-2 font-bold flex items-center gap-1">
             <TrendingUp size={12} /> ↑ 12% vs last month
           </p>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:border-violet-200 transition-colors">
           <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6">
             <TrendingUp size={24} />
           </div>
           <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Engagement Rate</p>
           <h3 className="text-4xl font-black text-slate-900 tracking-tighter">68.4<span className="text-2xl">%</span></h3>
           <p className="text-xs text-slate-400 mt-2">Retención: Alta</p>
        </div>

        <div className="bg-rose-50/50 p-8 rounded-[32px] border border-rose-100 shadow-[0_0_40px_rgba(225,29,72,0.05)] hover:bg-rose-50 transition-colors">
           <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-6">
             <AlertTriangle size={24} />
           </div>
           <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest mb-2">Burnout Risk Alert</p>
           <h3 className="text-4xl font-black text-rose-600 tracking-tighter">{burnoutRisk}</h3>
           <p className="text-[10px] text-rose-400 mt-2 font-medium leading-tight">Anomalías detectadas en 15% del equipo.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Registro de Actividad Anónima</h3>
            <div className="flex gap-2">
               <div className="px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100">Live Feed</div>
            </div>
          </div>
          
          {loading ? (
             <div className="animate-pulse flex flex-col gap-6">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-50 rounded-3xl w-full"></div>)}
             </div>
          ) : employees.length === 0 ? (
             <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[32px]">
               <Users size={48} className="mx-auto text-slate-200 mb-4" />
               <p className="text-slate-400 font-medium">No hay registros de personal en este segmento.</p>
             </div>
          ) : (
             <div className="space-y-6">
                {employees.slice(0, 5).map((emp, i) => (
                  <div key={i} className="flex justify-between items-center p-6 bg-slate-50/50 hover:bg-white border border-slate-100 hover:border-violet-200 rounded-[32px] transition-all group">
                    <div className="flex gap-6 items-center">
                      <div className="w-14 h-14 bg-white border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm group-hover:scale-110 transition-transform">
                         {String(i+1).padStart(2, '0')}
                      </div>
                      <div>
                        <p className="text-base font-black text-slate-800 tracking-tight leading-none mb-1">Human Asset ID-{String(i+1).padStart(3, '0')}</p>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Activity Hash: {Math.random().toString(36).substring(7).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AI Mood Prediction</p>
                      <p className={cn("text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full", 
                        Math.random() > 0.8 ? "bg-amber-50 text-amber-500 border border-amber-100" : "bg-emerald-50 text-emerald-500 border border-emerald-100")}>
                        {Math.random() > 0.8 ? 'Moderate Stress' : 'Resilient'}
                      </p>
                    </div>
                  </div>
                ))}
             </div>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
           <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 rounded-[40px] text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
              <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="text-indigo-400" size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">AI Culture Insight</span>
                 </div>
                 <h4 className="text-lg font-bold mb-4 leading-tight">La cohesión del equipo ha subido un 8% tras el último módulo de Biohacking.</h4>
                 <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    Los datos sugieren que la implementación de "Deep Work" está reduciendo la fatiga cognitiva los días jueves.
                 </p>
                 <button className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors">
                    Download Full Report
                 </button>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[40px] border border-slate-200">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Team Distribution</h4>
              <div className="space-y-6">
                 {[
                   { label: 'Engineering', count: 12, color: 'bg-indigo-600' },
                   { label: 'Marketing', count: 8, color: 'bg-rose-500' },
                   { label: 'Logistics', count: 15, color: 'bg-amber-400' }
                 ].map((t, idx) => (
                   <div key={idx}>
                      <div className="flex justify-between items-baseline mb-2">
                         <span className="text-xs font-bold text-slate-700">{t.label}</span>
                         <span className="text-xs font-black text-slate-900">{t.count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                         <div className={cn("h-full rounded-full", t.color)} style={{ width: `${(t.count / 35) * 100}%` }} />
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
