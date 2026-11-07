// src/pages/coach/CoachCrmAudit.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { auth, db } from '@/src/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { 
  Loader2, TrendingUp, TrendingDown, AlertCircle, Zap, Mail, 
  ChevronRight, BarChart3, Sparkles, Users, DollarSign, 
  Eye, ShoppingCart, CheckCircle2, Target, Rocket, Brain,
  Send, Clock, ArrowRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/hooks/useToast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface FunnelData {
  stage: string;
  count: number;
  conversion: number;
}

export function CoachCrmAudit() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<{
    prospects: number;
    studioViews: number;
    checkouts: number | null;
    enrollments: number;
    revenue: number | null;
    financialAvailable: boolean;
  }>({
    prospects: 0,
    studioViews: 0,
    checkouts: null,
    enrollments: 0,
    revenue: null,
    financialAvailable: false,
  });
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [revenueHistory, setRevenueHistory] = useState<any[]>([]);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'recovery'>('overview');

  useEffect(() => {
    if (!user) return;
    fetchPipelineStats();
  }, [user?.uid]);



  const fetchPipelineStats = async () => {
    setLoading(true);
    setMetricsError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Tu sesión ha expirado. Vuelve a iniciar sesión.');
      const response = await fetch('/api/coach/crm-metrics', { headers: { Authorization: 'Bearer ' + idToken } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las métricas del CRM.');
      const financialAvailable = data.financialAvailable === true;
      const prospects = Number(data.prospects) || 0;
      const studioViews = Number(data.studioViews) || 0;
      const enrollments = Number(data.enrollments) || 0;
      const checkouts = financialAvailable ? (Number(data.checkouts) || 0) : null;
      const revenue = financialAvailable ? (Number(data.revenue) || 0) : null;
      setStats({ prospects, studioViews, checkouts, enrollments, revenue, financialAvailable });
      setRevenueHistory(Array.isArray(data.revenueHistory) ? data.revenueHistory : []);
      const funnel: Array<{ stage: string; count: number; conversion: number }> = [
        { stage: 'Prospectos', count: prospects, conversion: prospects > 0 ? 100 : 0 },
        { stage: 'Visitas', count: studioViews, conversion: prospects > 0 ? Math.round((studioViews / prospects) * 100) : 0 },
      ];
      if (financialAvailable && checkouts !== null) {
        funnel.push({ stage: 'Checkouts', count: checkouts, conversion: studioViews > 0 ? Math.round((checkouts / studioViews) * 100) : 0 });
      }
      funnel.push({ stage: 'Matrículas', count: enrollments, conversion: studioViews > 0 ? Math.round((enrollments / studioViews) * 100) : 0 });
      setFunnelData(funnel);
    } catch (error: any) {
      console.error('Error fetching coach CRM metrics:', error);
      setMetricsError(error?.message || 'No se pudieron cargar métricas reales.');
      setStats({ prospects: 0, studioViews: 0, checkouts: null, enrollments: 0, revenue: null, financialAvailable: false });
      setFunnelData([]);
      setRevenueHistory([]);
    } finally {
      setLoading(false);
    }
  };



  const runAudit = async () => {
    if (!user) return;
    if (metricsError) { toastError('No hay datos CRM disponibles para analizar.'); return; }
    if (stats.prospects === 0 && stats.studioViews === 0 && stats.enrollments === 0 && !stats.financialAvailable) { setAuditResult('No hay datos CRM reales suficientes para generar un análisis. Registra actividad y vuelve a intentarlo.'); return; }
    setIsGenerating(true);
    setAuditResult(null);

    try {
      const { prospects, studioViews, checkouts, enrollments } = stats;
      
      const visitToCheckout = checkouts !== null && prospects > 0 ? ((checkouts / prospects) * 100).toFixed(1) : 'No disponible';
      const checkoutToEnroll = checkouts !== null && checkouts > 0 ? ((enrollments / checkouts) * 100).toFixed(1) : 'No disponible';
      const overallConversion = prospects > 0 ? ((enrollments / prospects) * 100).toFixed(1) : '0';

      const prompt = `
        Actúa como un consultor de growth hacking especializado en educación digital y coaching de alto rendimiento.
        
        Datos del embudo de conversión:
        - Prospectos (vistas de perfil): ${prospects}
        - Visitas al Studio de Cursos: ${studioViews}
        - Checkouts Iniciados: ${checkouts === null ? 'No disponible' : checkouts}
        - Matrículas Completadas: ${enrollments}
        
        Tasas de conversión:
        - Visitas → Checkout: ${visitToCheckout}%
        - Checkout → Matrícula: ${checkoutToEnroll}%
        - Conversión total: ${overallConversion}%
        
        Realiza un análisis profundo y proporciona:
        
        1. DIAGNÓSTICO DEL EMBUDO:
           - Identifica el punto exacto con mayor fricción
           - Explica por qué ocurre (copywriting, UX, precio, etc.)
        
        2. 3 SOLUCIONES TÁCTICAS INMEDIATAS:
           - Solución 1 (Copywriting): Redacta un nuevo texto persuasivo
           - Solución 2 (Empaquetamiento): Sugiere mejorar la oferta
           - Solución 3 (Recuperación): Estrategia de re-engagement
        
        3. PLAN DE ACCIÓN DE 7 DÍAS:
           - Lista de tareas concretas y calendarizadas
        
        4. ESCENARIO HIPOTÉTICO:
           - No inventes cifras ni presentes estimaciones como resultados reales. Si faltan datos, indica que no puede calcularse una proyección.
        
        Formato: Markdown en español, con títulos claros y viñetas.
      `;

      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Tu sesión ha expirado. Vuelve a iniciar sesión.');
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          contents: prompt
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Guardar auditoría en Firestore
      await addDoc(collection(db, 'audits'), {
        coachId: user.uid,
        type: 'crm_audit',
        result: data.text,
        stats: stats,
        createdAt: new Date()
      });

      setAuditResult(data.text || 'No se pudo generar la auditoría.');
      toastSuccess('✅ Auditoría completada');
    } catch (error) {
      console.error("Error running audit:", error);
      toastError('Error al generar la auditoría');
      setAuditResult('Error al generar la auditoría. Por favor, intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const sendRecoveryCampaign = async () => {
    if (!recoveryEmail.trim()) return;
    if (!user?.uid) { toastError('Inicia sesión para guardar el borrador.'); return; }
    setIsSendingRecovery(true);
    try {
      await addDoc(collection(db, 'recovery_campaigns'), {
        coachId: user.uid, message: recoveryEmail, target: 'abandoned_checkouts',
        status: 'draft', recipients: 0, createdAt: new Date(), deliveryConfigured: false,
      });
      toastSuccess('Borrador guardado. No se envió ningún correo.');
      setRecoveryEmail('');
    } catch (error) {
      console.error('Error saving recovery campaign draft:', error);
      toastError('No se pudo guardar el borrador.');
    } finally { setIsSendingRecovery(false); }
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Brain className="text-kirateal" size={24} />
              AI Audit CRM
            </h1>
            <p className="text-slate-500 text-sm">Optimiza tu embudo de conversión con inteligencia artificial</p>
          </div>
          <button
            onClick={runAudit}
            disabled={isGenerating}
            className="px-6 py-3 bg-gradient-to-r from-kirateal to-teal-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
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

      {metricsError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{metricsError} <button onClick={fetchPipelineStats} className="ml-2 underline font-semibold">Reintentar</button></div>}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-bold transition-all",
            activeTab === 'overview' ? "bg-white text-kirateal shadow-sm" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <BarChart3 size={14} className="inline mr-2" />
          Visión General
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-bold transition-all",
            activeTab === 'audit' ? "bg-white text-kirateal shadow-sm" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Brain size={14} className="inline mr-2" />
          Auditoría IA
        </button>
        <button
          onClick={() => setActiveTab('recovery')}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-bold transition-all",
            activeTab === 'recovery' ? "bg-white text-kirateal shadow-sm" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Mail size={14} className="inline mr-2" />
          Recuperación
        </button>
      </div>

      {/* Tab: Visión General */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prospectos</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{loading ? '...' : metricsError ? '—' : stats.prospects}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visitas al Studio</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{loading ? '...' : metricsError ? '—' : stats.studioViews}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Eye size={20} />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Checkouts</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{loading ? '...' : metricsError ? '—' : stats.checkouts === null ? 'No disponible' : stats.checkouts}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShoppingCart size={20} />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Matrículas</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{loading ? '...' : metricsError ? '—' : stats.enrollments}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico de Ingresos */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900">Histórico de Ingresos (6 meses)</h3>
              <span className="text-sm font-bold text-kirateal">
                {stats.revenue === null ? 'No disponible' : '$' + stats.revenue.toLocaleString()}
              </span>
            </div>
            <div className="h-64">
              {revenueHistory.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
                  {stats.financialAvailable ? 'No hay historial financiero para el período.' : 'Datos financieros no disponibles: no se muestran ingresos estimados.'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueHistory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" fontSize={12} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis fontSize={12} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} formatter={(value) => ['$' + value, 'Ingresos']} />
                    <Line type="monotone" dataKey="ingresos" stroke="#1ec6b6" strokeWidth={3} dot={{ fill: '#1ec6b6', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Embudo de Conversión */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6">Embudo de Conversión</h3>
            {funnelData.length === 0 ? (
              <p className="text-sm text-slate-500">No hay datos suficientes para mostrar el embudo.</p>
            ) : (
              <div className="space-y-4">
                {funnelData.map((stage, index) => (
                  <div key={stage.stage} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">{stage.stage}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-900">{stage.count}</span>
                        <span className={cn("text-xs font-bold", getConversionColor(stage.conversion))}>
                          {stage.conversion}%
                        </span>
                      </div>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          index === 0 ? "bg-indigo-500" :
                          index === 1 ? "bg-blue-500" :
                          index === 2 ? "bg-amber-500" :
                          "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min((stage.count / Math.max(funnelData[0].count, 1)) * 100, 100)}%` }}
                      />
                    </div>
                    {index < funnelData.length - 1 && (
                      <div className="flex justify-center my-1">
                        <ArrowRight size={16} className="text-slate-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab: Auditoría IA */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          {isGenerating ? (
            <div className="text-center py-12">
              <Loader2 className="animate-spin text-kirateal mx-auto mb-4" size={48} />
              <p className="text-slate-600 font-medium">Kira AI está analizando tu embudo...</p>
              <p className="text-xs text-slate-400 mt-1">Esto puede tomar unos segundos</p>
            </div>
          ) : auditResult ? (
            <div className="animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-kirateal/10 text-kirateal flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <h3 className="font-black text-slate-900">Diagnóstico de Kira AI</h3>
                <span className="text-xs text-slate-400 ml-auto">
                  Generado el {new Date().toLocaleDateString()}
                </span>
              </div>
              <div className="prose prose-sm max-w-none bg-slate-50 rounded-xl p-6 border border-slate-100">
                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                  {auditResult}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Brain size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-medium">Ejecuta una auditoría para obtener insights</p>
              <p className="text-sm">Kira AI analizará tu embudo y te dará recomendaciones</p>
              <button
                onClick={runAudit}
                className="mt-4 px-6 py-2 bg-kirateal text-white rounded-xl font-bold hover:bg-kirateal-dark transition-all"
              >
                Ejecutar Auditoría
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Recuperación */}
      {activeTab === 'recovery' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="text-kirateal" size={24} />
            <div>
              <h3 className="font-bold text-slate-900">Campaña de Recuperación</h3>
              <p className="text-xs text-slate-500">
                {stats.checkouts === null ? 'Datos de checkout no disponibles' : stats.checkouts + ' checkouts pendientes'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle size={16} />
                <span className="text-sm font-medium">El formulario guarda un borrador de recuperación; todavía no envía correos.</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Mensaje de Recuperación
              </label>
              <textarea
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-kirateal/20 outline-none transition-all"
                placeholder="Escribe tu mensaje de recuperación...\n\nEjemplo:\nHola [nombre],\n\nVeo que comenzaste el proceso de inscripción en [curso]. ¿Tuviste algún problema?\n\nTe ofrezco un 20% de descuento si completas tu registro hoy.\n\n¡Te espero! 🚀"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">
                <span className="font-bold">{stats.checkouts === null ? 'Audiencia no disponible' : stats.checkouts}</span> prospectos en la audiencia
              </div>
              <button
                onClick={sendRecoveryCampaign}
                disabled={isSendingRecovery || !recoveryEmail.trim()}
                className="px-6 py-3 bg-kirateal text-white rounded-xl font-bold hover:bg-kirateal-dark transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSendingRecovery ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                {isSendingRecovery ? 'Enviando...' : 'Guardar borrador'}
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500">
                <Clock size={14} />
                <span className="text-xs">Este borrador queda guardado para una futura integración de envíos.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
