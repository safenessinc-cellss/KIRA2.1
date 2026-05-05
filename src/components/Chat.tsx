import { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, addDoc, onSnapshot, limit, getDoc, getDocs, doc } from 'firebase/firestore';
import { MessageSquare, Send, X, User, Users, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

export function ChatWidget() {
  const { user, role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messageLimit, setMessageLimit] = useState(50);

  // Fetch Contacts
  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchContacts = async () => {
      try {
        if (role === 'alumno') {
          // Get my enrollments to find my coaches
          const enrollQ = query(collection(db, 'enrollments'), where('userId', '==', user.uid));
          const enrollSnap = await getDocs(enrollQ);
          const courseIds = enrollSnap.docs.map(d => d.data().courseId);
          
          if (courseIds.length > 0) {
            const coachesMap = new Map();
            for (const cid of courseIds) {
              const cDoc = await getDoc(doc(db, 'courses', cid));
              if (cDoc.exists()) {
                const cData = cDoc.data();
                if (!coachesMap.has(cData.coachId)) {
                  const coachProfile = await getDoc(doc(db, 'users', cData.coachId));
                  if (coachProfile.exists()) {
                    coachesMap.set(cData.coachId, { uid: cData.coachId, ...coachProfile.data() });
                  }
                }
              }
            }
            setContacts(Array.from(coachesMap.values()));
          }
        } else if (role === 'coach') {
          // Get my courses to find my students
          const coursesQ = query(collection(db, 'courses'), where('coachId', '==', user.uid));
          const coursesSnap = await getDocs(coursesQ);
          const courseIds = coursesSnap.docs.map(d => d.id);

          if (courseIds.length > 0) {
            const studentsMap = new Map();
            for (const cid of courseIds) {
              const enrollQ = query(collection(db, 'enrollments'), where('courseId', '==', cid));
              const enrollSnap = await getDocs(enrollQ);
              for (const eDoc of enrollSnap.docs) {
                const sId = eDoc.data().userId;
                if (!studentsMap.has(sId)) {
                  const studentProfile = await getDoc(doc(db, 'users', sId));
                  if (studentProfile.exists()) {
                    studentsMap.set(sId, { uid: sId, ...studentProfile.data() });
                  }
                }
              }
            }
            setContacts(Array.from(studentsMap.values()));
          }
        }
      } catch (err) {
        console.error('Fetch Contacts Error:', err);
      }
    };

    fetchContacts();
  }, [isOpen, user, role]);

  // Fetch Messages for selected contact
  useEffect(() => {
    if (!isOpen || !user || !selectedContact) {
      setMessages([]);
      return;
    }

    const chatId = [user.uid, selectedContact.uid].sort().join('_');

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('createdAt', 'desc'),
      limit(messageLimit)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const serverMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      // Reversing because we queried desc
      
      setMessages(prev => {
        // Keep optimistic messages that are not yet on the server
        const stillSending = prev.filter(m => 
          m.id.toString().startsWith('temp-') && 
          !serverMsgs.some((sm: any) => sm.content === m.content && sm.senderId === m.senderId)
        );
        
        const combined = [...serverMsgs.reverse(), ...stillSending];
        return combined.sort((a, b) => {
          const timeA = (a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt).getTime();
          const timeB = (b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt).getTime();
          return timeA - timeB;
        });
      });

      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'messages'));

    return () => unsubscribe();
  }, [isOpen, user, selectedContact, messageLimit]);

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
      senderName: user.displayName,
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
        senderName: user.displayName,
        content,
        createdAt: new Date()
      });
    } catch (err) {
      // Rollback optimistic message if error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      handleFirestoreError(err, OperationType.CREATE, 'messages');
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-primary text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-50"
      >
        <MessageSquare size={24} />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col z-50 animate-in slide-in-from-bottom-5">
          <div className="p-4 border-b border-slate-100 bg-primary rounded-t-3xl flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              {selectedContact ? (
                <button 
                  onClick={() => setSelectedContact(null)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors mr-1"
                >
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <User size={16} />
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  {selectedContact ? selectedContact.displayName : "Mis Contactos Kira"}
                </h3>
                <p className="text-[10px] opacity-80">
                  {selectedContact ? "En línea" : `${contacts.length} personas conectadas`}
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {!selectedContact ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {contacts.length > 0 ? (
                contacts.map(c => (
                  <button 
                    key={c.uid}
                    onClick={() => {
                      setSelectedContact(c);
                      setMessageLimit(50);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {c.displayName?.[0] || 'U'}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-800">{c.displayName}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-tighter">
                        {role === 'coach' ? 'Alumno' : 'Coach'}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                    <Users size={32} className="opacity-20" />
                  </div>
                  <p className="text-xs italic leading-relaxed">
                    {role === 'alumno' 
                      ? "Inscríbete en un curso para chatear con tu coach."
                      : "Espera a que los alumnos se inscriban en tus cursos para comenzar a chatear."}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length >= messageLimit && (
                  <div className="flex justify-center pb-2">
                    <button 
                      onClick={() => setMessageLimit(prev => prev + 50)}
                      className="text-xs text-primary font-bold hover:underline bg-primary/5 px-4 py-1.5 rounded-full"
                    >
                      Cargar mensajes anteriores
                    </button>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex flex-col", m.senderId === user?.uid ? "items-end" : "items-start")}>
                    <div className={cn(
                      "max-w-[80%] px-4 py-2 rounded-2xl text-[13px] shadow-sm",
                      m.senderId === user?.uid ? "bg-primary text-white rounded-tr-none" : "bg-slate-100 text-slate-800 rounded-tl-none"
                    )}>
                      {m.content}
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>

              <form onSubmit={sendMessage} className="p-4 border-t border-slate-100 flex gap-2 bg-slate-50 rounded-b-3xl">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button className="p-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors">
                  <Send size={18} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
