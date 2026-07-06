import { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, addDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { MessageSquare, Send, X, User, Users, ArrowLeft, Search, GraduationCap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

export function ChatWidget() {
  const { user, role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listen for global custom event to open a specific mentor chat
  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent;
      const coach = customEvent.detail;
      if (coach && user) {
        setIsOpen(true);
        const contactObj = {
          uid: coach.uid || coach.id,
          displayName: coach.displayName || 'Mentor Kira',
          photoURL: coach.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${coach.displayName || 'M'}`,
          specialty: coach.specialty || 'Bienestar Integral',
          role: coach.role || 'coach'
        };
        setSelectedContact(contactObj);
      }
    };
    window.addEventListener('open-mentor-chat', handleOpenChat);
    return () => window.removeEventListener('open-mentor-chat', handleOpenChat);
  }, [user]);

  // Fetch all users to populate the contact list
  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchAllContacts = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const allUsers = usersSnap.docs
          .map(d => ({ uid: d.id, ...d.data() } as any))
          .filter(u => u.uid !== user.uid); // Exclude current user
        
        setContacts(allUsers);
      } catch (err) {
        console.error('Fetch Contacts Error:', err);
      }
    };

    fetchAllContacts();
  }, [isOpen, user]);

  // Fetch Messages for selected contact (index-independent client-side sorting)
  useEffect(() => {
    if (!isOpen || !user || !selectedContact) {
      setMessages([]);
      return;
    }

    const chatId = [user.uid, selectedContact.uid].sort().join('_');

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

      // Sort messages ascending by createdAt
      serverMsgs.sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime());

      setMessages(serverMsgs);
      
      // Smooth scroll to bottom
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'messages'));

    return () => unsubscribe();
  }, [isOpen, user, selectedContact]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !selectedContact) return;

    const content = input.trim();
    const chatId = [user.uid, selectedContact.uid].sort().join('_');
    const tempId = `temp-${Date.now()}`;

    // Optimistic Update
    const optimisticMsg = {
      id: tempId,
      chatId,
      senderId: user.uid,
      senderName: user.displayName || 'Tú',
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
        senderName: user.displayName || 'Usuario',
        content,
        createdAt: new Date()
      });
    } catch (err) {
      // Rollback optimistic message if error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      handleFirestoreError(err, OperationType.CREATE, 'messages');
    }
  };

  // Filter contacts based on search term
  const filteredContacts = contacts.filter(c => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = (c.displayName || '').toLowerCase().includes(searchLower);
    const emailMatch = (c.email || '').toLowerCase().includes(searchLower);
    const specialtyMatch = (c.specialty || '').toLowerCase().includes(searchLower);
    return nameMatch || emailMatch || specialtyMatch;
  });

  // Group contacts
  const mentorsList = filteredContacts.filter(c => c.role === 'coach' || c.role === 'admin');
  const alumnosList = filteredContacts.filter(c => c.role === 'alumno');

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4.5 bg-kirateal text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border border-kirateal/20 hover:bg-kirateal-dark group"
        id="kira-chat-widget-button"
      >
        <MessageSquare size={26} className="group-hover:rotate-6 transition-transform" />
      </button>

      {isOpen && (
        <div 
          className="fixed bottom-24 right-6 w-[360px] md:w-[420px] h-[550px] bg-white rounded-[32px] shadow-[0_20px_50px_rgba(15,23,42,0.15)] border border-slate-100 flex flex-col z-50 animate-in slide-in-from-bottom-5 duration-300"
          id="kira-chat-window"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 bg-tech-slate rounded-t-[32px] flex justify-between items-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-kirateal/10 rounded-full blur-2xl -mt-8 -mr-8 pointer-events-none"></div>
            <div className="flex items-center gap-3 relative z-10">
              {selectedContact ? (
                <button 
                  onClick={() => setSelectedContact(null)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors mr-1"
                >
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <div className="w-9 h-9 rounded-2xl bg-kirateal/20 border border-kirateal/30 flex items-center justify-center text-kirateal">
                  <MessageSquare size={18} />
                </div>
              )}
              <div>
                <h3 className="text-sm font-black tracking-tight font-sans">
                  {selectedContact ? selectedContact.displayName : "Chat Privado Kira"}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {selectedContact 
                    ? (selectedContact.specialty || (selectedContact.role === 'coach' ? 'Coach' : selectedContact.role === 'admin' ? 'Administrador' : 'Alumno'))
                    : "Conexión Directa en la Red"
                  }
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1.5 rounded-full transition-colors relative z-10 text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          {!selectedContact ? (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
              {/* Search Bar */}
              <div className="p-4 bg-white border-b border-slate-100">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar mentor, coach o alumno..."
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-kirateal/20 focus:border-kirateal transition-all"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Contact List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Group 1: Mentors and Coaches */}
                {mentorsList.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                      <GraduationCap size={12} className="text-kirateal" /> Mentores & Coaches
                    </h4>
                    <div className="space-y-1">
                      {mentorsList.map(c => (
                        <button 
                          key={c.uid}
                          onClick={() => {
                            setSelectedContact(c);
                          }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white hover:shadow-md hover:border-slate-100 transition-all border border-transparent text-left"
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                            <img 
                              src={c.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${c.displayName || 'C'}`} 
                              alt="" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{c.displayName}</p>
                            <p className="text-[10px] text-slate-400 truncate font-semibold uppercase tracking-tight">{c.specialty || (c.role === 'admin' ? 'Kira Admin' : 'Life Coach')}</p>
                          </div>
                          <span className="text-[9px] font-bold text-kirateal bg-kirateal/10 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">Mentor</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Group 2: Compañeros (Students) */}
                {alumnosList.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                      <Users size={12} className="text-intel-indigo" /> Alumnos & Alumnas
                    </h4>
                    <div className="space-y-1">
                      {alumnosList.map(c => (
                        <button 
                          key={c.uid}
                          onClick={() => {
                            setSelectedContact(c);
                          }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white hover:shadow-md hover:border-slate-100 transition-all border border-transparent text-left"
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                            <img 
                              src={c.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${c.displayName || 'U'}`} 
                              alt="" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{c.displayName}</p>
                            <p className="text-[10px] text-slate-400 truncate">{c.email}</p>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">Alumno</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {filteredContacts.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3 text-center px-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
                      <Users size={24} />
                    </div>
                    <p className="text-xs font-medium leading-relaxed">
                      No se encontraron usuarios en la red que coincidan con tu búsqueda.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Messages View */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 flex flex-col">
                <div className="text-center py-2">
                  <span className="text-[9px] font-bold bg-slate-200/60 text-slate-500 px-3 py-1 rounded-full uppercase tracking-wider">
                    Conexión Encriptada de Extremo a Extremo
                  </span>
                </div>

                {messages.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8 px-4 text-center">
                    <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center mb-3 shadow-sm text-kirateal">
                      <MessageSquare size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-700 mb-1">¡Inicia una conversación!</p>
                    <p className="text-[10px] leading-relaxed max-w-[200px]">
                      Escribe un mensaje privado para conectar con {selectedContact.displayName}.
                    </p>
                  </div>
                )}

                <div className="space-y-3 flex-1">
                  {messages.map((m) => {
                    const isMe = m.senderId === user?.uid;
                    return (
                      <div key={m.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                        <div className={cn(
                          "max-w-[75%] px-4 py-2.5 rounded-2xl text-[13px] shadow-sm leading-relaxed",
                          isMe 
                            ? "bg-kirateal text-white rounded-tr-none font-medium" 
                            : "bg-white text-slate-800 border border-slate-100 rounded-tl-none font-medium"
                        )}>
                          {m.content}
                        </div>
                        <span className="text-[9px] text-slate-400/80 font-semibold mt-1 px-1">
                          {m.createdAt ? m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={scrollRef} />
                </div>
              </div>

              {/* Chat Form */}
              <form onSubmit={sendMessage} className="p-4 border-t border-slate-100 flex gap-2 bg-white rounded-b-[32px]">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Mensaje a ${selectedContact.displayName.split(' ')[0]}...`}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-kirateal/20 focus:border-kirateal transition-all font-medium"
                />
                <button className="p-3 bg-kirateal text-white rounded-2xl hover:bg-kirateal-dark hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-md shadow-kirateal/10">
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
