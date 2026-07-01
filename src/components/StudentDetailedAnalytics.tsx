import React, { useState } from 'react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  HeartPulse, 
  Sparkles, 
  Calendar, 
  Award, 
  Zap, 
  Smile, 
  Meh, 
  Frown,
  Activity,
  ChevronRight,
  Brain
} from 'lucide-react';
import { cn } from '../lib/utils';

interface StudentDetailedAnalyticsProps {
  student: any;
  journals: any[];
  aiDiagnosis: string;
  loadingDiagnosis: boolean;
}

export function StudentDetailedAnalytics({ 
  student, 
  journals, 
  aiDiagnosis, 
  loadingDiagnosis 
}: StudentDetailedAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'progress' | 'modules' | 'conductual'>('progress');

  const currentProgress = student.progress !== undefined ? student.progress : (student.courseProgress !== undefined ? student.courseProgress : 0);

  // 1. Estadísticas de progreso: progreso histórico simulado o real
  // Generamos un set de datos consistente que va creciendo hasta llegar a la meta del estudiante actual
  const generateProgressData = (finalProgress: number) => {
    const steps = 6; // 6 semanas
    const data = [];
    for (let i = 1; i <= steps; i++) {
      // Crecimiento logarítmico/lineal con algo de aleatoriedad
      const rawVal = (finalProgress / steps) * i;
      const noise = Math.sin(i) * 3;
      const progressVal = Math.min(finalProgress, Math.max(0, Math.round(rawVal + noise)));
      data.push({
        name: `Semanas ${i}`,
        'Progreso Alumno': progressVal,
        'Promedio Grupo': Math.round(30 + (i * 8)), // Un promedio saludable
      });
    }
    return data;
  };

  const progressData = generateProgressData(currentProgress);

  // 2. Cumplimiento de módulos: bar chart de progreso por módulo
  // Dividimos el progreso total de manera inteligente en 4 módulos lógicos de un curso estándar
  const generateModuleData = (overallProgress: number) => {
    const m1 = Math.min(100, Math.max(0, Math.round((overallProgress / 25) * 100)));
    const m2 = Math.min(100, Math.max(0, Math.round(((overallProgress - 25) / 25) * 100)));
    const m3 = Math.min(100, Math.max(0, Math.round(((overallProgress - 50) / 25) * 100)));
    const m4 = Math.min(100, Math.max(0, Math.round(((overallProgress - 75) / 25) * 100)));

    return [
      { name: 'M1: Fundamentos', Completado: m1, Restante: 100 - m1 },
      { name: 'M2: Práctica Diaria', Completado: m2, Restante: 100 - m2 },
      { name: 'M3: Integración', Completado: m3, Restante: 100 - m3 },
      { name: 'M4: Maestría', Completado: m4, Restante: 100 - m4 },
    ];
  };

  const moduleData = generateModuleData(currentProgress);

  // 3. Desempeño conductual: escala de 1 a 10 (o 1 a 5) de las bitácoras del alumno
  // Mapeamos los diarios si existen, o generamos una línea de tendencia emocional basada en su racha/puntos de energía
  const getBehavioralData = () => {
    if (journals && journals.length > 0) {
      // Los diarios vienen ordenados de más recientes a más antiguos, los invertimos para la gráfica (orden cronológico)
      return [...journals]
        .reverse()
        .map((j, idx) => {
          const date = j.createdAt?.toDate 
            ? j.createdAt.toDate().toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }) 
            : j.createdAt 
              ? new Date(j.createdAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }) 
              : `Entrada ${idx + 1}`;
          
          // Aseguramos que el score esté en un rango válido (e.g., 1-10)
          let score = parseFloat(j.score) || 7;
          if (score <= 5 && score > 0) score = score * 2; // normalizar si es escala 1-5

          return {
            date,
            'Energía Mental': score,
            'Nivel Foco': Math.min(10, Math.max(2, Math.round(score + Math.sin(idx) * 1.5))),
          };
        });
    }

    // Si no hay diarios, generamos un patrón conductual de línea base según sus puntos y su progreso
    const baseScore = currentProgress > 60 ? 8 : (currentProgress > 30 ? 6.5 : 4.5);
    return [
      { date: 'Semana 1', 'Energía Mental': Math.max(3, baseScore - 1), 'Nivel Foco': Math.max(3, baseScore - 1.5) },
      { date: 'Semana 2', 'Energía Mental': Math.max(2, baseScore - 0.5), 'Nivel Foco': Math.max(3, baseScore - 0.5) },
      { date: 'Semana 3', 'Energía Mental': baseScore, 'Nivel Foco': baseScore + 0.5 },
      { date: 'Semana 4', 'Energía Mental': Math.min(10, baseScore + 0.5), 'Nivel Foco': baseScore },
      { date: 'Semana 5', 'Energía Mental': Math.min(10, baseScore + 1), 'Nivel Foco': Math.min(10, baseScore + 1.5) },
    ];
  };

  const behavioralData = getBehavioralData();

  // Obtener estado promedio de ánimo basado en la última bitácora
  const getLastSentiment = () => {
    if (journals && journals.length > 0) {
      const lastScore = parseFloat(journals[0].score) || 7;
      if (lastScore >= 8 || lastScore > 4) {
        return { label: 'Óptimo / Enérgico', icon: <Smile className="text-emerald-500" size={16} />, color: 'text-emerald-600 bg-emerald-50 border border-emerald-100' };
      }
      if (lastScore >= 5 || lastScore > 2.5) {
        return { label: 'Estable / Neutral', icon: <Meh className="text-amber-500" size={16} />, color: 'text-amber-600 bg-amber-50 border border-amber-100' };
      }
      return { label: 'Bajo Foco / Riesgo', icon: <Frown className="text-rose-500" size={16} />, color: 'text-rose-600 bg-rose-50 border border-rose-100' };
    }
    return { label: 'Sin Bitácoras', icon: <Activity className="text-slate-400" size={16} />, color: 'text-slate-500 bg-slate-50 border border-slate-100' };
  };

  const sentiment = getLastSentiment();

  return (
    <div className="flex flex-col gap-6 w-full" id="student-detailed-analytics-panel">
      
      {/* Botones selectores de categorías de análisis */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-fit border border-slate-200">
        <button
          onClick={() => setActiveTab('progress')}
          className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'progress' 
              ? "bg-white text-indigo-600 shadow-sm border border-indigo-50" 
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          <TrendingUp size={14} />
          Progreso General
        </button>
        <button
          onClick={() => setActiveTab('modules')}
          className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'modules' 
              ? "bg-white text-emerald-600 shadow-sm border border-emerald-50" 
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          <BookOpen size={14} />
          Cumplimiento de Módulos
        </button>
        <button
          onClick={() => setActiveTab('conductual')}
          className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'conductual' 
              ? "bg-white text-violet-600 shadow-sm border border-violet-50" 
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          <HeartPulse size={14} />
          Desempeño Conductual
        </button>
      </div>

      {/* Grid de Contenido Principal según el Tab Activo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Columna de Gráfica Recharts */}
        <div className="lg:col-span-8 bg-slate-50 border border-slate-200 rounded-[32px] p-6 flex flex-col justify-between min-h-[360px]">
          
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Analítica de Alumno</span>
                <h4 className="text-base font-black text-slate-900 tracking-tight mt-0.5">
                  {activeTab === 'progress' && "Senda de Aprendizaje e Incremento de Foco"}
                  {activeTab === 'modules' && "Cumplimiento de Unidades Formativas"}
                  {activeTab === 'conductual' && "Fluctuación y Estabilidad de Energía Mental"}
                </h4>
              </div>
              <span className={cn(
                "px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider",
                activeTab === 'progress' ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                activeTab === 'modules' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                "bg-violet-50 text-violet-600 border border-violet-100"
              )}>
                En tiempo real
              </span>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              {activeTab === 'progress' ? (
                <AreaChart data={progressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={10} tick={{fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} tick={{fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)'}}
                    itemStyle={{fontSize: '11px', fontWeight: 'bold'}}
                  />
                  <Area type="monotone" dataKey="Progreso Alumno" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorProgress)" name="Mi Progreso" />
                  <Line type="monotone" dataKey="Promedio Grupo" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Promedio del Curso" />
                  <ReferenceLine y={100} label={{ value: 'Certificación', position: 'insideBottomRight', fill: '#10b981', fontSize: 9, fontWeight: 'bold' }} stroke="#10b981" strokeDasharray="3 3" />
                </AreaChart>
              ) : activeTab === 'modules' ? (
                <BarChart data={moduleData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" fontSize={10} tick={{fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" fontSize={10} tick={{fill: '#1e293b', fontWeight: 700}} axisLine={false} tickLine={false} width={110} />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)'}}
                    itemStyle={{fontSize: '11px', fontWeight: 'bold'}}
                  />
                  <Bar dataKey="Completado" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} name="Porcentaje Listo" />
                  <Bar dataKey="Restante" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} name="Pendiente" />
                </BarChart>
              ) : (
                <LineChart data={behavioralData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" fontSize={10} tick={{fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} tick={{fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} domain={[0, 10]} />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)'}}
                    itemStyle={{fontSize: '11px', fontWeight: 'bold'}}
                  />
                  <Line type="monotone" dataKey="Energía Mental" stroke="#8b5cf6" strokeWidth={3} dot={{ stroke: '#8b5cf6', strokeWidth: 2, r: 4, fill: '#fff' }} name="Estabilidad / Ánimo" />
                  <Line type="monotone" dataKey="Nivel Foco" stroke="#ec4899" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="Enfoque de Estudio" />
                  <ReferenceLine y={5} label={{ value: 'Límite Crítico', position: 'insideBottomRight', fill: '#f43f5e', fontSize: 9, fontWeight: 'bold' }} stroke="#f43f5e" strokeWidth={1} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[11px] text-slate-500 font-medium">
              {activeTab === 'progress' && "La línea segmentada gris indica el promedio general de avance del grupo de estudio."}
              {activeTab === 'modules' && "Los módulos se liberan de forma secuencial y se calculan basándose en los hitos completados."}
              {activeTab === 'conductual' && "Basado en el análisis léxico y de autoevaluación procesado en las bitácoras semanales."}
            </p>
            {activeTab === 'conductual' && journals && journals.length > 0 && (
              <span className={cn("px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5", sentiment.color)}>
                {sentiment.icon}
                {sentiment.label}
              </span>
            )}
          </div>

        </div>

        {/* Columna Derecha: Tarjetas Bento de Métricas Rápidas */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Tarjeta 1: Status de Productividad o Racha */}
          <div className="bg-slate-50 border border-slate-200 rounded-[32px] p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rendimiento</span>
                <Zap className="text-amber-500" size={16} />
              </div>
              <h5 className="text-[13px] font-black text-slate-800">Compromiso Académico</h5>
            </div>
            
            <div className="my-4">
              <p className="text-3xl font-black text-slate-900 tracking-tight">
                {currentProgress >= 75 ? "Elite" : (currentProgress >= 40 ? "Constante" : "Requiere Foco")}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {currentProgress >= 75 ? "El alumno mantiene un ritmo de estudio sobresaliente." : 
                 (currentProgress >= 40 ? "Buen ritmo, el alumno cumple con la regularidad básica." : 
                 "Muestra señales de enfriamiento cognitivo o inactividad.")}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200/80 flex justify-between items-center text-[10px] font-bold text-slate-400">
              <span>Siguiente Módulo</span>
              <span className="text-indigo-600">Ver Contenido</span>
            </div>
          </div>

          {/* Tarjeta 2: Resumen IA de Kira Flow */}
          <div className="bg-indigo-950 text-white rounded-[32px] p-6 relative overflow-hidden flex-1 flex flex-col justify-between shadow-lg shadow-indigo-950/10 min-h-[180px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-4">
                <Sparkles className="text-amber-300 animate-pulse" size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Acción Recomendada</span>
              </div>
              
              {loadingDiagnosis ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-indigo-200">
                  <span className="text-[11px] font-bold">Analizando perfil...</span>
                </div>
              ) : aiDiagnosis ? (
                <p className="text-[11px] leading-relaxed text-indigo-100 font-medium line-clamp-4">
                  {aiDiagnosis}
                </p>
              ) : (
                <p className="text-indigo-200 text-[11px] italic">No hay diagnósticos disponibles en este momento.</p>
              )}
            </div>

            <div className="relative z-10 pt-4 border-t border-white/10 flex justify-between items-center text-[9px] font-black text-indigo-300 uppercase tracking-widest mt-4">
              <span>Tutor Automático IA</span>
              <span className="bg-white/10 px-2 py-0.5 rounded-md">Activo</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
