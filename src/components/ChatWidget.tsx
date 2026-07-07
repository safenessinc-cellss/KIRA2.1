// src/components/ChatWidget.tsx
import { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, addDoc, onSnapshot, limit, getDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import { MessageSquare, Send, X, User, Users, ArrowLeft, Shield, ShieldAlert, ShieldCheck, Calendar, Sparkles, Star, CreditCard, ExternalLink, Heart } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

export function ChatWidget() {
  const { user, role } = useAuth();
  const { success, error: toastError, warning: toastWarning } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [manualContacts, setManualContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messageLimit, setMessageLimit] = useState(50);

  // States for session proposals
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedDuration, setProposedDuration] = useState('60');
  const [proposedPrice, setProposedPrice] = useState('30');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // States for reviews/ratings
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submittingReview, setSubmittingReview] = useState<Record<string, boolean>>({});
  const [showContactInfo, setShowContactInfo] = useState<Record<string, boolean>>({});

  // ESCUCHAR AMBOS EVENTOS: open-kira-chat Y open-mentor-chat
  useEffect(() => {
    // Handler para 'open-kira-chat' (existente)
    const handleOpenKiraChat = (e: Event) => {
      const customEvent = e as CustomEvent;
      const coach = customEvent.detail?.coach;
      if (coach) {
        const resolvedCoach = {
          uid: coach.uid || coach.id,
          displayName: coach.displayName,
          photoURL: coach.photoURL,
          ...coach
        };
        setManualContacts(prev => {
          if (!prev.some(c => c.uid === resolvedCoach.uid)) {
            return [resolvedCoach, ...prev];
          }
          return prev;
        });
        setSelectedContact(resolvedCoach);
        setIsOpen(true);
      }
    };

    // Handler para 'open-mentor-chat' (usado en Dashboard)
    const handleOpenMentorChat = (e: Event) => {
      const customEvent = e as CustomEvent;
      const mentor = customEvent.detail;
      if (mentor) {
        const resolvedMentor = {
          uid: mentor.id || mentor.uid,
          displayName: mentor.displayName,
          photoURL: mentor.photoURL,
          specialty: mentor.specialty,
          role: mentor.role || 'coach',
          ...mentor
        };
        setManualContacts(prev => {
          if (!prev.some(c => c.uid === resolvedMentor.uid)) {
            return [resolvedMentor, ...prev];
          }
          return prev;
        });
        setSelectedContact(resolvedMentor);
        setIsOpen(true);
      }
    };

    window.addEventListener('open-kira-chat', handleOpenKiraChat);
    window.addEventListener('open-mentor-chat', handleOpenMentorChat);

    return () => {
      window.removeEventListener('open-kira-chat', handleOpenKiraChat);
      window.removeEventListener('open-mentor-chat', handleOpenMentorChat);
    };
  }, []);

  // Resto del código del ChatWidget (fetchContacts, sendMessage, etc.)
  // ... (mantén todo el código existente de tu ChatWidget)
  // Asegúrate de que el resto del archivo esté intacto

  const allContacts = [...manualContacts, ...contacts].filter((item, index, self) =>
    index === self.findIndex((t) => t.uid === item.uid)
  );

  // Fetch Contacts
  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchContacts = async () => {
      try {
        const contactsMap = new Map<string, any>();

        // 1. Fetch by academic relationship (enrollments)
        if (role === 'alumno') {
          const enrollQ = query(collection(db, 'enrollments'), where('userId', '==', user.uid));
          const enrollSnap = await getDocs(enrollQ);
          const courseIds = enrollSnap.docs.map(d => d.data().courseId);
          
          if (courseIds.length > 0) {
            for (const cid of courseIds) {
              const cDoc = await getDoc(doc(db, 'courses', cid));
              if (cDoc.exists()) {
                const cData = cDoc.data();
                if (!contactsMap.has(cData.coachId)) {
                  const coachProfile = await getDoc(doc(db, 'users', cData.coachId));
                  if (coachProfile.exists()) {
                    contactsMap.set(cData.coachId, { uid: cData.coachId, ...coachProfile.data() });
                  }
                }
              }
            }
          }
        } else if (role === 'coach') {
          const coursesQ = query(collection(db, 'courses'), where('coachId', '==', user.uid));
          const coursesSnap = await getDocs(coursesQ);
          const courseIds = coursesSnap.docs.map(d => d.id);

          if (courseIds.length > 0) {
            for (const cid of courseIds) {
              const enrollQ = query(collection(db, 'enrollments'), where('courseId', '==', cid));
              const enrollSnap = await getDocs(enrollQ);
              for (const eDoc of enrollSnap.docs) {
                const sId = eDoc.data().userId;
                if (!contactsMap.has(sId)) {
                  const studentProfile = await getDoc(doc(db, 'users', sId));
                  if (studentProfile.exists()) {
                    contactsMap.set(sId, { uid: sId, ...studentProfile.data() });
                  }
                }
              }
            }
          }
        }

        // 2. Fallback: Scan existing chats/messages
        const contactIdsFromMessages = new Set<string>();

        try {
          const partQ = query(collection(db, 'messages'), where('participants', 'array-contains', user.uid));
          const partSnap = await getDocs(partQ);
          partSnap.docs.forEach(d => {
            const data = d.data();
            const otherId = data.participants?.find((p: string) => p !== user.uid);
            if (otherId) contactIdsFromMessages.add(otherId);
          });
        } catch (e) {
          console.warn("Could not fetch contacts by participants array:", e);
        }

        try {
          const sentQ = query(collection(db, 'messages'), where('senderId', '==', user.uid));
          const sentSnap = await getDocs(sentQ);
          sentSnap.docs.forEach(d => {
            const data = d.data();
            if (data.chatId) {
              const parts = data.chatId.split('_');
              const otherId = parts.find((p: string) => p !== user.uid);
              if (otherId) contactIdsFromMessages.add(otherId);
            }
          });
        } catch (e) {
          console.warn("Could not fetch contacts by senderId:", e);
        }

        for (const otherId of contactIdsFromMessages) {
          if (!contactsMap.has(otherId)) {
            const uDoc = await getDoc(doc(db, 'users', otherId));
            if (uDoc.exists()) {
              contactsMap.set(otherId, { uid: otherId, ...uDoc.data() });
            }
          }
        }

        setContacts(Array.from(contactsMap.values()));
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
      
      setMessages(prev => {
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

  // Automated contact warning detection
  const containsContactInfo = (text: string) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phoneRegex = /(\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
    const linkRegex = /(wa\.me|whatsapp\.com|t\.me|telegram\.me|@\w{4,})/i;
    
    const sanitizedText = text.replace(/[\s.-]/g, '');
    const rawDigitSequence = /\b\d{7,15}\b/;
    
    return emailRegex.test(text) || phoneRegex.test(text) || linkRegex.test(text) || rawDigitSequence.test(sanitizedText);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !selectedContact) return;

    const content = input.trim();
    const chatId = [user.uid, selectedContact.uid].sort().join('_');

    // 1. Anti-fraud intercept
    if (containsContactInfo(content)) {
      toastWarning('Intento de contacto externo detectado. Canalizado por seguridad.');
      setInput('');
      
      try {
        await addDoc(collection(db, 'messages'), {
          chatId,
          senderId: 'kira-guard',
          senderName: 'Mediador Kira',
          type: 'contact_warning',
          content: '⚠️ Alto ahí. Has intentado compartir un dato de contacto externo. Por tu seguridad y la del otro usuario, Kira Coach no permite compartir datos personales hasta que la transacción (sesión) esté completada. Si deseas compartirlo después, usa el botón de \'Compartir contacto seguro\' que aparecerá al finalizar el pago.',
          participants: [user.uid, selectedContact.uid],
          createdAt: new Date()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'messages');
      }
      return;
    }

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
        participants: [user.uid, selectedContact.uid],
        createdAt: new Date()
      });
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      handleFirestoreError(err, OperationType.CREATE, 'messages');
    }
  };

  // Propose a secure session from Coach
  const handleSendOffer = async () => {
    if (!proposedDate || !user || !selectedContact) return;
    setSubmittingOffer(true);
    try {
      const chatId = [user.uid, selectedContact.uid].sort().join('_');
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: user.uid,
        senderName: user.displayName || 'Coach',
        content: `Propuesta de Sesión para el ${new Date(proposedDate).toLocaleString()}`,
        participants: [user.uid, selectedContact.uid],
        createdAt: new Date(),
        type: 'session_offer',
        offerData: {
          date: proposedDate,
          duration: parseInt(proposedDuration) || 60,
          price: parseInt(proposedPrice) || 30,
          status: 'pending'
        }
      });
      success('Propuesta de sesión enviada con éxito.');
      setShowOfferForm(false);
      setProposedDate('');
    } catch (err: any) {
      console.error('Send Offer Error:', err);
      toastError('Error al enviar la propuesta: ' + err.message);
    } finally {
      setSubmittingOffer(false);
    }
  };

  // Secure checkout & points settlement by Kira Pay
  const handleAcceptOffer = async (msgId: string, offer: any) => {
    if (!user || !selectedContact) return;
    try {
      const studentDocRef = doc(db, 'users', user.uid);
      const studentSnap = await getDoc(studentDocRef);
      if (!studentSnap.exists()) {
        toastError('No se encontró tu perfil de usuario.');
        return;
      }
      const studentData = studentSnap.data();
      const currentPoints = studentData.points || 0;
      const price = offer.price || 0;

      if (currentPoints < price) {
        toastError(`No tienes suficientes puntos de consciencia (${currentPoints} de ${price} requeridos). ¡Consigue más en tu Diario!`);
        return;
      }

      const coachDocRef = doc(db, 'users', selectedContact.uid);
      const coachSnap = await getDoc(coachDocRef);
      let coachPoints = 0;
      if (coachSnap.exists()) {
        coachPoints = coachSnap.data().points || 0;
      }

      await updateDoc(studentDocRef, { points: currentPoints - price });
      if (coachSnap.exists()) {
        await updateDoc(coachDocRef, { points: coachPoints + price });
      }

      const msgRef = doc(db, 'messages', msgId);
      await updateDoc(msgRef, {
        'offerData.status': 'accepted'
      });

      const chatId = [user.uid, selectedContact.uid].sort().join('_');
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: 'kira-guard',
        senderName: 'Mediador Kira',
        type: 'system',
        content: `🎉 ¡Pago confirmado! Sesión programada con éxito para el ${new Date(offer.date).toLocaleString()}. La transacción por ${price} puntos ha sido completada de manera segura por Kira Pay. Ahora es seguro compartir información de contacto si lo desean.`,
        participants: [user.uid, selectedContact.uid],
        createdAt: new Date()
      });

      success('¡Pago procesado con éxito por Kira Pay! Sesión confirmada.');
    } catch (err: any) {
      console.error('Accept Offer Error:', err);
      toastError('Error al procesar el pago: ' + err.message);
    }
  };

  const handleDeclineOffer = async (msgId: string) => {
    try {
      const msgRef = doc(db, 'messages', msgId);
      await updateDoc(msgRef, {
        'offerData.status': 'declined'
      });
      success('Propuesta rechazada.');
    } catch (err: any) {
      console.error('Decline Offer Error:', err);
      toastError('Error al declinar: ' + err.message);
    }
  };

  // Complete session and prompt feedback rating
  const handleCompleteSession = async (msgId: string, offer: any) => {
    try {
      const msgRef = doc(db, 'messages', msgId);
      await updateDoc(msgRef, {
        'offerData.status': 'completed'
      });

      const chatId = [user!.uid, selectedContact.uid].sort().join('_');
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: 'kira-guard',
        senderName: 'Mediador Kira',
        type: 'session_review',
        content: `Calificación de la sesión de ${selectedContact.displayName}`,
        participants: [user!.uid, selectedContact.uid],
        createdAt: new Date(),
        reviewData: {
          coachId: selectedContact.uid,
          coachName: selectedContact.displayName,
          studentId: user!.uid,
          studentName: user!.displayName || 'Alumno',
          status: 'pending'
        }
      });

      success('¡Sesión finalizada! Se ha habilitado la calificación privada.');
    } catch (err: any) {
      console.error('Complete Session Error:', err);
      toastError('Error al finalizar la sesión: ' + err.message);
    }
  };

  // Submit private rating & review
  const handleSubmitReview = async (msgId: string, reviewData: any) => {
    const rating = ratings[msgId] || 5;
    const comment = comments[msgId] || '';

    if (!user) return;

    setSubmittingReview(prev => ({ ...prev, [msgId]: true }));
    try {
      await addDoc(collection(db, 'reviews'), {
        courseId: null,
        bookId: null,
        coachId: reviewData.coachId,
        itemId: reviewData.coachId,
        itemType: 'coach',
        itemName: reviewData.coachName,
        userId: user.uid,
        rating,
        comment,
        status: 'published',
        createdAt: new Date()
      });

      const msgRef = doc(db, 'messages', msgId);
      await updateDoc(msgRef, {
        'reviewData.status': 'completed',
        'reviewData.rating': rating,
        'reviewData.comment': comment
      });

      success('¡Gracias por tu calificación privada! Tu feedback ha sido guardado de forma segura.');
    } catch (err: any) {
      console.error('Submit Review Error:', err);
      toastError('Error al enviar la calificación: ' + err.message);
    } finally {
      setSubmittingReview(prev => ({ ...prev, [msgId]: false }));
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-kirateal text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border-2 border-white/20"
      >
        <MessageSquare size={24} />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-85 md:w-96 h-[550px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col z-50 animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-kirateal rounded-t-3xl flex justify-between items-center text-white">
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
                  {selectedContact ? selectedContact.displayName : "Mediador Privado Kira"}
                </h3>
                <p className="text-[10px] opacity-80 flex items-center gap-1">
                  <Shield size={10} className="text-emerald-300" />
                  {selectedContact ? "Burbuja de Confianza Activa" : `${allContacts.length} mentores activos`}
                </p>
              </div>
            </div>
            
            {/* Propose button for coach */}
            {selectedContact && role === 'coach' && (
              <button 
                onClick={() => setShowOfferForm(!showOfferForm)}
                className="ml-auto mr-2 px-2 py-1 bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
              >
                <Calendar size={11} />
                {showOfferForm ? 'Cancelar' : '📋 Proponer'}
              </button>
            )}

            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Contact List */}
          {!selectedContact ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-2xl mb-3">
                <p className="text-xs font-bold text-teal-800 flex items-center gap-1">
                  <ShieldCheck size={14} /> Sistema de Confianza Kira Coach
                </p>
                <p className="text-[11px] text-teal-700 mt-1">
                  Toda comunicación se canaliza de forma privada y segura. Se bloquea cualquier intento de desvío externo para proteger tu privacidad.
                </p>
              </div>

              {allContacts.length > 0 ? (
                allContacts.map(c => (
                  <button 
                    key={c.uid}
                    onClick={() => {
                      setSelectedContact(c);
                      setMessageLimit(50);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                  >
                    <div className="w-10 h-10 rounded-full bg-kirateal/10 flex items-center justify-center text-kirateal font-bold">
                      {c.displayName?.[0] || 'U'}
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-bold text-slate-800">{c.displayName}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-tighter">
                        {role === 'coach' ? 'Alumno' : 'Coach'}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 text-center px-4 py-8">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                    <Users size={32} className="opacity-20" />
                  </div>
                  <p className="text-xs italic leading-relaxed">
                    {role === 'alumno' 
                      ? "Inscríbete en un curso o solicita mentoría para iniciar una conversación segura."
                      : "Espera a que los alumnos agenden mentorías para chatear en privado."}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Active Conversation Room */
            <>
              {/* Proposal Form Overlay */}
              {showOfferForm && (
                <div className="p-3 bg-slate-50 border-b border-slate-100 space-y-2 text-xs">
                  <p className="font-bold text-slate-700 flex items-center gap-1">
                    <Calendar size={13} className="text-kirateal" /> Generar Oferta de Sesión (Kira Pay)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Fecha propuesta</label>
                      <input 
                        type="datetime-local" 
                        value={proposedDate}
                        onChange={e => setProposedDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Duración (min)</label>
                      <input 
                        type="number" 
                        value={proposedDuration}
                        onChange={e => setProposedDuration(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Precio (Puntos)</label>
                      <input 
                        type="number" 
                        value={proposedPrice}
                        onChange={e => setProposedPrice(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px]"
                      />
                    </div>
                    <div className="flex items-end">
                      <button 
                        onClick={handleSendOffer}
                        disabled={!proposedDate || submittingOffer}
                        className="w-full py-1.5 bg-kirateal hover:bg-kirateal-dark text-white rounded font-bold transition-all disabled:opacity-50 text-[11px]"
                      >
                        {submittingOffer ? 'Enviando...' : 'Enviar Propuesta'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                
                {messages.length === 0 && (
                  <div className="p-4 bg-teal-50 border border-teal-100 rounded-2xl text-xs space-y-2 text-teal-800 shadow-sm">
                    <p className="font-bold flex items-center gap-1.5 text-kirateal">
                      <Sparkles size={14} /> Mediador Privado Kira Coach
                    </p>
                    <p>Perfecto. Has solicitado abrir un canal privado con <strong>{selectedContact.displayName}</strong>.</p>
                    <p>📩 <strong>Chat Privado iniciado</strong> (Solo visible para ti y {selectedContact.displayName}).</p>
                    <p>🔒 <strong>Recuerda:</strong> Kira Coach actúa como intermediario. No intercambies datos personales hasta que acuerden una sesión formal.</p>
                    <p className="text-[10px] text-teal-600 italic">✏️ Escribe tu mensaje de presentación aquí abajo (esto es un chat privado, nadie más lo ve):</p>
                  </div>
                )}

                {messages.length >= messageLimit && (
                  <div className="flex justify-center pb-2">
                    <button 
                      onClick={() => setMessageLimit(prev => prev + 50)}
                      className="text-xs text-kirateal font-bold hover:underline bg-kirateal/5 px-4 py-1.5 rounded-full"
                    >
                      Cargar mensajes anteriores
                    </button>
                  </div>
                )}

                {messages.map((m) => {
                  const isMe = m.senderId === user?.uid;
                  
                  if (m.type === 'contact_warning') {
                    return (
                      <div key={m.id} className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-2xl text-xs space-y-1 my-2 shadow-sm">
                        <p className="font-bold flex items-center gap-1.5 text-red-600">
                          <ShieldAlert size={14} /> Intercepción de Seguridad Kira Guard
                        </p>
                        <p className="leading-relaxed">
                          ⚠️ Alto ahí. Has intentado compartir un dato de contacto externo. Por tu seguridad y la del otro usuario, Kira Coach no permite compartir datos personales hasta que la transacción (sesión) esté completada. Si deseas compartirlo después, usa el botón de <strong>"Compartir contacto seguro"</strong> que aparecerá al finalizar el pago.
                        </p>
                      </div>
                    );
                  }

                  if (m.type === 'session_offer') {
                    const offer = m.offerData || {};
                    const isPending = offer.status === 'pending';
                    const isAccepted = offer.status === 'accepted';
                    const isCompleted = offer.status === 'completed';
                    const isDeclined = offer.status === 'declined';

                    return (
                      <div key={m.id} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-md my-2">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                          <CreditCard className="text-kirateal" size={16} />
                          <span className="font-bold text-xs text-slate-700">Reserva de Sesión Protegida</span>
                          <span className="ml-auto text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            Kira Pay
                          </span>
                        </div>
                        
                        <p className="text-xs text-slate-600">
                          <strong>{m.senderName}</strong> ha propuesto una sesión de mentoría privada con las siguientes condiciones:
                        </p>

                        <div className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1.5 border border-slate-100">
                          <p className="flex items-center gap-1.5 text-slate-700">
                            <Calendar size={13} className="text-slate-400" />
                            <span><strong>Fecha:</strong> {new Date(offer.date).toLocaleString()}</span>
                          </p>
                          <p className="flex items-center gap-1.5 text-slate-700">
                            <ClockIcon size={13} className="text-slate-400" />
                            <span><strong>Duración:</strong> {offer.duration} minutos</span>
                          </p>
                          <p className="flex items-center gap-1.5 text-slate-700">
                            <Sparkles size={13} className="text-kiragold" />
                            <span><strong>Precio:</strong> <strong className="text-kirateal">{offer.price} puntos</strong> (protegido por Kira Pay)</span>
                          </p>
                        </div>

                        {isPending && (
                          role === 'alumno' ? (
                            <div className="flex gap-2 pt-1">
                              <button 
                                onClick={() => handleAcceptOffer(m.id, offer)}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all"
                              >
                                🛒 Confirmar y Pagar
                              </button>
                              <button 
                                onClick={() => handleDeclineOffer(m.id)}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-bold transition-all"
                              >
                                Declinar
                              </button>
                            </div>
                          ) : (
                            <p className="text-[10px] text-amber-600 italic text-center font-medium bg-amber-50 py-1 rounded">
                              Esperando confirmación de pago del Alumno...
                            </p>
                          )
                        )}

                        {isAccepted && (
                          <div className="space-y-2 pt-1">
                            <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 p-2 rounded-xl">
                              <ShieldCheck size={14} /> Pago verificado. Sesión programada con éxito.
                            </p>
                            
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setShowContactInfo(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-950 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1"
                              >
                                <Shield size={12} className="text-emerald-400" />
                                {showContactInfo[m.id] ? 'Ocultar contacto' : '🤝 Ver contacto seguro'}
                              </button>

                              <button 
                                onClick={() => handleCompleteSession(m.id, offer)}
                                className="py-1.5 px-2 bg-kirateal hover:bg-kirateal-dark text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1"
                              >
                                🏁 Finalizar Sesión
                              </button>
                            </div>

                            {showContactInfo[m.id] && (
                              <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 text-[11px] space-y-1 text-teal-900 animate-in fade-in">
                                <p className="font-bold text-teal-800">Contacto Seguro verificado por Kira Pay:</p>
                                <p><strong>Email:</strong> {selectedContact.email || 'contacto@kiracoach.com'}</p>
                                <p><strong>Teléfono:</strong> {selectedContact.phone || '+54 9 11 5555-0199'}</p>
                                <p className="text-[9px] text-teal-600 italic">Recuerda mantener el respeto mutuo durante la sesión.</p>
                              </div>
                            )}
                          </div>
                        )}

                        {isCompleted && (
                          <p className="text-[11px] text-kirateal font-bold flex items-center justify-center gap-1 bg-teal-50/50 p-2 rounded-xl">
                            <ShieldCheck size={14} /> Sesión completada con éxito. ¡Intercambio seguro finalizado!
                          </p>
                        )}

                        {isDeclined && (
                          <p className="text-[11px] text-slate-500 font-bold flex items-center justify-center gap-1 bg-slate-50 p-2 rounded-xl">
                            ❌ Esta propuesta ha sido cancelada o declinada.
                          </p>
                        )}
                      </div>
                    );
                  }

                  if (m.type === 'session_review') {
                    const review = m.reviewData || {};
                    const isPendingReview = review.status === 'pending';
                    const isCompletedReview = review.status === 'completed';

                    const isAuthor = role === 'alumno' && user?.uid === review.studentId;

                    return (
                      <div key={m.id} className="p-4 bg-teal-50/40 border border-teal-100 rounded-2xl space-y-3 shadow-sm my-2">
                        <div className="flex items-center gap-1 text-kirateal">
                          <Heart size={15} />
                          <span className="font-bold text-xs">Evaluación Privada de Confianza</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          ¡Sesión completada! Ahora pueden calificarse mutuamente de forma privada para mantener la reputación interna de Kira Coach.
                        </p>

                        {isPendingReview ? (
                          isAuthor ? (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Calificación</label>
                                <div className="flex gap-1.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button 
                                      key={star}
                                      onClick={() => setRatings(prev => ({ ...prev, [m.id]: star }))}
                                      className="transition-transform active:scale-90"
                                    >
                                      <Star 
                                        size={20} 
                                        className={cn(
                                          star <= (ratings[m.id] || 5) 
                                            ? "fill-kiragold text-kiragold" 
                                            : "text-slate-300"
                                        )} 
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Comentario Privado</label>
                                <textarea 
                                  value={comments[m.id] || ''}
                                  onChange={e => setComments(prev => ({ ...prev, [m.id]: e.target.value }))}
                                  placeholder="¿Cómo fue tu experiencia? Tu reseña es privada y solo afecta la reputación de Kira..."
                                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-kirateal h-16 resize-none"
                                />
                              </div>

                              <button 
                                onClick={() => handleSubmitReview(m.id, review)}
                                disabled={submittingReview[m.id]}
                                className="w-full py-2 bg-kirateal hover:bg-kirateal-dark text-white rounded-xl text-[11px] font-bold shadow-sm transition-colors"
                              >
                                {submittingReview[m.id] ? 'Guardando evaluación...' : '🔒 Enviar Reseña Privada'}
                              </button>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-500 italic bg-white/50 p-2 rounded-lg text-center">
                              Esperando evaluación del Alumno...
                            </p>
                          )
                        ) : (
                          <div className="p-2.5 bg-emerald-50 rounded-xl text-[11px] text-emerald-800 space-y-1">
                            <p className="font-bold flex items-center gap-1">
                              <ShieldCheck size={14} /> ¡Evaluación enviada con éxito!
                            </p>
                            <p>Tu puntuación de <strong>{review.rating || ratings[m.id] || 5} estrellas</strong> ha sido resguardada en el registro de confianza.</p>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Default text message
                  return (
                    <div key={m.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                      <span className="text-[10px] text-slate-400 px-1.5 mb-0.5">
                        {m.senderName || 'Usuario'}
                      </span>
                      <div className={cn(
                        "max-w-[80%] px-4 py-2.5 rounded-2xl text-[13px] shadow-sm leading-relaxed",
                        isMe 
                          ? "bg-kirateal text-white rounded-tr-none" 
                          : "bg-slate-100 text-slate-800 rounded-tl-none"
                      )}>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>

              {/* Chat Send Form */}
              <form onSubmit={sendMessage} className="p-4 border-t border-slate-100 flex gap-2 bg-slate-50 rounded-b-3xl">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe un mensaje privado..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-kirateal/20"
                />
                <button className="p-2.5 bg-kirateal text-white rounded-xl hover:bg-kirateal-dark transition-all active:scale-95 flex items-center justify-center">
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

// Low profile clock icon helper
function ClockIcon({ size = 16, className = '' }: { size?: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
