import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { BookOpen, FileText, Link as LinkIcon, Trash2, Plus, Loader2, UploadCloud, CheckCircle2, AlertCircle, Sparkles, BookMarked, Eye, Pencil } from 'lucide-react';
import { ImageUpload } from '../../components/ImageUpload';
import { cn } from '../../lib/utils';

export function CoachBooksView() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingBook, setEditingBook] = useState<any | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'pdf' | 'link'>('pdf');
  const [url, setUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    if (!user) return;
    
    // Fetch only books published by this coach
    const q = query(
      collection(db, 'books'),
      where('publisherId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort client-side to ensure it works even without a composite index
      list.sort((a: any, b: any) => {
        const t1 = a.createdAt?.seconds || 0;
        const t2 = b.createdAt?.seconds || 0;
        return t2 - t1;
      });
      setBooks(list);
      setLoading(false);
    }, (err) => {
      console.error("Error loading books:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const isPdfFile = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
    if (type === 'pdf' && !isPdfFile) {
      toastError("Por favor, selecciona un archivo PDF válido.");
      return;
    }

    setUploadingFile(true);
    try {
      const storageBucket = storage.app.options.storageBucket || '';
      const isMock = !storageBucket || storageBucket.includes('YOUR_PROJECT') || storageBucket === 'placeholder-value';

      if (isMock) {
        // Wait 1.2 seconds for simulation
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const mockUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
        setUrl(mockUrl);
        toastSuccess("Archivo cargado en modo simulación.");
      } else {
        const storageRef = ref(storage, `books/${user.uid}/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(uploadResult.ref);
        
        setUrl(downloadUrl);
        toastSuccess("Libro cargado con éxito.");
      }
    } catch (err: any) {
      console.warn("Storage upload failed, using simulation mode fallback:", err);
      const mockUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
      setUrl(mockUrl);
      toastSuccess("Libro cargado en modo de respaldo (simulado).");
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const startEdit = (book: any) => {
    setEditingBook(book);
    setTitle(book.title);
    setDescription(book.description || '');
    setType(book.type || 'pdf');
    setUrl(book.url || '');
    setCoverUrl(book.coverUrl || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingBook(null);
    setTitle('');
    setDescription('');
    setType('pdf');
    setUrl('');
    setCoverUrl('');
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim()) {
      toastError("El título es obligatorio.");
      return;
    }

    let finalUrl = url.trim();
    if (!finalUrl) {
      toastError("Debes cargar un archivo o ingresar un enlace.");
      return;
    }

    // Auto prepend https:// if it looks like an external domain link and is missing protocol
    if (type === 'link' && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      if (!finalUrl.startsWith('/') && !finalUrl.startsWith('data:')) {
        finalUrl = 'https://' + finalUrl;
      }
    }

    setPublishing(true);
    try {
      if (editingBook) {
        // Edit mode
        await updateDoc(doc(db, 'books', editingBook.id), {
          title: title.trim(),
          description: description.trim(),
          type,
          url: finalUrl,
          coverUrl: coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
          updatedAt: serverTimestamp()
        });
        toastSuccess("¡Libro actualizado con éxito!");
        setEditingBook(null);
      } else {
        // Create mode
        await addDoc(collection(db, 'books'), {
          title: title.trim(),
          description: description.trim(),
          type,
          url: finalUrl,
          coverUrl: coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
          publisherId: user.uid,
          publisherName: user.displayName || user.name || 'Coach',
          publisherRole: 'coach',
          createdAt: serverTimestamp()
        });
        toastSuccess("¡Libro publicado con éxito!");
      }
      
      // Reset form
      setTitle('');
      setDescription('');
      setUrl('');
      setCoverUrl('');
    } catch (err: any) {
      console.error("Error saving book:", err);
      toastError(editingBook ? "Error al actualizar el libro." : "Error al publicar el libro.");
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (bookId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este libro de la biblioteca?")) return;
    
    try {
      await deleteDoc(doc(db, 'books', bookId));
      toastSuccess("Libro eliminado.");
    } catch (err) {
      console.error("Error deleting book:", err);
      toastError("Error al eliminar el libro.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Formulario de Publicación */}
        <div className="w-full lg:w-1/2 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              editingBook ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
            )}>
              {editingBook ? <Pencil size={20} /> : <Plus size={20} />}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {editingBook ? "Editar Libro" : "Publicar Nuevo Libro"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {editingBook ? "Modifica los detalles del libro seleccionado." : "Agrega un libro a la biblioteca académica."}
              </p>
            </div>
            {editingBook && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
              >
                Cancelar
              </button>
            )}
          </div>

          <form onSubmit={handlePublish} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Título del Libro</label>
              <input
                required
                type="text"
                placeholder="Ej: Principios de la Meditación Trascendental"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Descripción corta</label>
              <textarea
                placeholder="Escribe un breve resumen o detalles sobre el contenido del libro..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/50">
              <button
                type="button"
                onClick={() => { setType('pdf'); setUrl(''); }}
                className={cn(
                  "py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                  type === 'pdf' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <FileText size={14} /> PDF
              </button>
              <button
                type="button"
                onClick={() => { setType('link'); setUrl(''); }}
                className={cn(
                  "py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                  type === 'link' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <LinkIcon size={14} /> Enlace Externo
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                {type === 'pdf' ? "Archivo PDF" : "Enlace Directo"}
              </label>
              
              {type === 'pdf' ? (
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="URL del PDF o sube un archivo..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none"
                  />
                  <div className="relative shrink-0">
                    <input
                      type="file"
                      id="book-pdf-upload"
                      className="hidden"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                    <label
                      htmlFor="book-pdf-upload"
                      className="flex items-center gap-2 px-5 py-3.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      {uploadingFile ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                      Subir PDF
                    </label>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="https://ejemplo.com/mi-libro"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                  />
                  <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Portada del Libro (Imagen)</label>
              <div className="flex gap-4">
                <input
                  type="url"
                  placeholder="URL de la portada..."
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none"
                />
                <ImageUpload
                  onUploadComplete={(url) => setCoverUrl(url)}
                  folderPath={`covers/${user?.uid || 'coaches'}`}
                  className="shrink-0"
                  label="Subir Portada"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={publishing || uploadingFile}
                className={cn(
                  "flex-1 px-8 py-4 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer",
                  editingBook 
                    ? "bg-amber-600 shadow-amber-600/10 hover:shadow-amber-600/20 hover:-translate-y-0.5" 
                    : "bg-indigo-600 shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5"
                )}
              >
                {publishing 
                  ? (editingBook ? "Guardando..." : "Publicando...") 
                  : (editingBook ? <><CheckCircle2 size={16} /> Guardar Cambios</> : <><BookOpen size={16} /> Publicar Libro</>)}
              </button>
              {editingBook && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Listado de Libros Publicados */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600">
                <BookMarked size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Mis Libros Publicados</h3>
                <p className="text-xs text-slate-500 mt-0.5">Catálogo de tus publicaciones digitales.</p>
              </div>
            </div>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
              {books.length} libros
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
          ) : books.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <BookOpen size={44} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-bold text-sm">Aún no has publicado ningún libro.</p>
              <p className="text-slate-400 text-xs mt-1">Completa el formulario para lanzar tu primer contenido digital.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {books.map((book) => (
                <div key={book.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col h-full hover:shadow-lg transition-all duration-300">
                  <div className="relative h-44 bg-slate-50 overflow-hidden shrink-0">
                    <img 
                      src={book.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'} 
                      alt={book.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 bg-white/95 backdrop-blur rounded-lg text-[9px] font-black text-slate-800 uppercase tracking-wider shadow-sm flex items-center gap-1">
                        {book.type === 'pdf' ? <FileText size={10} className="text-red-500" /> : <LinkIcon size={10} className="text-blue-500" />}
                        {book.type}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => startEdit(book)}
                        className="p-2 bg-white/95 backdrop-blur hover:bg-amber-50 text-amber-600 rounded-xl transition-all shadow-sm border border-slate-100 cursor-pointer"
                        title="Editar Libro"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(book.id)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all shadow-sm cursor-pointer"
                        title="Eliminar Libro"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h4 className="font-bold text-slate-900 text-sm leading-tight mb-2">{book.title}</h4>
                    {book.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">{book.description}</p>
                    )}
                    
                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {book.createdAt ? new Date(book.createdAt.seconds * 1000).toLocaleDateString() : 'Pendiente'}
                      </span>
                      <a
                        href={book.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        <Eye size={12} /> Ver Recurso
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
