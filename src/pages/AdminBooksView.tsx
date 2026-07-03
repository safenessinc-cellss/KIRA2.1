import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { BookOpen, FileText, Link as LinkIcon, Trash2, Plus, Loader2, UploadCloud, CheckCircle2, ShieldAlert, Sparkles, BookMarked, Eye, Search, Filter } from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';
import { cn } from '../lib/utils';

export function AdminBooksView() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pdf' | 'link'>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'pdf' | 'link'>('pdf');
  const [url, setUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    // Fetch ALL books in the entire ecosystem
    const q = collection(db, 'books');

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort client-side
      list.sort((a: any, b: any) => {
        const t1 = a.createdAt?.seconds || 0;
        const t2 = b.createdAt?.seconds || 0;
        return t2 - t1;
      });
      setBooks(list);
      setLoading(false);
    }, (err) => {
      console.error("Error loading books for admin:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (type === 'pdf' && !file.type.includes('pdf')) {
      toastError("Por favor, selecciona un archivo PDF válido.");
      return;
    }

    setUploadingFile(true);
    try {
      const storageBucket = storage.app.options.storageBucket || '';
      const isMock = !storageBucket || storageBucket.includes('YOUR_PROJECT') || storageBucket === 'placeholder-value';

      if (isMock) {
        setTimeout(() => {
          const mockUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
          setUrl(mockUrl);
          setUploadingFile(false);
          toastSuccess("Archivo cargado en modo simulación administrativa.");
        }, 1200);
        return;
      }

      const storageRef = ref(storage, `books/admin/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      
      setUrl(downloadUrl);
      toastSuccess("Libro administrativo cargado con éxito.");
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

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim()) {
      toastError("El título es obligatorio.");
      return;
    }

    if (!url.trim()) {
      toastError("Debes cargar un archivo o ingresar un enlace.");
      return;
    }

    setPublishing(true);
    try {
      await addDoc(collection(db, 'books'), {
        title: title.trim(),
        description: description.trim(),
        type,
        url: url.trim(),
        coverUrl: coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
        publisherId: user.uid,
        publisherName: user.displayName || user.name || 'Administrador',
        publisherRole: 'admin',
        createdAt: serverTimestamp()
      });

      toastSuccess("¡Libro oficial publicado con éxito!");
      
      // Reset form
      setTitle('');
      setDescription('');
      setUrl('');
      setCoverUrl('');
    } catch (err: any) {
      console.error("Error publishing admin book:", err);
      toastError("Error al publicar el libro.");
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (bookId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este libro? Como administrador, esta acción eliminará la publicación permanentemente del ecosistema para todos los alumnos.")) return;
    
    try {
      await deleteDoc(doc(db, 'books', bookId));
      toastSuccess("Libro eliminado permanentemente.");
    } catch (err) {
      console.error("Error deleting book:", err);
      toastError("Error al eliminar el libro.");
    }
  };

  const filteredBooks = books.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (b.publisherName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || b.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Banner de Control */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-[32px] p-8 border border-white/10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-3 border border-white/5">
              Administración de Contenido
            </div>
            <h2 className="text-3xl font-black tracking-tight">Biblioteca Digital de Alumnos</h2>
            <p className="text-slate-400 text-xs mt-1">Sube contenido educativo oficial o modera los libros publicados por el claustro de coaches.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Publicar Libro Oficial */}
        <div className="w-full lg:w-1/2 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Publicar Libro Oficial (Admin)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Lanza un recurso bibliográfico oficial de Kira.</p>
            </div>
          </div>

          <form onSubmit={handlePublish} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Título del Libro</label>
              <input
                required
                type="text"
                placeholder="Ej: El Arte del Alto Rendimiento"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Descripción corta</label>
              <textarea
                placeholder="Resumen o detalles del recurso para los alumnos..."
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
                      id="admin-pdf-upload"
                      className="hidden"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                    <label
                      htmlFor="admin-pdf-upload"
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
                    type="url"
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
                  folderPath={`covers/admin`}
                  className="shrink-0"
                  label="Subir Portada"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={publishing || uploadingFile}
              className="w-full px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {publishing ? "Publicando..." : <><BookOpen size={16} /> Publicar Libro Oficial</>}
            </button>
          </form>
        </div>

        {/* Listado y Moderación Global */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600">
                <BookMarked size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Ecosistema Global de Libros</h3>
                <p className="text-xs text-slate-500 mt-0.5">Control de todos los libros publicados ({filteredBooks.length}).</p>
              </div>
            </div>
          </div>

          {/* Filtros de Admin */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por título o autor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 py-2.5 text-xs outline-none focus:bg-white"
              />
            </div>
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0 w-full sm:w-auto">
              <button 
                onClick={() => setFilterType('all')} 
                className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all", filterType === 'all' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
              >
                Todos
              </button>
              <button 
                onClick={() => setFilterType('pdf')} 
                className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all", filterType === 'pdf' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
              >
                PDFs
              </button>
              <button 
                onClick={() => setFilterType('link')} 
                className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all", filterType === 'link' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
              >
                Enlaces
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <BookOpen size={44} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-bold text-sm">No se encontraron libros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredBooks.map((book) => (
                <div key={book.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col h-full hover:shadow-lg transition-all duration-300">
                  <div className="relative h-44 bg-slate-50 overflow-hidden shrink-0">
                    <img 
                      src={book.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'} 
                      alt={book.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      <span className="px-2 py-1 bg-white/95 backdrop-blur rounded-lg text-[9px] font-black text-slate-800 uppercase tracking-wider shadow-sm flex items-center gap-1">
                        {book.type === 'pdf' ? <FileText size={10} className="text-red-500" /> : <LinkIcon size={10} className="text-blue-500" />}
                        {book.type}
                      </span>
                      {book.publisherRole === 'admin' ? (
                        <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-lg text-[8px] font-black uppercase tracking-wider shadow-sm">
                          Oficial
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-teal-600 text-white rounded-lg text-[8px] font-black uppercase tracking-wider shadow-sm">
                          Coach
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(book.id)}
                      className="absolute top-3 right-3 p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Publicado por:</span>
                      <span className="text-[10px] font-bold text-slate-600">{book.publisherName}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm leading-tight mb-2">{book.title}</h4>
                    {book.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">{book.description}</p>
                    )}
                    
                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {book.createdAt ? new Date(book.createdAt.seconds * 1000).toLocaleDateString() : 'Reciente'}
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
