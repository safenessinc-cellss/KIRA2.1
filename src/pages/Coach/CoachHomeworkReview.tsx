import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { db } from '@/src/firebase';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { Loader2, CheckCircle2, Clock, AlertCircle, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface HomeworkSubmission {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  assignmentTitle: string;
  assignmentDescription: string;
  submissionText: string;
  submissionUrl?: string;
  score?: number;
  feedback?: string;
  status: 'pending' | 'reviewed';
  submittedAt: any;
  reviewedAt?: any;
}

export function CoachHomeworkReview() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<HomeworkSubmission | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending');

  useEffect(() => {
    if (!user) return;

    // Escuchar entregas en tiempo real
    const q = query(
      collection(db, 'homework_submissions'),
      where('coachId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: HomeworkSubmission[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Verificar si la entrega pertenece a un curso del coach
        list.push({
          id: doc.id,
          ...data,
          studentName: data.studentName || 'Alumno',
          studentEmail: data.studentEmail || 'Sin email',
          courseTitle: data.courseTitle || 'Curso sin título',
          assignmentTitle: data.assignmentTitle || 'Tarea sin título',
          assignmentDescription: data.assignmentDescription || '',
          submissionText: data.submissionText || '',
          status: data.status || 'pending'
        } as HomeworkSubmission);
      });

      // Ordenar: pendientes primero, luego por fecha más reciente
      list.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        const dateA = a.submittedAt?.seconds || a.submittedAt?.getTime?.() / 1000 || 0;
        const dateB = b.submittedAt?.seconds || b.submittedAt?.getTime?.() / 1000 || 0;
        return dateB - dateA;
      });

      setSubmissions(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching homework submissions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSelectSubmission = (sub: HomeworkSubmission) => {
    setSelectedSubmission(sub);
    setScore(sub.score || 0);
    setFeedback(sub.feedback || '');
  };

  const handleSaveReview = async () => {
    if (!selectedSubmission) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'homework_submissions', selectedSubmission.id), {
        score: score,
        feedback: feedback,
        status: 'reviewed',
        reviewedAt: new Date(),
        reviewedBy: user?.uid
      });

      // Actualizar estado local
      setSubmissions(prev => prev.map(s => 
        s.id === selectedSubmission.id 
          ? { ...s, score, feedback, status: 'reviewed' as const }
          : s
      ));
      setSelectedSubmission(null);
    } catch (error) {
      console.error("Error saving review:", error);
      alert("Error al guardar la revisión. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  const generateAIFeedback = async () => {
    if (!selectedSubmission) return;
    setIsGeneratingAI(true);
    try {
      const prompt = `
        Actúa como un coach experto y pedagogo de alto rendimiento.
        
        Consigna de la tarea:
        "${selectedSubmission.assignmentDescription}"
        
        Entrega del alumno:
        "${selectedSubmission.submissionText}"
        
        Analiza la entrega y genera:
        1. Puntuación numérica (0-100) basada en el cumplimiento de la consigna.
        2. Feedback constructivo y empático (máximo 150 palabras) que:
           - Reconozca los aciertos del alumno.
           - Señale áreas de mejora con ejemplos concretos.
           - Desafíe al alumno a profundizar en algún aspecto clave.
           - Termine con una pregunta reflexiva para impulsar su crecimiento.
        
        Responde en formato JSON: {"score": number, "feedback": string}
      `;

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: { responseMimeType: "application/json" }
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const result = JSON.parse(data.text || '{}');
      if (result.score !== undefined) setScore(Math.round(result.score));
      if (result.feedback) setFeedback(result.feedback);
    } catch (error) {
      console.error("Error generating AI feedback:", error);
      alert("Error al generar feedback con IA. Intenta de nuevo.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Generar datos de demostración si no hay entregas
  const generateDemoSubmissions = async () => {
    if (!user) return;
    // Simular entregas de prueba
    const demos = [
      {
        studentName: 'Ana Martínez',
        studentEmail: 'ana@ejemplo.com',
        courseTitle: 'Maestría en Liderazgo',
        assignmentTitle: 'Análisis de Caso: Liderazgo Transformacional',
        assignmentDescription: 'Analiza un caso de liderazgo transformacional en tu industria y propón un plan de acción de 3 pasos.',
        submissionText: 'El liderazgo transformacional se basa en la inspiración y el carisma. En mi industria, el caso de Satya Nadella en Microsoft es un ejemplo claro. Propongo: 1) Fomentar la comunicación abierta, 2) Empoderar equipos autónomos, 3) Celebrar los fracasos como aprendizaje.',
        coachId: user.uid,
        status: 'pending',
        submittedAt: new Date()
      },
      {
        studentName: 'Carlos Gómez',
        studentEmail: 'carlos@ejemplo.com',
        courseTitle: 'Inteligencia Emocional Avanzada',
        assignmentTitle: 'Diario de Autoconocimiento',
        assignmentDescription: 'Escribe un diario reflexivo de 3 días sobre tus patrones emocionales en situaciones de estrés.',
        submissionText: 'Día 1: Noté que cuando me siento presionado, mi primera reacción es la frustración. Día 2: Practiqué la respiración consciente y logré reducir mi ansiedad. Día 3: Descubrí que el diálogo interno negativo es mi principal desencadenante.',
        coachId: user.uid,
        status: 'pending',
        submittedAt: new Date()
      }
    ];

    try {
      for (const demo of demos) {
        await addDoc(collection(db, 'homework_submissions'), demo);
      }
      alert("¡Datos de demostración creados exitosamente!");
    } catch (error) {
      console.error("Error creating demo data:", error);
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    if (filter === 'pending') return s.status === 'pending';
    if (filter === 'reviewed') return s.status === 'reviewed';
    return true;
  });

  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-kirateal" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-200 gap-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-3">
            Revisión de Tareas
            {pendingCount > 0 && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-black rounded-full animate-pulse">
                {pendingCount} pendientes
              </span>
            )}
          </h2>
          <p className="text-[13px] text-slate-500 mt-0.5">Gestiona y califica las entregas prácticas de tus alumnos.</p>
        </div>
        {submissions.length === 0 && (
          <button
            onClick={generateDemoSubmissions}
            className="px-4 py-2 bg-kirateal text-white rounded-xl text-xs font-bold hover:bg-kirateal-dark transition-all"
          >
            Generar Entregas de Prueba
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setFilter('pending')}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
            filter === 'pending' ? "bg-white text-kirateal shadow-sm" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Pendientes {pendingCount > 0 && `(${pendingCount})`}
        </button>
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
            filter === 'all' ? "bg-white text-kirateal shadow-sm" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Todas ({submissions.length})
        </button>
        <button
          onClick={() => setFilter('reviewed')}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
            filter === 'reviewed' ? "bg-white text-kirateal shadow-sm" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Revisadas
        </button>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center">
          <div className="flex flex-col items-center gap-4 text-slate-400">
            <BookOpen size={48} className="opacity-30" />
            <p className="text-sm font-medium">No hay entregas de tareas pendientes.</p>
            <p className="text-xs">Los alumnos verán sus tareas aquí cuando las completen.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Lista de Entregas */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 max-h-[600px] overflow-y-auto">
            <div className="space-y-3">
              {filteredSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => handleSelectSubmission(sub)}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md",
                    selectedSubmission?.id === sub.id
                      ? "border-kirateal bg-kirateal/5 shadow-md"
                      : "border-slate-100 hover:border-slate-200",
                    sub.status === 'pending' ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-emerald-400"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{sub.assignmentTitle}</h4>
                      <p className="text-xs text-slate-500 truncate">{sub.studentName}</p>
                      <p className="text-xs text-slate-400 truncate">{sub.courseTitle}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      {sub.status === 'pending' ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full">
                          Pendiente
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded-full">
                          ✓ Revisado
                        </span>
                      )}
                      {sub.score !== undefined && (
                        <span className="text-xs font-black text-slate-700">{sub.score}/100</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                    <Clock size={12} />
                    <span>
                      {sub.submittedAt?.toDate ? 
                        sub.submittedAt.toDate().toLocaleDateString() : 
                        'Fecha desconocida'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Panel de Revisión */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6">
            {selectedSubmission ? (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-slate-900 text-lg tracking-tight">
                      {selectedSubmission.assignmentTitle}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {selectedSubmission.studentName} · {selectedSubmission.courseTitle}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                {/* Consigna */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Consigna</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {selectedSubmission.assignmentDescription || 'Sin descripción de consigna.'}
                  </p>
                </div>

                {/* Entrega del Alumno */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Entrega del Alumno</h4>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedSubmission.submissionText || 'Sin texto de entrega.'}
                  </p>
                  {selectedSubmission.submissionUrl && (
                    <a
                      href={selectedSubmission.submissionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-kirateal text-sm font-bold hover:underline"
                    >
                      Ver archivo adjunto →
                    </a>
                  )}
                </div>

                {/* Evaluación */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Evaluación</h4>
                    <button
                      onClick={generateAIFeedback}
                      disabled={isGeneratingAI}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-kirateal to-kirateal-light text-white rounded-lg text-[11px] font-bold hover:scale-105 transition-all disabled:opacity-50"
                    >
                      {isGeneratingAI ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      Sugerir Feedback con IA
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Calificación: {score}/100
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={score}
                      onChange={(e) => setScore(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-kirateal"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Feedback</label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-kirateal/20 outline-none"
                      placeholder="Escribe aquí tu retroalimentación para el alumno..."
                    />
                  </div>

                  <button
                    onClick={handleSaveReview}
                    disabled={isSaving}
                    className={cn(
                      "w-full py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2",
                      isSaving ? "bg-slate-400" : "bg-kirateal hover:bg-kirateal-dark shadow-lg shadow-kirateal/20"
                    )}
                  >
                    {isSaving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    {isSaving ? "Guardando..." : "Guardar Revisión"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                <BookOpen size={48} className="mb-4 opacity-30" />
                <p className="text-sm font-medium">Selecciona una entrega para revisar</p>
                <p className="text-xs">Haz clic en una tarea de la lista izquierda</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
