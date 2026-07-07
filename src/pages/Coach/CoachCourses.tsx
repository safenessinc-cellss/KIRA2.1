// src/pages/coach/CoachCourses.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { db } from '@/src/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { Loader2, Plus, Edit2, Trash2, BookOpen, Users, DollarSign, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/hooks/useToast';

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  bannerUrl: string;
  status: 'draft' | 'published' | 'archived';
  coachId: string;
  createdAt: any;
  updatedAt?: any;
  studentsCount?: number;
}

export function CoachCourses() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    bannerUrl: '',
    status: 'published' as const
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar cursos en tiempo real
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'courses'),
      where('coachId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const courseList: Course[] = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        // Contar estudiantes inscritos
        const enrollQuery = query(
          collection(db, 'enrollments'),
          where('courseId', '==', doc.id)
        );
        const enrollSnap = await getDocs(enrollQuery);
        
        courseList.push({
          id: doc.id,
          ...data,
          studentsCount: enrollSnap.size
        } as Course);
      }

      setCourses(courseList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching courses:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      if (editingCourse) {
        // Actualizar curso existente
        await updateDoc(doc(db, 'courses', editingCourse.id), {
          ...formData,
          updatedAt: new Date()
        });
        toastSuccess('Curso actualizado exitosamente');
      } else {
        // Crear nuevo curso
        await addDoc(collection(db, 'courses'), {
          ...formData,
          coachId: user.uid,
          createdAt: new Date()
        });
        toastSuccess('Curso creado exitosamente');
      }

      setIsModalOpen(false);
      setEditingCourse(null);
      setFormData({ title: '', description: '', price: 0, bannerUrl: '', status: 'published' });
    } catch (error) {
      console.error("Error saving course:", error);
      toastError('Error al guardar el curso');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('¿Estás seguro de eliminar este curso?')) return;
    
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      toastSuccess('Curso eliminado');
    } catch (error) {
      console.error("Error deleting course:", error);
      toastError('Error al eliminar el curso');
    }
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      price: course.price,
      bannerUrl: course.bannerUrl || '',
      status: course.status
    });
    setIsModalOpen(true);
  };

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
            Studio de Cursos
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gestiona tus programas educativos</p>
        </div>
        <button
          onClick={() => {
            setEditingCourse(null);
            setFormData({ title: '', description: '', price: 0, bannerUrl: '', status: 'published' });
            setIsModalOpen(true);
          }}
          className="px-6 py-3 bg-kirateal text-white rounded-xl font-bold hover:bg-kirateal-dark transition-all shadow-lg shadow-kirateal/20 flex items-center gap-2"
        >
          <Plus size={18} />
          Crear Curso
        </button>
      </div>

      {/* Lista de Cursos */}
      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center">
          <BookOpen size={64} className="mx-auto text-slate-200 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 mb-2">No tienes cursos aún</h3>
          <p className="text-slate-500 text-sm">Crea tu primer curso para empezar a compartir tu conocimiento</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 px-6 py-3 bg-kirateal text-white rounded-xl font-bold hover:bg-kirateal-dark transition-all"
          >
            Crear Curso
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all group"
            >
              {/* Banner */}
              <div className="relative h-48 bg-gradient-to-br from-kirateal/20 to-indigo-200/20 overflow-hidden">
                {course.bannerUrl ? (
                  <img
                    src={course.bannerUrl}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <BookOpen size={48} />
                  </div>
                )}
                <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-bold text-slate-700 shadow-sm">
                  {course.status === 'published' ? 'Publicado' : course.status === 'draft' ? 'Borrador' : 'Archivado'}
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6">
                <h3 className="font-bold text-slate-900 text-lg leading-tight mb-2 line-clamp-2">
                  {course.title}
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2 mb-4">
                  {course.description || 'Sin descripción'}
                </p>

                <div className="flex items-center justify-between text-sm mb-4">
                  <div className="flex items-center gap-1 text-slate-600">
                    <Users size={16} className="text-slate-400" />
                    <span>{course.studentsCount || 0} alumnos</span>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-kirateal">
                    <DollarSign size={16} />
                    <span>${course.price.toFixed(2)}</span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => openEditModal(course)}
                    className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Edit2 size={14} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(course.id)}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación/Edición */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-900">
                {editingCourse ? 'Editar Curso' : 'Crear Nuevo Curso'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Título del Curso
                </label>
                <input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-kirateal/20 outline-none transition-all"
                  placeholder="Ej: Maestría en Inteligencia Emocional"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Descripción
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-kirateal/20 outline-none transition-all resize-none h-24"
                  placeholder="¿Qué lograrán tus alumnos?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Precio ($)
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-kirateal/20 outline-none transition-all"
                    placeholder="49.99"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Estado
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-kirateal/20 outline-none transition-all"
                  >
                    <option value="draft">Borrador</option>
                    <option value="published">Publicado</option>
                    <option value="archived">Archivado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  URL del Banner (opcional)
                </label>
                <input
                  value={formData.bannerUrl}
                  onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-kirateal/20 outline-none transition-all"
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-kirateal text-white rounded-xl font-bold hover:bg-kirateal-dark transition-all shadow-lg shadow-kirateal/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  {isSubmitting ? 'Guardando...' : editingCourse ? 'Actualizar' : 'Crear Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
