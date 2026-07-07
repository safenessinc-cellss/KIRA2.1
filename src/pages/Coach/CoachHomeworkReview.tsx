// src/pages/coach/CoachHomeworkReview.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { db } from '@/src/firebase';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, addDoc } from 'firebase/firestore';
import { Loader2, CheckCircle2, Clock, AlertCircle, Sparkles, ChevronRight, BookOpen, Users, FileText, Send, Star } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/hooks/useToast';

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
  coachId: string;
}

export function CoachHomeworkReview() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<HomeworkSubmission | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'homework_submissions'),
      where('coachId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list: HomeworkSubmission[] = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Obtener información del alumno si no está en el documento
        let studentName = data.studentName || 'Alumno';
        let studentEmail = data.studentEmail || 'Sin email';
        
        if (data.studentId && !data.studentName) {
          try {
            const userDoc = await getDoc(doc(db, 'users', data.studentId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              studentName = userData.displayName || 'Alumno';
              studentEmail = userData.email || 'Sin email';
            }
          } catch (e) {
            console.warn("Could not fetch student info:", e);
          }
        }
        
        list.push({
          id: doc.id,
          ...data,
          studentName,
          studentEmail,
          courseTitle: data.courseTitle || 'Curso sin título',
          assignmentTitle: data.assignmentTitle || 'Tarea sin título',
          assignmentDescription: data.assignmentDescription || '',
          submissionText: data.submissionText || '',
          status: data.status || 'pending'
        } as HomeworkSubmission);
      }

      // Ordenar: pendientes primero
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

      // Crear notificación para el alumno
      await addDoc(collection(db, 'notifications'), {
        userId: selectedSubmission.studentId,
        title: '✅ Tarea revisada',
        message: `Tu tarea "${selectedSubmission.assignmentTitle}" ha sido revisada.`,
        read: false,
        createdAt: new Date(),
        type: 'homework_review'
      });

      toastSuccess('¡Revisión guardada exitosamente!');
      
      // Actualizar estado local
      setSubmissions(prev => prev.map(s => 
        s.id === selectedSubmission.id 
          ? { ...s, score, feedback, status: 'reviewed' as const }
          : s
      ));
      setSelectedSubmission(null);
    } catch (error) {
      console.error("Error saving review:", error);
      toastError('Error al guardar la revisión');
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
        
        Analiza la entrega y genera un feedback constructivo y empático que:
        1. Reconozca los aciertos del alumno
        2. Señale áreas de mejora con ejemplos concretos
        3. Desafíe al alumno a profundizar en algún aspecto clave
        4. Termine con una pregunta reflexiva para impulsar su crecimiento
        
        También proporciona una puntuación del 0 al 100 basada en:
        - Cumplimiento de la consigna (40%)
        - Claridad y estructura (30%)
        - Profundidad del análisis (30%)
        
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
      
      toastSuccess('✨ Feedback generado por IA');
    } catch (error) {
      console.error("Error generating AI feedback:", error);
      toastError('Error al generar feedback con IA');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Generar datos de demostración
  const generateDemoSubmissions = async () => {
    if (!user) return;
    
    const demos = [
      {
        studentName: 'Ana Martínez',
        studentEmail: 'ana@ejemplo.com',
        studentId: 'demo1',
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
        studentId: 'demo2',
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
      toastSuccess('📚 Datos de demostración creados');
    } catch (error) {
      console.error("Error creating demo data:", error);
      toastError('Error al crear datos de demostración');
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    const matchesFilter = filter === 'all' || s.status === filter;
    const matchesSearch = s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.assignmentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.courseTitle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen className="text-kirateal" size={24} />
            Revisión de Tareas
            {pendingCount > 0 && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full animate-pulse">
                {pendingCount} pendientes
              </span>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gestiona y califica las entregas prácticas de tus alumnos</p>
        </div>
        {submissions.length === 0 && (
          <button
            onClick={generateDemoSubmissions}
            className="px-4 py-2 bg-kirateal text-white rounded-xl text-sm font-bold hover:bg-kirateal-dark transition-all flex items-center gap-2"
          >
            <Sparkles size={16} />
            Generar Datos de Prueba
          </button>
        )}
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
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
        
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por alumno, tarea o curso..."
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-kirateal/20 outline-none transition-all"
          />
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center">
          <div className="flex flex-col items-center gap-4 text-slate-400">
            <BookOpen size={48} className="opacity-30" />
            <p className="text-sm font-medium">No hay entregas de tareas pendientes</p>
            <p className="text-xs">Los alumnos verán sus tareas aquí cuando las completen</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Lista de Entregas */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 max-h-[600px] overflow-y-auto">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                No hay entregas que coincidan con los filtros
              </div>
            ) : (
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
                          sub.submittedAt.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 
                          'Fecha desconocida'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-slate-600">{selectedSubmission.studentName}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-sm text-slate-500">{selectedSubmission.courseTitle}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
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
                      <FileText size={16} />
                      Ver archivo adjunto
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
                      className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-kirateal to-teal-400 text-white rounded-lg text-[11px] font-bold hover:scale-105 transition-all disabled:opacity-50"
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
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Necesita mejorar</span>
                      <span>Excelente</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Feedback</label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-kirateal/20 outline-none transition-all"
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
