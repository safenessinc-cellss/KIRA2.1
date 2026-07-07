import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { db } from '@/src/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Loader2, TrendingUp, TrendingDown, AlertCircle, Zap, Mail, ChevronRight, BarChart3, Sparkles } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function CoachCrmAudit() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState({
    prospects: 0,
    studioViews: 0,
    checkouts: 0,
    enrollments: 0
  });
  const [revenueHistory, setRevenueHistory] = useState<any[]>([]);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchPipelineStats();
    fetchRevenueHistory();
  }, [user]);

  const fetchPipelineStats = async () => {
    try {
      // Prospectos: Usuarios con rol 'alumno' que han visto el perfil del coach
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'alumno'));
      const usersSnap = await getDocs(usersQuery);
      const prospects = usersSnap.docs.filter(d => d.data().favorites?.includes(user?.uid)).length;

      // Visitas al Studio: Contador de vistas de cursos
      const coursesQuery = query(collection(db, 'courses'), where('coachId', '==', user?.uid));
      const coursesSnap = await getDocs(coursesQuery);
      let totalViews = 0;
      coursesSnap.docs.forEach(d => {
        totalViews += d.data().viewCount || 0;
      });

      // Checkouts: Compras iniciadas (transacciones pendientes)
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('coachId', '==', user?.uid),
        where('status', '==', 'pending')
      );
      const transactionsSnap = await getDocs(transactionsQuery);
      const checkouts = transactionsSnap.size;

      // Matrículas: Alumnos inscritos en cursos del coach
      const enrollQuery = query(collection(db, 'enrollments'), where('coachId', '==', user?.uid));
      const enrollSnap = await getDocs(enrollQuery);
      const enrollments = enrollSnap.size;

      setStats({
        prospects,
        studioViews: totalViews,
        checkouts,
        enrollments
      });
    } catch (error) {
      console.error("Error fetching pipeline stats:", error);
    }
  };

  const fetchRevenueHistory = async () => {
    // Simular datos históricos de ingresos para el gráfico
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const data = months.map((month, i) => ({
      month,
      ingresos: Math.floor(Math.random() * 2000) + 500 + (i * 300)
    }));
    setRevenueHistory(data);
  };

  const runAudit = async () => {
    if (!user) return;
    setIsGenerating(true);
    setAuditResult(null);

    try {
      // Calcular tasas de conversión
      const visitToCheckout = stats.prospects > 0 
        ? ((stats.checkouts / stats.prospects) * 100).toFixed(1) 
        : '0';
      const checkoutToEnroll = stats.checkouts > 0 
        ? ((stats.enrollments / stats.checkouts) * 100).toFixed(1) 
        : '0';
      const overallConversion = stats.prospects > 0 
        ? ((stats.enrollments / stats.prospects) * 100).toFixed(1) 
        : '0';

      const prompt = `
        Actúa como un consultor de growth hacking especializado en educación digital y coaching de alto rendimiento.
        
        Datos del embudo de conversión para el coach:
        - Prospectos (vistas de perfil): ${stats.prospects}
        - Visitas al Studio de Cursos: ${stats.studioViews}
        - Checkouts Iniciados: ${stats.checkouts}
        - Matrículas Completadas: ${stats.enrollments}
        
        Tasas de conversión:
        - Visitas → Checkout: ${visitToCheckout}%
        - Checkout → Matrícula: ${checkoutToEnroll}%
        - Conversión total: ${overallConversion}%
        
        Analiza estos datos y proporciona un diagnóstico detallado que incluya:
        
        1. PUNTO DE FRICCIÓN: Identifica el paso exacto del embudo donde se produce la mayor tasa de abandono y explica por qué ocurre (copywriting, precio, UX, etc.).
        
        2. 3 SOLUCIONES TÁCTICAS INMEDIATAS: 
           - Solución 1 (Copywriting): Redacta un nuevo texto persuasivo para el punto de fricción.
           - Solución 2 (Empaquetamiento): Sugiere cómo mejorar la oferta o el pricing.
           - Solución 3 (Recuperación): Propón una estrategia de re-engagement para prospectos abandonados.
        
        3. PLAN DE ACCIÓN DE 7 DÍAS: Lista de tareas concretas y calendarizadas para implementar las soluciones.
        
        Tono: profesional, directo, basado en datos y altamente accionable.
        Formato: texto en español, con títulos claros y viñetas.
      `;

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

      setAuditResult(data.text || 'No se pudo generar la auditoría.');
    } catch (error) {
      console.error("Error running audit:", error);
      setAuditResult('Error al generar la auditoría. Por favor, intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateRecoveryCampaign = async () => {
    if (!recoveryEmail.trim()) {
      alert('Por favor, escribe un mensaje de recuperación.');
      return;
    }

    try {
      // Guardar campaña de recuperación en Firestore
      await addDoc(collection(db, 'recovery_campaigns'), {
        coachId: user?.uid,
        message: recoveryEmail,
        target: 'abandoned_checkouts',
        status: 'draft',
        createdAt: new Date()
      });
      alert('¡Campaña de recuperación guardada exitosamente!');
      setRecoveryEmail('');
    } catch (error) {
      console.error("Error saving recovery campaign:", error);
      alert('Error al guardar la campaña.');
    }
  };

  const getConversionColor = (rate: number) => {
    if (rate > 30) return 'text-emerald-600';
    if (rate > 15) return 'text-amber-600';
    return 'text-rose-600';
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      {/* Cabecera */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="text-kirateal" size={20} />
              AI Audit CRM & Optimización de Embudo
            </h2>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Analiza tu pipeline de conversión y obtén recomendaciones tácticas de Kira AI.
            </p>
          </div>
          <button
            onClick={runAudit}
            disabled={isGenerating}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Sparkles size={18} />
            )}
            {isGenerating ? 'Analizando...' : 'Ejecutar Auditoría'}
          </button>
        </div>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prospectos</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{stats.prospects}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visitas al Studio</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{stats.studioViews}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Checkouts</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{stats.checkouts}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Matrículas</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{stats.enrollments}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Ingresos */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Histórico de Ingresos Proyectados (6 meses)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueHistory}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" fontSize={12} tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
              <YAxis fontSize={12} tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0'}}
                formatter={(value) => [`$${value}`, 'Ingresos']}
              />
              <Bar dataKey="ingresos" fill="#1ec6b6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resultado de Auditoría */}
      {auditResult && (
        <div className="bg-white p-8 rounded-2xl border border-kirateal/20 shadow-lg animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-kirateal/10 text-kirateal flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <h3 className="font-black text-slate-900">Diagnóstico de Kira AI</h3>
          </div>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
              {auditResult}
            </div>
          </div>
        </div>
      )}

      {/* Campaña de Recuperación */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="text-kirateal" size={20} />
          <h3 className="font-bold text-slate-900">Campaña de Recuperación</h3>
          <span className="text-xs text-slate-400 font-medium">Prospectos que abandonaron checkout</span>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <textarea
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
            placeholder="Escribe el mensaje de recuperación para los prospectos abandonados..."
            className="flex-1 h-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-kirateal/20 outline-none"
          />
          <button
            onClick={generateRecoveryCampaign}
            className="px-6 py-3 bg-kirateal text-white rounded-xl font-bold hover:bg-kirateal-dark transition-all shadow-lg shadow-kirateal/20 self-end"
          >
            Guardar Campaña
          </button>
        </div>
        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-xs text-slate-500">
            <span className="font-bold">💡 Tip:</span> Los mensajes de recuperación con un descuento personalizado o un testimonio social tienen 40% más de conversión.
          </p>
        </div>
      </div>
    </div>
  );
}
