import { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, addDoc, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { MessageSquare, Send, User, Users, Search, ChevronRight, GraduationCap, Sparkles, MessageCircle, Clock, BookOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

export function CoachChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Quick reply templates for coaches
  const quickReplies = [
    "¡Excelente trabajo con el último módulo! Sigue así. 🚀",
    "Hola, ¿cómo te ha ido con las prácticas de esta semana?",
    "Recuerda que puedes agendar nuestra sesión de mentoría en el calendario. 📅",
    "He revisado tus respuestas y veo un gran avance. ¿Tienes alguna duda específica?",
    "¡Hola! Paso a saludarte y recordarte que la constancia es la clave del éxito. ✨"
  ];

  // Fetch all students (role === 'alumno')
  useEffect(() => {
    if (!user) return;

    const fetchStudents = async () => {
      try {
        setLoadingStudents(true);
        const usersSnap = await getDocs(collection(db, 'users'));
        const allAlumnos = usersSnap.docs
          .map(d => ({ uid: d.id, ...d.data() } as any))
          .filter(u => u.uid !== user.uid && u.role === 'alumno');
        
        setStudents(allAlumnos);
      } catch (err) {
        console.error('Fetch Students Error:', err);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [user]);

  // Fetch Messages for selected student in real-time
  useEffect(() => {
    if (!user || !selectedStudent) {
      setMessages([]);
      return;
    }

    const chatId = [user.uid, selectedStudent.uid].sort().join('_');

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const serverMsgs = snap.docs.map(d => {
        const data = d.data();
        let createdAtDate = new Date();
        if (data.createdAt) {
          if (data.createdAt.toDate) {
            createdAtDate = data.createdAt.toDate();
          } else if (data.createdAt.seconds) {
            createdAtDate = new Date(data.createdAt.seconds * 1000);
          } else {
            createdAtDate = new Date(data.createdAt);
          }
        }
        return {
          id: d.id,
          ...data,
          createdAt: createdAtDate
        };
      });

      // Sort messages ascending by physical timestamp
      serverMsgs.sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime());

      setMessages(serverMsgs);
      
      // Auto-scroll to bottom
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'messages'));

    return () => unsubscribe();
  }, [user, selectedStudent]);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !user || !selectedStudent) return;

    const content = textToSend.trim();
    const chatId = [user.uid, selectedStudent.uid].sort().join('_');
    const tempId = `temp-${Date.now()}`;

    // Optimistic Update
    const optimisticMsg = {
      id: tempId,
      chatId,
      senderId: user.uid,
      senderName: user.displayName || 'Coach',
      content,
      createdAt: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: user.uid,
        senderName: user.displayName || 'Coach',
        content,
        createdAt: new Date()
      });
    } catch (err) {
      // Rollback optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      handleFirestoreError(err, OperationType.CREATE, 'messages');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Filter students based on search term
  const filteredStudents = students.filter(s => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = (s.displayName || '').toLowerCase().includes(searchLower);
    const emailMatch = (s.email || '').toLowerCase().includes(searchLower);
    return nameMatch || emailMatch;
  });

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[40px] shadow-xl overflow-hidden h-[750px] flex flex-col md:flex-row">
      
      {/* LEFT COLUMN: Student Roster */}
      <div className="w-full md:w-[350px] border-r border-slate-200/60 flex flex-col bg-slate-50/30">
        {/* Search Header */}
        <div className="p-6 border-b border-slate-200/60 bg-white/40">
          <h2 className="text-xl font-black text-slate-900 tracking-tight mb-4 flex items-center gap-2">
            <MessageCircle size={22} className="text-indigo-600" />
            Claustro de Alumnos
          </h2>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar alumno por nombre..."
              className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            />
          </div>
        </div>

        {/* Student Roster List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {loadingStudents ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cargando alumnos...</p>
            </div>
          ) : filteredStudents.length > 0 ? (
            filteredStudents.map((s) => {
              const isSelected = selectedStudent?.uid === s.uid;
              return (
                <button
                  key={s.uid}
                  onClick={() => setSelectedStudent(s)}
                  className={cn(
                    "w-full flex items-center gap-3.5 p-3.5 rounded-3xl transition-all text-left group border",
                    isSelected 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/10" 
                      : "bg-white/50 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-md"
                  )}
                >
                  <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200/50 shadow-sm relative">
                    <img 
                      src={s.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${s.displayName || 'U'}`} 
                      alt="" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {/* Active Indicator Accent */}
                    <span className={cn(
                      "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
                      isSelected ? "bg-emerald-400" : "bg-slate-300"
                    )}></span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-xs font-black truncate",
                      isSelected ? "text-white" : "text-slate-800"
                    )}>{s.displayName || 'Alumno de Kira'}</p>
                    <p className={cn(
                      "text-[10px] truncate font-medium",
                      isSelected ? "text-indigo-200" : "text-slate-400"
                    )}>{s.email}</p>
                    {s.points !== undefined && (
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full",
                        isSelected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500"
                      )}>
                        <Sparkles size={10} /> {s.points} Puntos
                      </span>
                    )}
                  </div>
                  <ChevronRight size={16} className={cn(
                    "shrink-0 transition-transform group-hover:translate-x-0.5",
                    isSelected ? "text-white" : "text-slate-300"
                  )} />
                </button>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-center px-4 gap-3">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
                <Users size={22} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">No se encontraron alumnos</p>
                <p className="text-[10px] text-slate-400 mt-1">Intenta con otro término de búsqueda.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedStudent ? (
          <>
            {/* Chat Pane Header */}
            <div className="p-6 border-b border-slate-200/60 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-slate-200/60 bg-slate-100 shadow-sm">
                  <img 
                    src={selectedStudent.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedStudent.displayName || 'U'}`} 
                    alt="" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">
                    {selectedStudent.displayName || 'Alumno de Kira'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <GraduationCap size={12} className="text-indigo-600" /> Alumno Matriculado
                  </p>
                </div>
              </div>
              
              {/* Short student status stats */}
              <div className="hidden lg:flex items-center gap-4 text-right">
                <div className="border-r border-slate-200 pr-4">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">E-mail</span>
                  <span className="text-xs font-semibold text-slate-700">{selectedStudent.email}</span>
                </div>
                {selectedStudent.createdAt && (
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Registro</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {new Date(selectedStudent.createdAt?.seconds ? selectedStudent.createdAt.seconds * 1000 : selectedStudent.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
              <div className="text-center py-2">
                <span className="text-[9px] font-bold bg-indigo-50/80 text-indigo-600 border border-indigo-100 px-3.5 py-1.5 rounded-full uppercase tracking-widest">
                  Canal de Mensajería Directa Privada
                </span>
              </div>

              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12 px-4 text-center">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 text-indigo-600 shadow-sm">
                    <MessageSquare size={24} />
                  </div>
                  <p className="text-xs font-black text-slate-700 mb-1">Inicia la conversación privada</p>
                  <p className="text-[10px] leading-relaxed max-w-[280px] text-slate-400 font-medium">
                    Envía sugerencias, guías o resuelve dudas personalizadas para apoyar a {selectedStudent.displayName?.split(' ')[0]}.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => {
                    const isMe = m.senderId === user?.uid;
                    return (
                      <div key={m.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                        <div className={cn(
                          "max-w-[70%] px-4.5 py-3 rounded-2xl text-[13px] shadow-sm leading-relaxed",
                          isMe 
                            ? "bg-indigo-600 text-white rounded-tr-none font-medium" 
                            : "bg-white text-slate-800 border border-slate-100 rounded-tl-none font-medium"
                        )}>
                          {m.content}
                        </div>
                        <span className="text-[9px] text-slate-400/80 font-bold mt-1 px-1 flex items-center gap-1">
                          <Clock size={10} />
                          {m.createdAt ? m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={scrollRef} />
                </div>
              )}
            </div>

            {/* Quick replies block */}
            <div className="px-6 py-3 border-t border-slate-150 bg-slate-50/50 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2 shrink-0">Respuestas rápidas:</span>
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(reply)}
                  className="text-[10px] font-bold bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-500 rounded-full px-3 py-1.5 transition-all shrink-0 shadow-sm"
                >
                  {reply.length > 40 ? reply.substring(0, 38) + "..." : reply}
                </button>
              ))}
            </div>

            {/* Chat Input form */}
            <form onSubmit={handleFormSubmit} className="p-6 border-t border-slate-200/60 flex gap-3.5 bg-white">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Escribe un mensaje de asesoría privada a ${selectedStudent.displayName?.split(' ')[0]}...`}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4.5 py-4 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
              <button 
                type="submit"
                className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/10"
              >
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          /* Empty Chat Area Placeholder */
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/10">
            <div className="w-16 h-16 bg-indigo-50/60 rounded-[24px] flex items-center justify-center mb-4 text-indigo-600 border border-indigo-100 shadow-sm">
              <MessageSquare size={28} />
            </div>
            <h3 className="text-base font-black text-slate-800 tracking-tight mb-2">Canal de Mentoría Privada</h3>
            <p className="text-xs leading-relaxed max-w-[340px] text-slate-500 font-medium">
              Selecciona un alumno de la barra lateral para revisar su historial de conversación e iniciar una asesoría privada uno a uno.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 max-w-lg justify-center">
              <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-white border border-slate-200/60 px-3 py-1.5 rounded-2xl shadow-sm">
                <BookOpen size={13} className="text-indigo-600" /> Resuelve dudas académicas
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-white border border-slate-200/60 px-3 py-1.5 rounded-2xl shadow-sm">
                <Sparkles size={13} className="text-amber-500" /> Ofrece feedback positivo
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
