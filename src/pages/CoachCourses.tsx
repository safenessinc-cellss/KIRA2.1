import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { MediaUpload } from '../components/MediaUpload';
import { useToast } from '../hooks/useToast';
import { Users, BookOpen, AlertTriangle, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function CoachCourses() {
  const { user } = useAuth();
  const { success: toastSuccess } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  
  // Tab & Student state
  const [activeTab, setActiveTab] = useState<'courses' | 'students'>('courses');
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [bannerUrl, setBannerUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(d => {
        if(d.exists()) setProfile(d.data());
      });
      fetchCourses();
    }
  }, [user]);

  const fetchEnrolledStudents = async (courseList: any[]) => {
    if (courseList.length === 0) {
      setEnrolledStudents([]);
      return;
    }
    setLoadingStudents(true);
    try {
      const allEnrollments: any[] = [];
      for (const course of courseList) {
        const enrollQ = query(collection(db, 'enrollments'), where('courseId', '==', course.id));
        const enrollSnap = await getDocs(enrollQ);
        enrollSnap.docs.forEach(docSnap => {
          allEnrollments.push({
            id: docSnap.id,
            courseTitle: course.title,
            ...docSnap.data()
          });
        });
      }

      const uniqueUserIds = Array.from(new Set(allEnrollments.map(e => e.userId)));
      const studentProfiles: { [key: string]: any } = {};

      for (const sId of uniqueUserIds) {
        if (!sId) continue;
        const userDoc = await getDoc(doc(db, 'users', sId));
        if (userDoc.exists()) {
          studentProfiles[sId] = userDoc.data();
        }
      }

      const mergedStudents = allEnrollments.map(enroll => {
        const p = studentProfiles[enroll.userId] || { name: 'Alumno Desconocido', email: 'S/D' };
        return {
          id: enroll.id,
          studentId: enroll.userId,
          studentName: p.name || p.displayName || 'Alumno Desconocido',
          studentEmail: p.email || 'Sin correo',
          studentAvatar: p.photoURL || p.avatarUrl || '',
          courseTitle: enroll.courseTitle,
          courseId: enroll.courseId,
          progress: enroll.progress || 0,
          createdAt: enroll.createdAt?.seconds ? new Date(enroll.createdAt.seconds * 1000) : new Date()
        };
      });

      setEnrolledStudents(mergedStudents);
    } catch (e) {
      console.error("Error fetching enrolled students:", e);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchCourses = async () => {
    if(!user) return;
    try {
      const q = query(collection(db, 'courses'), where('coachId', '==', user.uid));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setCourses(list);
      if (list.length === 0) {
        setIsCreating(true);
      }
      await fetchEnrolledStudents(list);
    } catch(e) {
      console.error(e);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este curso de tu catálogo?")) return;
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      fetchCourses();
      toastSuccess("Curso eliminado exitosamente.");
    } catch(e) {
      console.error(e);
      setErrorMsg('Error al eliminar el curso.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  const isApproved = true;

  const handleCancel = () => {
    setIsCreating(false);
    setEditingCourse(null);
    setTitle('');
    setDescription('');
    setPrice(0);
    setBannerUrl('');
  };

  const handleEditClick = (course: any) => {
    setEditingCourse(course);
    setTitle(course.title || '');
    setDescription(course.description || '');
    setPrice(course.price || 0);
    setBannerUrl(course.bannerUrl || '');
    setIsCreating(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isApproved) return;
    try {
      await addDoc(collection(db, 'courses'), {
        title,
        description,
        price: Number(price),
        bannerUrl,
        coachId: user.uid,
        status: 'published',
        createdAt: new Date()
      });
      handleCancel();
      fetchCourses();
      toastSuccess("Curso creado exitosamente.");
    } catch(e) {
      console.error(e);
      setErrorMsg('Error creando curso. Asegúrate de estar aprobado.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isApproved || !editingCourse) return;
    try {
      await updateDoc(doc(db, 'courses', editingCourse.id), {
        title,
        description,
        price: Number(price),
        bannerUrl,
        updatedAt: new Date()
      });
      handleCancel();
      fetchCourses();
      toastSuccess("Curso actualizado exitosamente.");
    } catch(e) {
      console.error(e);
      setErrorMsg('Error actualizando curso.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  const generateAiContent = async () => {
    if (!title && !description) {
      setErrorMsg("Por favor, introduce al menos un título o tema para que Kira AI pueda ayudarte.");
      setTimeout(() => setErrorMsg(''), 5000);
      return;
    }
    setIsAiGenerating(true);
    try {
      const prompt = `Actúa como un arquitecto de contenido educativo experto. 
      Basado en este título o idea de curso: "${title || description}", genera:
      1. Un título profesional y atractivo.
      2. Una descripción persuasiva de 3 párrafos que resalte los beneficios.
      3. Una lista de 5 módulos clave con sus respectivos objetivos.
      
      Devuelve la respuesta en formato JSON estrictamente válido con las llaves: "title", "description", "syllabus" (donde syllabus es un string formateado con los módulos).`;

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        })
      });
      const dataJson = await res.json();
      if (dataJson.error) throw new Error(dataJson.error);

      const data = JSON.parse(dataJson.text || '{}');

      setTitle(data.title || title);
      setDescription((data.description || description) + "\n\n### Temario Propuesto:\n" + (data.syllabus || ""));
    } catch (e) {
      console.error("AI Generation Error:", e);
      setErrorMsg("Hubo un error al generar el contenido. Por favor intenta de nuevo.");
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setIsAiGenerating(false);
    }
  };

  if (!isApproved) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center animate-in zoom-in-95">
        <h2 className="text-lg font-bold text-slate-800 mb-2 tracking-tight">Acceso Restringido</h2>
        <p className="text-sm text-slate-500">Debes ser aprobado por un administrador antes de subir cursos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Studio de Cursos (Control de Studio)</h2>
          <p className="text-[13px] text-slate-500 mt-0.5">Diseña tu curriculum educativo, gestiona precios y publica programas interactivos con el Co-piloto de Kira AI.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-bold flex items-center gap-2">
          <AlertTriangle size={18} /> {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (5 cols): Persistent Formulator */}
        <div className="lg:col-span-5 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col gap-6 h-fit sticky top-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base tracking-tight">
                {editingCourse ? 'Editar Curso' : 'Crear Nuevo Programa'}
              </h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Formulario de Control</p>
            </div>
            <button 
               type="button"
               disabled={isAiGenerating}
               onClick={generateAiContent}
               className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
             >
               {isAiGenerating ? <Loader2 size={13} className="animate-spin"/> : <Sparkles size={13}/>}
               {isAiGenerating ? "Generando..." : "Asistente Kira AI"}
             </button>
          </div>

          <form onSubmit={editingCourse ? handleUpdate : handleCreate} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Título del Curso / Programa</label>
              <input required value={title} onChange={e=>setTitle(e.target.value)} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none text-slate-800 font-medium" placeholder="Ej: Maestría en Inteligencia Emocional" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Inversión Alumno ($)</label>
                <input required value={price} onChange={e=>setPrice(Number(e.target.value))} type="number" min="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none text-slate-800 font-medium" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Estado de Publicación</label>
                <div className="bg-slate-100 p-2.5 rounded-xl text-center text-xs font-bold text-emerald-700 uppercase tracking-wider border border-slate-200">
                  {editingCourse ? editingCourse.status : 'published'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Imagen de Portada (Cover)</label>
              <MediaUpload 
                onUploadComplete={(url) => setBannerUrl(url)}
                folderPath={`courses/${user?.uid}`}
                currentMedia={bannerUrl}
                label="Subir Cover"
                accept="image/*"
              />
              <input value={bannerUrl} onChange={e=>setBannerUrl(e.target.value)} type="text" placeholder="O introduce una URL externa..." className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none text-slate-600" />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Propuesta de Valor (Descripción y Temario)</label>
              <textarea required value={description} onChange={e=>setDescription(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none h-44 resize-none text-slate-700 leading-relaxed font-medium" placeholder="¿Qué lograrán tus alumnos? Describe los módulos y el temario propuesto aquí..." />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {editingCourse && (
                <button 
                  type="button" 
                  onClick={handleCancel} 
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all active:scale-95 text-xs uppercase tracking-wider animate-in fade-in zoom-in-95"
                >
                  Cancelar Edición
                </button>
              )}
              <button type="submit" className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95 text-xs uppercase tracking-wider flex-1">
                {editingCourse ? 'Guardar Cambios' : 'Publicar Nuevo Programa'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column (7 cols): Course Catalog & Enrolled Students */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex border-b border-slate-100 pb-2 justify-between items-center gap-4">
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() => setActiveTab('courses')}
                className={cn(
                  "pb-2 text-sm font-black uppercase tracking-wider transition-all border-b-2",
                  activeTab === 'courses' ? "border-primary text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                Cursos Activos ({courses.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('students')}
                className={cn(
                  "pb-2 text-sm font-black uppercase tracking-wider transition-all border-b-2",
                  activeTab === 'students' ? "border-primary text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                Estudiantes Inscritos ({enrolledStudents.length})
              </button>
            </div>
          </div>

          {activeTab === 'courses' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map(c => (
                <div key={c.id} className={cn(
                  "bg-white rounded-[32px] border overflow-hidden flex flex-col shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all hover:-translate-y-1 group",
                  editingCourse?.id === c.id ? "border-primary ring-2 ring-primary/20 animate-pulse" : "border-slate-200"
                )}>
                  <div className="relative h-32 overflow-hidden">
                     <img src={c.bannerUrl || `https://picsum.photos/seed/${c.title}/800/400`} alt="Banner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                     <div className="absolute top-4 right-4 px-2 py-1 bg-white/90 backdrop-blur rounded-lg text-[9px] font-black text-slate-800 uppercase shadow-sm tracking-wider">
                        {c.status}
                     </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-black text-slate-900 text-sm mb-1 leading-tight tracking-tight">{c.title}</h3>
                    <p className="text-xs text-primary font-black mb-3">${c.price}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-3 mb-6 flex-1 leading-relaxed font-medium">{c.description}</p>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Users size={14} />
                        <span className="text-[11px] font-bold">
                          {enrolledStudents.filter(s => s.courseId === c.id).length} Alumnos
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          type="button"
                          onClick={() => handleEditClick(c)}
                          className="text-[11px] font-black uppercase tracking-wider text-indigo-600 hover:underline flex items-center gap-1"
                        >
                           Editar
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteCourse(c.id)}
                          className="text-[11px] font-black uppercase tracking-wider text-rose-500 hover:underline flex items-center gap-1"
                        >
                           Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {courses.length === 0 && (
                <div className="col-span-full text-center py-20 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200">
                   <BookOpen size={48} className="mx-auto text-slate-200 mb-4" />
                   <p className="text-slate-400 font-medium text-sm">Aún no has diseñado ningún curso en tu catálogo.</p>
                   <p className="text-slate-400 text-xs mt-1">Completa el formulario de la izquierda para lanzar tu primer programa.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {loadingStudents ? (
                <div className="text-center py-12">
                  <Loader2 className="animate-spin text-slate-400 mx-auto" size={24} />
                  <p className="text-xs text-slate-400 mt-2">Cargando lista de estudiantes...</p>
                </div>
              ) : enrolledStudents.length === 0 ? (
                <div className="text-center py-20 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200">
                  <Users size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400 font-medium text-sm">Aún no hay estudiantes inscritos en tus cursos.</p>
                  <p className="text-slate-400 text-xs mt-1">Comparte tus programas con alumnos para comenzar a recibir inscripciones.</p>
                </div>
              ) : (
                <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-sm">
                  {enrolledStudents.map((student) => (
                    <div key={student.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden shrink-0">
                          {student.studentAvatar ? (
                            <img src={student.studentAvatar} alt={student.studentName} className="w-full h-full object-cover animate-in fade-in" referrerPolicy="no-referrer" />
                          ) : (
                            student.studentName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm leading-tight">{student.studentName}</h4>
                          <p className="text-[11px] text-slate-400 font-semibold">{student.studentEmail}</p>
                          <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-wider">
                            {student.courseTitle}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end gap-1.5 shrink-0 min-w-[150px]">
                        <div className="flex justify-between w-full text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          <span>Progreso</span>
                          <span className="text-primary font-black">{student.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                          <div style={{ width: `${student.progress}%` }} className="bg-primary h-full transition-all duration-500" />
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                          Inscrito: {student.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
