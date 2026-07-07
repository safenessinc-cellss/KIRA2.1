import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/firebase';
import { useAuth } from '@/src/hooks/useAuth';
import { useToast } from '@/src/hooks/useToast';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Users, CheckCircle2, AlertCircle, Sparkles, Loader2, 
  Send, Award, FileText, ChevronRight, HelpCircle, GraduationCap 
} from 'lucide-react';

interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  moduleName: string;
  homeworkTitle: string;
  homeworkPrompt: string;
  submissionText: string;
  score?: number;
  feedback?: string;
  status: 'pending_review' | 'reviewed';
  createdAt: any;
  reviewedAt?: any;
}

export function CoachHomeworkReview() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  
  // Grading form state
  const [score, setScore] = useState<number>(85);
  const [feedback, setFeedback] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

  // Demo seed state
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSubmissionsAndStudents();
    }
  }, [user]);

  const fetchSubmissionsAndStudents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Get submissions
      const subPath = 'homework_submissions';
      const q = query(collection(db, subPath), where('coachId', '==', user.uid));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission));
      
      // Sort submissions: pending first, then newest
      list.sort((a, b) => {
        if (a.status === b.status) {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        }
        return a.status === 'pending_review' ? -1 : 1;
      });

      setSubmissions(list);

      // 2. Get students of this coach (via enrollments)
      const enrollQ = query(collection(db, 'enrollments'), where('coachId', '==', user.uid));
      const enrollSnap = await getDocs(enrollQ);
      const studentIds = new Set(enrollSnap.docs.map(d => d.data().userId));
      
      const studentList: any[] = [];
      for (const sId of Array.from(studentIds)) {
        const sDoc = await getDoc(doc(db, 'users', sId as string));
        if (sDoc.exists()) {
          studentList.push({ id: sId, ...sDoc.data() });
        }
      }
      setStudents(studentList);

    } catch (e) {
      console.error("Error fetching submissions:", e);
      toastError("Error al cargar entregas de tareas.");
    } finally {
      setLoading(false);
    }
  };

  // Generate mock submissions if the database is empty for demo/functional completeness
  const handleSeedMockData = async () => {
    if (!user) return;
    setIsSeeding(true);
    try {
      const mockHomeworks = [
        {
          moduleName: "Módulo 1: Fundamentos",
          homeworkTitle: "Análisis del Círculo de Influencia",
          homeworkPrompt: "Identifica 5 aspectos de tu vida laboral que pertenezcan a tu Círculo de Preocupación y descríbelos. Luego propón 2 acciones proactivas inmediatas para trasladar tu enfoque hacia tu Círculo de Influencia.",
          studentName: "Santiago Martínez",
          studentEmail: "santiago@kira.coach",
          submissionText: "Mis 5 preocupaciones actuales son:\n1. La inestabilidad del mercado corporativo y posibles despidos masivos.\n2. La falta de comunicación transparente por parte de la dirección general.\n3. El ambiente tenso entre mis compañeros de equipo debido a la sobrecarga laboral.\n4. El tráfico de camino a la oficina que me resta casi 2 horas diarias.\n5. El retraso en la entrega de suministros por parte del proveedor externo.\n\nAcciones proactivas sugeridas:\n1. Respecto a la sobrecarga y el ambiente tenso, hablaré con mi supervisor directo en el 1on1 de esta semana ofreciendo una propuesta de automatización que diseñé en Python para agilizar procesos.\n2. Respecto al tráfico, negociaré un esquema híbrido formal respaldado por mis altos KPIs del mes pasado."
        },
        {
          moduleName: "Módulo 2: Maestría Emocional",
          homeworkTitle: "Bitácora de Regulación Emocional",
          homeworkPrompt: "Registra un evento de alta carga de estrés durante esta semana. Detalla el desencadenante, tu respuesta automática somática, y aplica el método de respiración 4-7-8 para redefinir tu marco mental.",
          studentName: "Sofía Delgado",
          studentEmail: "sofia.d@kira.coach",
          submissionText: "Desencadenante: Mi cliente principal rechazó nuestro entregable a las 5:30 PM en viernes, solicitando cambios críticos para el sábado en la mañana.\n\nRespuesta somática: Sentí una presión intensa en el pecho, opresión en la mandíbula y aceleración cardíaca instantánea. Mi mente se inundó de pensamientos de 'es injusto'.\n\nAplicación del método: Hice una pausa de 5 minutos, apagué el monitor y realicé 4 ciclos completos de respiración 4-7-8. Sentí una disminución de la agitación cardíaca. Redefiní mi marco mental: 'Esto no define mi valor profesional; es un ajuste técnico que puedo solucionar con metodología clara en 2 horas.'"
        }
      ];

      const subPath = 'homework_submissions';
      for (const hw of mockHomeworks) {
        await addDoc(collection(db, subPath), {
          coachId: user.uid,
          studentId: 'demo_student_' + Math.random().toString(36).substr(2, 5),
          studentName: hw.studentName,
          studentEmail: hw.studentEmail,
          courseId: 'demo_course_id',
          courseTitle: 'Programa de Alto Rendimiento Kira',
          moduleName: hw.moduleName,
          homeworkTitle: hw.homeworkTitle,
          homeworkPrompt: hw.homeworkPrompt,
          submissionText: hw.submissionText,
          status: 'pending_review',
          createdAt: new Date()
        });
      }

      toastSuccess("Tareas de prueba cargadas con éxito.");
      await fetchSubmissionsAndStudents();
    } catch (e) {
      console.error("Error seeding mock homeworks:", e);
      toastError("No se pudieron crear tareas de prueba.");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSuggestAiFeedback = async () => {
    if (!selectedSub) return;
    setIsAiGenerating(true);
    try {
      const prompt = `Actúa como un mentor de coaching ontológico y rendimiento ejecutivo sumamente incisivo, empático y profesional de Kira Coach.
      Analiza la siguiente tarea entregada por el alumno:
      
      - Alumno: ${selectedSub.studentName}
      - Módulo: ${selectedSub.moduleName}
      - Tarea: ${selectedSub.homeworkTitle}
      - Consigna / Pregunta: "${selectedSub.homeworkPrompt}"
      - Respuesta del Alumno: "${selectedSub.submissionText}"
      
      Redacta un feedback pedagógico excepcional de 2 o 3 párrafos cortos (en español) que contenga:
      1. Un reconocimiento específico y sincero de lo que hizo muy bien.
      2. Una pregunta reflexiva y retadora para elevar su nivel de conciencia o animarlo a profundizar.
      3. Un cierre de alto impacto motivacional.
      
      Tono: Profesional, motivador, inteligente, constructivo y transformador.`;

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
        setFeedback(data.text);
        toastSuccess("Sugerencia de Kira AI generada con éxito.");
      }
    } catch (e) {
      console.error("Error generating AI feedback:", e);
      toastError("No se pudo conectar con Kira AI para generar la sugerencia.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !user) return;
    setIsSubmittingGrade(true);
    try {
      const subRef = doc(db, 'homework_submissions', selectedSub.id);
      await updateDoc(subRef, {
        score: Number(score),
        feedback,
        status: 'reviewed',
        reviewedAt: new Date()
      });

      toastSuccess(`Calificación enviada correctamente a ${selectedSub.studentName}.`);
      
      // Update local state
      setSubmissions(prev => prev.map(s => s.id === selectedSub.id ? {
        ...s,
        score: Number(score),
        feedback,
        status: 'reviewed',
        reviewedAt: new Date()
      } : s));

      // Close details
      setSelectedSub(null);
      setFeedback('');
    } catch (error) {
      console.error("Error writing grade:", error);
      toastError("Error al guardar la calificación.");
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  const pendingCount = submissions.filter(s => s.status === 'pending_review').length;

  return (
    <div className="bg-slate-50 min-h-[500px] rounded-[40px] border border-slate-200/60 p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="text-amber-500" size={32} />
            Revisión de Tareas
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Revisa las entregas prácticas de tus alumnos y bríndales feedback potenciado por IA.
          </p>
        </div>
        
        {submissions.length === 0 && !loading && (
          <button
            onClick={handleSeedMockData}
            disabled={isSeeding}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
          >
            {isSeeding ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            Cargar Tareas Demo
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
          <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">Cargando tareas pendientes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Submissions List */}
          <div className="xl:col-span-1 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Lista de Entregas ({submissions.length})
              </span>
              {pendingCount > 0 && (
                <span className="px-2.5 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                  {pendingCount} Pendientes
                </span>
              )}
            </div>

            {submissions.length === 0 ? (
              <div className="bg-white border border-slate-200/60 rounded-[32px] p-10 text-center flex flex-col items-center justify-center gap-4">
                <HelpCircle className="text-slate-300" size={48} />
                <p className="text-sm text-slate-600 font-bold">No hay entregas registradas en el sistema todavía.</p>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Cuando tus alumnos suban sus respuestas prácticas correspondientes a los módulos de tus cursos, aparecerán aquí ordenadas cronológicamente.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                {submissions.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setSelectedSub(sub);
                      setScore(sub.score || 85);
                      setFeedback(sub.feedback || '');
                    }}
                    className={`p-5 rounded-[24px] border transition-all text-left flex flex-col gap-2 ${
                      selectedSub?.id === sub.id
                        ? 'bg-indigo-900 border-indigo-900 text-white shadow-xl shadow-indigo-900/15'
                        : 'bg-white border-slate-200/60 hover:border-slate-300 text-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <div>
                        <h4 className={`text-sm font-black tracking-tight ${selectedSub?.id === sub.id ? 'text-white' : 'text-slate-900'}`}>
                          {sub.studentName}
                        </h4>
                        <p className={`text-[11px] font-medium ${selectedSub?.id === sub.id ? 'text-indigo-200' : 'text-slate-500'}`}>
                          {sub.courseTitle}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        sub.status === 'pending_review'
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {sub.status === 'pending_review' ? 'Pendiente' : 'Revisado'}
                      </span>
                    </div>

                    <div className="border-t border-slate-100/10 my-1 w-full" />

                    <div className="flex items-center justify-between w-full text-[10px] font-bold">
                      <span className={selectedSub?.id === sub.id ? 'text-indigo-200' : 'text-slate-400'}>
                        {sub.homeworkTitle}
                      </span>
                      {sub.score !== undefined && (
                        <span className={`font-black ${selectedSub?.id === sub.id ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          Nota: {sub.score}/100
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grading Console / Details */}
          <div className="xl:col-span-2">
            <AnimatePresence mode="wait">
              {selectedSub ? (
                <motion.div
                  key={selectedSub.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-white border border-slate-200/60 rounded-[32px] p-8 shadow-sm flex flex-col gap-6"
                >
                  {/* Top Details */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100 mb-2">
                        <GraduationCap size={12} /> {selectedSub.moduleName}
                      </div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        {selectedSub.homeworkTitle}
                      </h3>
                      <p className="text-xs text-slate-500 font-bold mt-1">
                        Alumno: {selectedSub.studentName} ({selectedSub.studentEmail})
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-widest">Estado</span>
                      <span className={`inline-block px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full mt-1.5 ${
                        selectedSub.status === 'pending_review' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {selectedSub.status === 'pending_review' ? 'Por calificar' : 'Evaluado'}
                      </span>
                    </div>
                  </div>

                  {/* Prompt Consigna */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      Pregunta / Consigna de la tarea:
                    </span>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed italic">
                      "{selectedSub.homeworkPrompt}"
                    </p>
                  </div>

                  {/* Submission Text */}
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      Respuesta enviada por el alumno:
                    </span>
                    <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200/50 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedSub.submissionText}
                    </div>
                  </div>

                  {/* Evaluation Box */}
                  <form onSubmit={handleSubmitGrade} className="border-t border-slate-100 pt-6 flex flex-col gap-5">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <Award className="text-indigo-600" size={18} /> Consola de Evaluación
                    </h4>

                    {/* Score Slider */}
                    <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                      <div className="md:col-span-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                          Calificación (0-100)
                        </label>
                      </div>
                      <div className="md:col-span-2 flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={score}
                          onChange={(e) => setScore(Number(e.target.value))}
                          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                      <div className="md:col-span-1 text-center md:text-right">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                          {score}
                        </span>
                        <span className="text-xs font-bold text-slate-400">/100</span>
                      </div>
                    </div>

                    {/* Feedback Text area */}
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                          Retroalimentación / Consejos
                        </label>
                        <button
                          type="button"
                          onClick={handleSuggestAiFeedback}
                          disabled={isAiGenerating}
                          className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition disabled:opacity-50"
                        >
                          {isAiGenerating ? (
                            <Loader2 className="animate-spin" size={12} />
                          ) : (
                            <Sparkles size={12} />
                          )}
                          Sugerir con Kira AI
                        </button>
                      </div>
                      <textarea
                        required
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Escribe aquí las observaciones, recomendaciones y felicitaciones para el alumno..."
                        className="w-full h-36 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm leading-relaxed focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none resize-none transition-all"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSub(null)}
                        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition"
                      >
                        Cerrar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingGrade}
                        className="px-8 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
                      >
                        {isSubmittingGrade ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                        Guardar Calificación
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <div className="bg-white border border-slate-200/60 rounded-[32px] p-16 text-center flex flex-col items-center justify-center gap-4 h-full min-h-[400px]">
                  <Award className="text-slate-200" size={64} />
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Consola de Evaluación Activa</h3>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                    Selecciona una entrega de tarea de la lista lateral para visualizar el contenido enviado, ejecutar un análisis del rendimiento del alumno o corregirla utilizando los servicios cognitivos avanzados de Kira AI.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
