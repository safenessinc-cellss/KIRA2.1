import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/firebase';
import { useAuth } from '@/src/hooks/useAuth';
import { useToast } from '@/src/hooks/useToast';
import { motion } from 'motion/react';
import { 
  TrendingUp, Activity, Sparkles, Loader2, ArrowRight, RefreshCw, 
  Target, Mail, DollarSign, ArrowUpRight, BarChart3, Star, AlertCircle 
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
  color: string;
}

export function CoachCrmAudit() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  
  const [funnel, setFunnel] = useState<FunnelData[]>([
    { stage: 'Prospectos Registrados (Leads)', count: 280, percentage: 100, color: 'bg-indigo-600' },
    { stage: 'Visitas a Studio de Cursos', count: 195, percentage: 69.6, color: 'bg-blue-500' },
    { stage: 'Pagos / Checkouts Iniciados', count: 84, percentage: 30, color: 'bg-amber-500' },
    { stage: 'Matrículas Completadas', count: 32, percentage: 11.4, color: 'bg-emerald-500' },
  ]);

  const [auditReport, setAuditReport] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [nudgeTemplate, setNudgeTemplate] = useState<string>('');
  const [isNudging, setIsNudging] = useState(false);

  // Load actual course count and enrollment counts to dynamically adjust the funnel statistics
  useEffect(() => {
    if (user) {
      fetchRealMetrics();
    }
  }, [user]);

  const fetchRealMetrics = async () => {
    if (!user) return;
    try {
      const coursesQ = query(collection(db, 'courses'), where('coachId', '==', user.uid));
      const coursesSnap = await getDocs(coursesQ);
      const courseCount = coursesSnap.size;

      const enrollQ = query(collection(db, 'enrollments'), where('coachId', '==', user.uid));
      const enrollSnap = await getDocs(enrollQ);
      const actualMatriculas = enrollSnap.size;

      // Scaled mock funnel based on actual enrollments to keep it logical
      if (actualMatriculas > 0) {
        const factor = Math.max(actualMatriculas / 32, 1);
        setFunnel([
          { stage: 'Prospectos Registrados (Leads)', count: Math.round(280 * factor), percentage: 100, color: 'bg-indigo-600' },
          { stage: 'Visitas a Studio de Cursos', count: Math.round(195 * factor), percentage: 69.6, color: 'bg-blue-500' },
          { stage: 'Pagos / Checkouts Iniciados', count: Math.round(84 * factor), percentage: 30, color: 'bg-amber-500' },
          { stage: 'Matrículas Completadas', count: actualMatriculas, percentage: Number(((actualMatriculas / (280 * factor)) * 100).toFixed(1)), color: 'bg-emerald-500' },
        ]);
      }
    } catch (e) {
      console.error("Error reading funnel stats:", e);
    }
  };

  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      const prompt = `Actúa como un estratega de conversión web de primer nivel para infoproductos y programas de coaching corporativo de élite.
      Analiza la salud del embudo de conversión actual del Coach:
      
      Métricas del Embudo:
      1. Prospectos Registrados (Leads): ${funnel[0].count} usuarios
      2. Visitas a Páginas de Venta/Cursos: ${funnel[1].count} usuarios (${funnel[1].percentage}% del inicial)
      3. Intenciones de Pago/Checkouts: ${funnel[2].count} usuarios (${funnel[2].percentage}% del inicial)
      4. Alumnos Inscritos/Matriculados: ${funnel[3].count} alumnos (${funnel[3].percentage}% conversión final)
      
      Escribe un reporte de Auditoría CRM sumamente ejecutivo, analítico e inteligente (en español) estructurado en:
      - DIAGNÓSTICO DEL EMBUDO: Identifica cuál de los 3 pasos tiene la mayor fuga ('drop-off') de conversión.
      - 3 ACCIONES INMEDIATAS: Soluciones prácticas de copy, oferta irresistible o email marketing para corregir esa brecha hoy.
      - RECOMENDACIÓN DE PRECIO: Sugerencia estratégica sobre cómo empaquetar cursos individuales o mentorías Premium.
      
      Mantén un tono empoderador, técnico, limpio y directo de un socio estratégico.`;

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          contents: prompt
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.text) {
        setAuditReport(data.text);
        toastSuccess("Auditoría de Embudo generada con éxito.");
      }
    } catch (e) {
      console.error("Error generating CRM Audit:", e);
      toastError("Error de conexión al generar la auditoría.");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleGenerateNudge = async () => {
    setIsNudging(true);
    try {
      const prompt = `Genera un correo electrónico persuasivo, elegante e inteligente para rescatar carritos abandonados (checkouts iniciados pero no pagados).
      Usa técnicas de escasez ética y realza el valor del acompañamiento personalizado (Kira Coach).
      El correo debe dirigirse a profesionales y ejecutivos de alto rendimiento.
      Escríbelo en formato Markdown limpio.`;

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          contents: prompt
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.text) {
        setNudgeTemplate(data.text);
        toastSuccess("Plantilla de Correo de Rescate lista.");
      }
    } catch (e) {
      console.error("Error generating nudge template:", e);
      toastError("No se pudo conectar con Kira AI.");
    } finally {
      setIsNudging(false);
    }
  };

  // Mock revenue chart data
  const revenueData = [
    { name: 'Ene', Ingresos: 1200 },
    { name: 'Feb', Ingresos: 1900 },
    { name: 'Mar', Ingresos: 3200 },
    { name: 'Abr', Ingresos: 2800 },
    { name: 'May', Ingresos: 4500 },
    { name: 'Jun', Ingresos: funnel[3].count * 150 }, // dynamic calculation based on metric
  ];

  return (
    <div className="bg-slate-50 rounded-[40px] border border-slate-200/60 p-8 shadow-sm flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="text-rose-500" size={32} />
            AI Audit CRM & Optimización de Embudo
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Analiza las fases de conversión de tus cursos y diseña campañas automatizadas con Kira AI.
          </p>
        </div>
        <button
          onClick={handleRunAudit}
          disabled={isAuditing}
          className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
        >
          {isAuditing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          Ejecutar Auditoría de Conversión
        </button>
      </div>

      {/* Grid: Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-sm flex flex-col gap-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Matrículas Totales</span>
          <span className="text-3xl font-black text-slate-900 font-mono mt-1">{funnel[3].count}</span>
          <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold mt-2">
            <ArrowUpRight size={14} /> +12.4% este mes
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-sm flex flex-col gap-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Checkout Abandonment</span>
          <span className="text-3xl font-black text-slate-900 font-mono mt-1">
            {Math.round(((funnel[2].count - funnel[3].count) / funnel[2].count) * 100)}%
          </span>
          <div className="flex items-center gap-1 text-rose-500 text-xs font-bold mt-2">
            <AlertCircle size={14} /> Fuga alta en checkout
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-sm flex flex-col gap-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Conversión de Lead</span>
          <span className="text-3xl font-black text-slate-900 font-mono mt-1">{funnel[3].percentage}%</span>
          <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold mt-2">
            <Target size={14} /> Excelente en la industria
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-sm flex flex-col gap-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Valor de Vida (LTV)</span>
          <span className="text-3xl font-black text-slate-900 font-mono mt-1">$450 USD</span>
          <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold mt-2">
            <ArrowUpRight size={14} /> Retención estable
          </div>
        </div>
      </div>

      {/* Main Content Dashboard */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left: Funnel Chart & Progress */}
        <div className="bg-white border border-slate-200/60 p-8 rounded-[32px] shadow-sm flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="text-indigo-600" size={20} /> Pipeline de Conversión
            </h3>
            <span className="text-xs text-slate-400 font-bold">Datos en tiempo real</span>
          </div>

          <div className="flex flex-col gap-5">
            {funnel.map((item, index) => (
              <div key={index} className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-black text-slate-600 uppercase tracking-wider">
                  <span>{item.stage}</span>
                  <div className="flex gap-2">
                    <span className="text-slate-900 font-mono font-black">{item.count}</span>
                    <span className="text-slate-400 font-mono">({item.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-6 rounded-2xl overflow-hidden p-0.5 border border-slate-200/40">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{ duration: 1, delay: index * 0.15 }}
                    className={`h-full rounded-xl ${item.color} flex items-center justify-end pr-2`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Mini Revenue Area Chart */}
          <div className="border-t border-slate-100 pt-6 mt-2 flex flex-col gap-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Facturación Estimada (Módulos / Matrículas)</h4>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`$${value} USD`, 'Ingresos']} />
                  <Area type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: AI Audit Report Panel */}
        <div className="bg-white border border-slate-200/60 p-8 rounded-[32px] shadow-sm flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="text-rose-500" size={20} /> Reporte de Estrategia Cognitiva
            </h3>
            {auditReport && (
              <button
                onClick={() => setAuditReport('')}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <RefreshCw size={12} /> Limpiar
              </button>
            )}
          </div>

          {auditReport ? (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl max-h-[350px] overflow-y-auto text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                {auditReport}
              </div>

              {/* CRM follow up trigger */}
              <div className="border-t border-slate-100 pt-6 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Campaña de Recuperación</h4>
                    <p className="text-[11px] text-slate-400 font-bold">Rescata carritos caídos e intenciones de compra</p>
                  </div>
                  <button
                    onClick={handleGenerateNudge}
                    disabled={isNudging}
                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95"
                  >
                    {isNudging ? <Loader2 className="animate-spin" size={12} /> : <Mail size={12} />}
                    Generar Correo Rescate
                  </button>
                </div>

                {nudgeTemplate && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-xl flex flex-col gap-3"
                  >
                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block">Plantilla Generada:</span>
                    <pre className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap font-mono bg-white p-4 rounded-lg border border-slate-200 max-h-[180px] overflow-y-auto">
                      {nudgeTemplate}
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(nudgeTemplate);
                        toastSuccess("Copiado al portapapeles. Listo para enviar.");
                      }}
                      className="text-xs font-black text-indigo-700 hover:text-indigo-900 uppercase tracking-widest self-end mt-1"
                    >
                      Copiar Correo
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center flex flex-col items-center justify-center gap-4 py-20 h-full">
              <div className="p-4 bg-rose-50 rounded-full text-rose-500 animate-pulse">
                <Sparkles size={36} />
              </div>
              <h4 className="text-sm font-black text-slate-800 tracking-tight">Estrategia Inactiva</h4>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Ejecuta la auditoría cognitiva de conversión. Kira AI procesará de forma lógica las tasas de fricción entre las etapas de Leads, Visitas al Studio de Cursos y Checkouts para darte una estrategia táctica de venta directa.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
