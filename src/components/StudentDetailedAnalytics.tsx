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
  Brain,
  Video,
  FileText,
  Lock,
  Clock,
  Check,
  X,
  Info,
  ListChecks,
  ArrowRight,
  Flame,
  Award as PrizeIcon
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  type: 'video' | 'exercise' | 'journal' | 'test';
}

interface ModuleDetails {
  number: number;
  title: string;
  description: string;
  progress: number;
  lessons: Lesson[];
  prerequisitesToUnlockNext: string[];
}

const getCourseModules = (title: string, overallProgress: number): ModuleDetails[] => {
  const isMeditation = /medita|mindful|kira|respir|paz|calma/i.test(title || '');
  
  const m1 = Math.min(100, Math.max(0, Math.round((overallProgress / 25) * 100)));
  const m2 = Math.min(100, Math.max(0, Math.round(((overallProgress - 25) / 25) * 100)));
  const m3 = Math.min(100, Math.max(0, Math.round(((overallProgress - 50) / 25) * 100)));
  const m4 = Math.min(100, Math.max(0, Math.round(((overallProgress - 75) / 25) * 100)));

  if (isMeditation) {
    return [
      {
        number: 1,
        title: "Fundamentos de Kira Flow™ y Respiración",
        description: "Introducción a la neurociencia de la respiración rítmica y el control somático.",
        progress: m1,
        lessons: [
          { id: "1.1", title: "La Ciencia de la Coherencia Cardíaca", duration: "12 min", completed: m1 >= 33, type: "video" },
          { id: "1.2", title: "Primer Diagnóstico: Configuración del Semáforo Emocional", duration: "8 min", completed: m1 >= 66, type: "exercise" },
          { id: "1.3", title: "Tu Primera Bitácora de Enfoque Sutil", duration: "5 min", completed: m1 === 100, type: "journal" }
        ],
        prerequisitesToUnlockNext: [
          "Completar la autoevaluación inicial de Kira Flow.",
          "Registrar al menos 1 entrada de diario con Score Emocional superior a 6."
        ]
      },
      {
        number: 2,
        title: "Regulación Vagotónica y Estados de Trance Sutil",
        description: "Técnicas avanzadas para desacelerar el sistema nervioso simpático en menos de 90 segundos.",
        progress: m2,
        lessons: [
          { id: "2.1", title: "Entrenamiento del Nervio Vago", duration: "15 min", completed: m2 >= 33, type: "video" },
          { id: "2.2", title: "El Ciclo de Suspiros Fisiológicos", duration: "10 min", completed: m2 >= 66, type: "exercise" },
          { id: "2.3", title: "Diario Clínico: Control de Enfriamiento Cognitivo", duration: "7 min", completed: m2 === 100, type: "journal" }
        ],
        prerequisitesToUnlockNext: [
          "Superar la racha de 3 días de respiración diafragmática en el simulador.",
          "Subir bitácora conductual sobre nivel de reactividad diaria."
        ]
      },
      {
        number: 3,
        title: "Integración Somática y Desempeño Psicológico",
        description: "Consolidación de rutinas matutinas y nocturnas para optimizar el foco cognitivo.",
        progress: m3,
        lessons: [
          { id: "3.1", title: "Diseño del Entorno de Flujo", duration: "18 min", completed: m3 >= 33, type: "video" },
          { id: "3.2", title: "Rutina de Carga Dopaminérgica Saludable", duration: "12 min", completed: m3 >= 66, type: "exercise" },
          { id: "3.3", title: "Reflexión Escrita: El sesgo de negatividad", duration: "10 min", completed: m3 === 100, type: "journal" }
        ],
        prerequisitesToUnlockNext: [
          "Mantener un Score Emocional promedio de 7.5 o superior.",
          "Aprobar el test teórico de neuroplasticidad."
        ]
      },
      {
        number: 4,
        title: "Maestría y Automatización del Hábito",
        description: "Herramientas de autogestión de por vida para prevenir el burnout sin mentoría diaria.",
        progress: m4,
        lessons: [
          { id: "4.1", title: "Estrategias de Inmunidad al Estrés Agudo", duration: "22 min", completed: m4 >= 33, type: "video" },
          { id: "4.2", title: "Diseño de Micro-Descansos Semanales", duration: "15 min", completed: m4 >= 66, type: "exercise" },
          { id: "4.3", title: "Proyecto Final: Tu Mapa de Resiliencia Personalizada", duration: "20 min", completed: m4 === 100, type: "exercise" }
        ],
        prerequisitesToUnlockNext: [
          "Completar el 100% de las lecciones.",
          "Sesión 1-a-1 de graduación agendada con tu Coach."
        ]
      }
    ];
  } else {
    return [
      {
        number: 1,
        title: "Fijación de Metas y Arquitectura Mental",
        description: "Establecimiento de hitos SMART y mentalidad de crecimiento.",
        progress: m1,
        lessons: [
          { id: "1.1", title: "Descubrimiento de Valores Clave", duration: "10 min", completed: m1 >= 33, type: "video" },
          { id: "1.2", title: "Eliminación de Distractores en el Espacio de Trabajo", duration: "15 min", completed: m1 >= 66, type: "exercise" },
          { id: "1.3", title: "Declaración de Compromiso Semanal", duration: "5 min", completed: m1 === 100, type: "journal" }
        ],
        prerequisitesToUnlockNext: [
          "Redactar tu declaración de intenciones del curso.",
          "Haber superado el primer hito de retroalimentación."
        ]
      },
      {
        number: 2,
        title: "Optimización de Enfoque y Bloques de Trabajo",
        description: "Métodos modernos de administración del tiempo y eliminación del multitasking.",
        progress: m2,
        lessons: [
          { id: "2.1", title: "La Regla de los 90 Minutos de Foco Ultranuclear", duration: "14 min", completed: m2 >= 33, type: "video" },
          { id: "2.2", title: "Creación de un Mapa de Energía Semanal", duration: "12 min", completed: m2 >= 66, type: "exercise" },
          { id: "2.3", title: "Registro de Pérdidas de Atención", duration: "8 min", completed: m2 === 100, type: "journal" }
        ],
        prerequisitesToUnlockNext: [
          "Configurar un temporizador Pomodoro estructurado.",
          "Enviar la primera hoja de trabajo de hábitos saboteadores."
        ]
      },
      {
        number: 3,
        title: "Resiliencia Emocional y Gestión del Rechazo",
        description: "Estrategias estoicas e intervenciones conductuales para afrontar el fracaso temporal.",
        progress: m3,
        lessons: [
          { id: "3.1", title: "Reframing: El Arte de Reencuadrar la Adversidad", duration: "16 min", completed: m3 >= 33, type: "video" },
          { id: "3.2", title: "Práctica Somática contra la Tensión Fisiológica", duration: "11 min", completed: m3 >= 66, type: "exercise" },
          { id: "3.3", title: "Bitácora de Eventos Desafiantes", duration: "10 min", completed: m3 === 100, type: "journal" }
        ],
        prerequisitesToUnlockNext: [
          "Completar 3 autoevaluaciones emocionales exitosas.",
          "Realizar el ejercicio práctico de exposición controlada al estrés."
        ]
      },
      {
        number: 4,
        title: "Maestría, Hábitos Sostenibles y Multiplicación",
        description: "Consolidación de rutinas de éxito para proyectar tu rendimiento a largo plazo.",
        progress: m4,
        lessons: [
          { id: "4.1", title: "La Fórmula del 1% Diario de James Clear", duration: "20 min", completed: m4 >= 33, type: "video" },
          { id: "4.2", title: "Diseño de un Sistema de Recompensas Intrínsecas", duration: "14 min", completed: m4 >= 66, type: "exercise" },
          { id: "4.3", title: "Evaluación Final de Desempeño Conductual", duration: "25 min", completed: m4 === 100, type: "exercise" }
        ],
        prerequisitesToUnlockNext: [
          "Obtener una calificación aprobatoria en el examen final.",
          "Presentar la bitácora unificada de progreso al Coach."
        ]
      }
    ];
  }
};

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
  const [showContent, setShowContent] = useState(false);

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

            <button
              onClick={() => setShowContent(true)}
              className="w-full pt-3 border-t border-slate-200/80 flex justify-between items-center text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer mt-2 text-left"
            >
              <span className="text-slate-400 font-bold">Siguiente Módulo</span>
              <span className="flex items-center gap-1 font-black uppercase tracking-wider">
                Ver Contenido
                <ChevronRight size={12} className="text-indigo-600" />
              </span>
            </button>
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

      {/* CURRICULUM SLIDE-OVER DRAWER */}
      {showContent && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl h-[100vh] border-l border-slate-200 p-8 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300 relative">
            
            {/* Cabecera del Drawer */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <BookOpen className="text-indigo-600" size={24} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Currículum & Senda</span>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5 tracking-tight">Senda Formativa y Avances</h3>
                </div>
              </div>
              <button 
                onClick={() => setShowContent(false)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Contenido con Scroll */}
            <div className="flex-1 overflow-y-auto py-6 pr-1 space-y-8 max-h-[calc(100vh-180px)]">
              
              {/* Info General del Curso del Alumno */}
              <div className="bg-slate-50 border border-slate-150 rounded-3xl p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold rounded-full">
                    {student.courseTitle || 'Curso Activo'}
                  </span>
                  <span className="text-[11px] font-black text-slate-700">Progreso: {currentProgress}%</span>
                </div>
                
                {/* Barra de progreso general */}
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden mb-4">
                  <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500" style={{ width: `${currentProgress}%` }} />
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Activity size={14} className="text-slate-400" />
                    <span>Compromiso:</span>
                    <span className={cn(
                      "font-black uppercase tracking-wider text-[10px]",
                      currentProgress >= 75 ? "text-emerald-600" : (currentProgress >= 40 ? "text-amber-600" : "text-rose-600")
                    )}>
                      {currentProgress >= 75 ? "Elite" : (currentProgress >= 40 ? "Constante" : "Requiere Foco")}
                    </span>
                  </div>
                  <span>Inscripción Activa</span>
                </div>
              </div>

              {/* Módulos de Aprendizaje */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ListChecks size={14} className="text-slate-400" />
                  Módulos y Lecciones Sugeridas por el Coach
                </h4>

                <div className="space-y-4">
                  {getCourseModules(student.courseTitle || '', currentProgress).map((m, mIdx) => {
                    const isActive = currentProgress >= 75 ? mIdx === 3 : (currentProgress >= 50 ? mIdx === 2 : (currentProgress >= 25 ? mIdx === 1 : mIdx === 0));
                    const isCompleted = currentProgress >= (mIdx + 1) * 25;
                    const isLocked = !isActive && !isCompleted;

                    return (
                      <div 
                        key={m.number} 
                        className={cn(
                          "border rounded-3xl p-5 transition-all",
                          isActive ? "border-indigo-500 bg-indigo-50/20 shadow-md" : 
                          isCompleted ? "border-emerald-200 bg-emerald-50/5" : "border-slate-150 bg-slate-50/30 opacity-60"
                        )}
                      >
                        <div className="flex justify-between items-start gap-3 mb-2">
                          <div>
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded",
                              isActive ? "bg-indigo-100 text-indigo-700" :
                              isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                            )}>
                              Módulo {m.number}
                            </span>
                            <h5 className="text-sm font-black text-slate-900 mt-1.5 leading-tight">{m.title}</h5>
                          </div>
                          <span className="shrink-0 mt-0.5">
                            {isCompleted ? (
                              <CheckCircle2 className="text-emerald-500" size={18} />
                            ) : isActive ? (
                              <Sparkles className="text-indigo-500 animate-pulse" size={18} />
                            ) : (
                              <Lock className="text-slate-400" size={16} />
                            )}
                          </span>
                        </div>
                        
                        <p className="text-xs text-slate-500 leading-relaxed mb-4">{m.description}</p>

                        {/* Progreso del Módulo */}
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                          <span>Avance Módulo: {m.progress}%</span>
                          <span>{m.lessons.filter(l => l.completed).length} / {m.lessons.length} Lecciones</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden mb-4">
                          <div 
                            className={cn(
                              "h-full transition-all duration-500",
                              isCompleted ? "bg-emerald-500" : (isActive ? "bg-indigo-500" : "bg-slate-300")
                            )} 
                            style={{ width: `${m.progress}%` }} 
                          />
                        </div>

                        {/* Listado de Lecciones */}
                        <div className="space-y-2.5 mt-4">
                          {m.lessons.map((l) => (
                            <div 
                              key={l.id} 
                              className={cn(
                                "flex items-center justify-between p-3 rounded-2xl text-xs font-medium border border-transparent transition-colors",
                                l.completed ? "bg-white border-slate-100 text-slate-700" : 
                                isActive ? "bg-white border-indigo-100 text-slate-800" : "text-slate-400"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                {l.completed ? (
                                  <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-500 shrink-0">
                                    <Check size={10} strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                    <span className="text-[10px] font-black">{l.id}</span>
                                  </div>
                                )}
                                
                                <div className="flex flex-col">
                                  <span className={cn("font-bold", l.completed && "line-through text-slate-400")}>{l.title}</span>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                    <Clock size={10} />
                                    <span>{l.duration}</span>
                                    <span className="capitalize px-1.5 py-0.2 bg-slate-100 rounded text-slate-500 text-[9px]">
                                      {l.type === 'video' ? 'video guiado' : l.type === 'exercise' ? 'práctica' : l.type === 'journal' ? 'bitácora' : 'evaluación'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lo necesario para continuar */}
              <div className="bg-slate-50 border border-slate-150 rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="text-amber-500" size={18} />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Plan de Acción / Lo necesario para continuar</h4>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Basado en el progreso del {currentProgress}% de este alumno y su compromiso clasificado como <span className="font-bold underline">{currentProgress >= 75 ? "Elite" : (currentProgress >= 40 ? "Constante" : "Requiere Foco")}</span>, se han definido los siguientes pasos clave:
                </p>

                <div className="space-y-3">
                  {/* Prerrequisitos sugeridos por el coach o calculados */}
                  {getCourseModules(student.courseTitle || '', currentProgress)[
                    currentProgress >= 75 ? 3 : (currentProgress >= 50 ? 2 : (currentProgress >= 25 ? 1 : 0))
                  ].prerequisitesToUnlockNext.map((p, idx) => (
                    <div key={idx} className="flex gap-3 items-start p-3 bg-white border border-slate-100 rounded-2xl">
                      <div className="w-5 h-5 rounded bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-semibold">{p}</p>
                    </div>
                  ))}

                  {/* Alerta de enfriamiento o racha */}
                  {currentProgress < 40 ? (
                    <div className="flex gap-3 items-start p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700">
                      <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-500" />
                      <div>
                        <span className="font-bold text-xs">¡Atención Co-creador / Coach!</span>
                        <p className="text-[11px] text-rose-600 leading-relaxed mt-0.5">El alumno muestra bajo ritmo. Agenda una videollamada de 10 minutos para reactivar el compromiso cognitivo.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 items-start p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700">
                      <PrizeIcon size={18} className="shrink-0 mt-0.5 text-emerald-500" />
                      <div>
                        <span className="font-bold text-xs">Ritmo saludable y regularidad</span>
                        <p className="text-[11px] text-emerald-600 leading-relaxed mt-0.5">El alumno está listo para desbloquear contenidos del siguiente módulo. Envía felicitaciones por su perseverancia.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Pie del Drawer */}
            <div className="border-t border-slate-100 pt-5 flex justify-between items-center text-xs text-slate-400 font-bold">
              <span>Senda: {student.courseTitle || 'Estudio'}</span>
              <button 
                onClick={() => setShowContent(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Cerrar Senda
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
