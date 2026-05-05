import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, limit, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, GraduationCap, Loader2, ThumbsUp, ThumbsDown, MessageSquare, CheckCircle2 } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export function MentorWidget() {
  const { user } = useAuth();
  const [recommendation, setRecommendation] = useState<string>('');
  const [suggestedCourses, setSuggestedCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackState, setFeedbackState] = useState<'none'|'rating'|'commenting'|'done'>('none');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [currentRating, setCurrentRating] = useState<'positive'|'negative'|null>(null);

  useEffect(() => {
    if (user?.uid) {
      if (user.aiFeedback) {
        setRecommendation(user.aiFeedback.message);
        if (user.aiFeedback.rating) {
           setFeedbackState('done');
           setCurrentRating(user.aiFeedback.rating);
        } else {
           setFeedbackState('rating');
        }
        fetchInitialData();
      } else {
        generateRecommendations();
      }
    }
  }, [user?.uid]);

  const fetchInitialData = async () => {
    try {
      const coursesSnap = await getDocs(query(collection(db, 'courses'), where('status', '==', 'published')));
      const allCourses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (user?.aiFeedback?.suggestedCourseIds) {
        const suggested = allCourses.filter(c => user.aiFeedback.suggestedCourseIds.includes(c.id));
        setSuggestedCourses(suggested);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const generateRecommendations = async () => {
    if (!user) return;
    setLoading(true);
    setFeedbackState('none');
    try {
      const journalsQ = query(
        collection(db, 'journals'), 
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const journalsSnap = await getDocs(journalsQ);
      const journalTexts = journalsSnap.docs.map(d => d.data().content).join('\n---\n');

      const enrollQ = query(collection(db, 'enrollments'), where('userId', '==', user.uid));
      const enrollSnap = await getDocs(enrollQ);
      const enrollDataList = enrollSnap.docs.map(d => d.data());
      const progressList = enrollDataList.map(data => {
        return `Curso ID: ${data.courseId}, Progreso: ${data.progress}%`;
      }).join('\n');

      const activityQ = query(collection(db, 'course_activity'), where('userId', '==', user.uid), limit(20));
      const activitySnap = await getDocs(activityQ);
      const activityData = activitySnap.docs.map(d => {
        const data = d.data();
        return `Módulo: ${data.moduleId}, Tiempo: ${data.timeSpentMinutes}min, Quiz: ${data.quizScore}/${data.quizTotal}, Interacciones: ${data.interactionsCount}`;
      }).join('\n');

      const avgProgress = enrollDataList.length > 0 
        ? enrollDataList.reduce((acc, curr) => acc + (curr.progress || 0), 0) / enrollDataList.length 
        : 0;

      const coursesSnap = await getDocs(query(collection(db, 'courses'), where('status', '==', 'published')));
      const allCourses = coursesSnap.docs.map(d => {
        const data = d.data();
        return { id: d.id, title: data.title, description: data.description };
      });

      const prompt = `
        Actúa como un mentor experto en bienestar y desarrollo personal de la plataforma Kira.
        El alumno tiene un progreso promedio general del ${avgProgress.toFixed(1)}%.
        
        Basándote en sus estados emocionales de sus diarios:
        "${journalTexts || 'El alumno aún no ha escrito en su diario.'}"
        
        Detalle de sus cursos:
        "${progressList || 'Aún no está inscrito en cursos.'}"

        Patrones de interacción y rendimiento (Tiempo, Quizzes, Clicks):
        "${activityData || 'No hay datos de interacción detallada aún.'}"

        Available Courses to recommend:
        ${JSON.stringify(allCourses)}
        
        Instrucciones para el consejo:
        1. Analiza no solo el progreso, sino el RENDIMIENTO (quizzes) y el COMPROMISO (tiempo e interacciones).
        2. Si el rendimiento es bajo en quizzes pero el tiempo es alto, sugiere técnicas de estudio o calma.
        3. Si el compromiso es bajo, ofrece un consejo específico para superar obstáculos y motivarlo.
        4. Si el progreso y rendimiento son ALTOs (>70%), felicítalo y sugiérele un reto altamente relevante o un curso avanzado.
        
        Responde exclusivamente en formato JSON válido:
        { "message": "tu consejo detallado y ultra-personalizado", "suggestedCourseIds": ["ID1", "ID2"] }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || '{}');
      setRecommendation(result.message);
      
      const suggested = allCourses.filter(c => result.suggestedCourseIds?.includes(c.id));
      setSuggestedCourses(suggested);

      await updateDoc(doc(db, 'users', user.uid), {
        aiFeedback: {
          message: result.message,
          suggestedCourseIds: result.suggestedCourseIds || [],
          updatedAt: new Date()
        }
      });
      setFeedbackState('rating');

    } catch (err) {
      console.error('Mentor Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (type: 'positive' | 'negative') => {
    if (!user) return;
    setCurrentRating(type);
    setFeedbackState('commenting');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'aiFeedback.rating': type,
        'aiFeedback.updatedAt': new Date()
      });
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const submitComment = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'aiFeedback.comment': feedbackComment,
        'aiFeedback.updatedAt': new Date()
      });
      setFeedbackState('done');
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  if (loading) return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse flex flex-col items-center justify-center gap-4 text-slate-400">
      <Loader2 className="animate-spin" size={32} />
      <p className="text-sm font-medium">Kira Mentor está analizando tu progreso...</p>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-1 rounded-2xl shadow-xl shadow-teal-100/50">
      <div className="bg-white p-6 rounded-[calc(1rem-2px)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-teal-500 fill-teal-500" size={20} />
            <h3 className="font-extrabold text-slate-800 tracking-tight">Kira AI Mentor</h3>
          </div>
          <button 
             onClick={generateRecommendations}
             className="text-xs text-teal-600 font-bold hover:underline"
          >
             Generar Nuevo
          </button>
        </div>
        
        <p className="text-[13px] text-slate-600 leading-relaxed mb-6 italic">
          "{recommendation || 'Continúa escribiendo en tu diario para recibir consejos personalizados de Kira AI.'}"
        </p>

        {recommendation && feedbackState !== 'none' && (
          <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-xl animate-in fade-in">
             {feedbackState === 'rating' && (
                <div className="flex flex-col items-center gap-3">
                   <p className="text-xs font-bold text-slate-500">¿Te fue útil este consejo?</p>
                   <div className="flex gap-4">
                      <button onClick={() => handleRate('positive')} className="p-2 bg-white border border-slate-200 rounded-lg hover:border-emerald-500 hover:text-emerald-500 transition-colors text-slate-400">
                         <ThumbsUp size={18} />
                      </button>
                      <button onClick={() => handleRate('negative')} className="p-2 bg-white border border-slate-200 rounded-lg hover:border-rose-500 hover:text-rose-500 transition-colors text-slate-400">
                         <ThumbsDown size={18} />
                      </button>
                   </div>
                </div>
             )}

             {feedbackState === 'commenting' && (
                <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-2">
                   <p className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <MessageSquare size={14} className="text-teal-500" />
                      Cuéntanos más para mejorar a Kira
                   </p>
                   <textarea 
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="¿Qué podríamos mejorar en el consejo?"
                      className="w-full h-20 p-3 bg-white border border-slate-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-1 focus:ring-teal-500"
                   />
                   <div className="flex justify-end gap-2">
                      <button 
                         onClick={() => setFeedbackState('done')}
                         className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium"
                      >
                         Omitir
                      </button>
                      <button 
                         onClick={submitComment}
                         disabled={!feedbackComment.trim()}
                         className="px-4 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 disabled:opacity-50"
                      >
                         Enviar Feedback
                      </button>
                   </div>
                </div>
             )}

             {feedbackState === 'done' && (
                <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-bold py-2">
                   <CheckCircle2 size={16} /> ¡Gracias por tu feedback!
                   {currentRating === 'positive' && <ThumbsUp size={14} className="ml-1 opacity-50" />}
                   {currentRating === 'negative' && <ThumbsDown size={14} className="ml-1 opacity-50" />}
                </div>
             )}
          </div>
        )}

        {suggestedCourses.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Rutas Recomendadas Para Ti</p>
            <div className="space-y-3">
              {suggestedCourses.map(course => (
                <div key={course.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-teal-200 transition-colors shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                    <GraduationCap size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-bold text-slate-800 truncate">{course.title}</h4>
                    <p className="text-[11px] text-slate-500 truncate">{course.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
