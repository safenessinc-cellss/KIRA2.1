import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, getDoc, addDoc, onSnapshot, doc, updateDoc, setDoc, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { MentorWidget } from '../components/MentorWidget';
import { Seal } from '../components/Brand';
import { CreditCard, Star, GraduationCap, Zap, CheckCircle2, ShoppingCart, ShieldCheck, Activity, Award, CalendarDays, Sparkles, ArrowRight, MessageCircleHeart, ChevronLeft, ChevronRight, HeartPulse, Loader2, BookOpen, LogOut, MessageCircle, Globe, Copy, Check, Clock, UserPlus, Search, X, BadgeCheck, Instagram, Linkedin, User, Twitter, Heart } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { KiraNudge } from '../components/KiraNudge';
import { useToast } from '../hooks/useToast';

// HELPER PARA OBTENER LOS CAPÍTULOS DE UN LIBRO INTERACTIVO
const getChaptersForBook = (bookTitle: string) => {
  const t = bookTitle.toLowerCase();
  if (t.includes('solo') || t.includes('soledad')) {
    return [
      {
        title: "Capítulo 1: El Silencio como Aliado",
        pages: [
          "Aprender a estar solo es el mayor superpoder del siglo XXI. Vivimos inundados de notificaciones, opiniones y ruidos ajenos que ahogan nuestra voz interior. El primer paso del coaching ontológico es suspender la interpretación y simplemente SER.",
          "El silencio no está vacío, está lleno de respuestas. Cuando logras sostener la incomodidad de los primeros minutos sin estímulos, tu mente se asienta. Empiezas a observar tus juicios en lugar de reaccionar ciegamente ante ellos."
        ],
        reflectionPrompt: "¿Qué es lo que más intentas evitar o tapar con el uso de tu teléfono cuando te quedas a solas en tu habitación?",
        reflectionPlaceholder: "Escribe con total honestidad sobre tus distracciones...",
        valueZap: 30
      },
      {
        title: "Capítulo 2: Reconfigurando el Autoconcepto",
        pages: [
          "Nuestra identidad a menudo es un collage de las expectativas de los demás: padres, jefes, parejas. En la soledad, podemos desmantelar ese personaje. ¿Quién eres cuando nadie te está mirando?",
          "La arteterapia nos permite plasmar de forma física y tangible esos hilos invisibles que nos atan. Al trazar círculos o pintar de forma no-lineal, el inconsciente se libera y redibuja tu verdadero hogar base."
        ],
        reflectionPrompt: "Menciona 2 expectativas externas que sientes que has estado cargando innecesariamente en tu vida.",
        reflectionPlaceholder: "Ej: Cumplir con un estatus profesional perfecto, ser siempre fuerte...",
        valueZap: 30
      },
      {
        title: "Capítulo 3: Alquimia de la Conexión",
        pages: [
          "Sólo quien sabe estar solo sabe amar de verdad, porque no busca en el otro un parche para su vacío, sino un compañero para su plenitud. El viaje hacia adentro termina en una mayor empatía y conexión con la humanidad.",
          "Felicidades por completar esta lectura. Has integrado conceptos profundos de andragogía y autoconocimiento. Has ganado nuevos Zaps de evolución para tu consciencia."
        ],
        reflectionPrompt: "Escribe tu compromiso para honrar tu soledad creativa al menos 15 minutos al día.",
        reflectionPlaceholder: "Yo me comprometo a...",
        valueZap: 40
      }
    ];
  }
  
  if (t.includes('liderazgo') || t.includes('empresarial') || t.includes('psicopedagogia')) {
    return [
      {
        title: "Capítulo 1: El Liderazgo desde el SER",
        pages: [
          "El estilo de liderazgo tradicional se enfoca en el control y la jerarquía. Sin embargo, en la psicopedagogía empresarial moderna, el líder es un facilitador del aprendizaje. No enseña con memorándums, inspira con el ejemplo.",
          "Un líder transformacional comprende las matrices cognitivas del adulto. Respeta el ritmo biológico y emocional de su equipo y diseña espacios de colaboración orgánica que disuelven los sesgos de autodesaprobación."
        ],
        reflectionPrompt: "¿Qué tipo de líder has tenido en el pasado que más ha potenciado tu aprendizaje y qué cualidades lo hacían diferente?",
        reflectionPlaceholder: "Escribe tu reflexión sobre tu experiencia de liderazgo...",
        valueZap: 30
      },
      {
        title: "Capítulo 2: Andragogía y Curva de Tolerancia",
        pages: [
          "Un operario o empleado no se compromete leyendo manuales de 80 páginas. Eso genera fatiga mental y desmotivación. El aprendizaje debe ser en micro-sesiones dinámicas que encajen en la jornada de forma natural.",
          "Al fragmentar la información en micro-aprendizajes aplicados, se facilita la asimilación y se evitan las no-conformidades operativas. El conocimiento se convierte en acción inmediata."
        ],
        reflectionPrompt: "¿Cómo estructurarías una micro-sesión de 5 minutos para enseñar algo complejo en tu propio trabajo?",
        reflectionPlaceholder: "Describe tu diseño de micro-aprendizaje...",
        valueZap: 30
      },
      {
        title: "Capítulo 3: Matrices Vivas y Aprendizaje Autónomo",
        pages: [
          "El estilo Democrático y el Transformacional generan un alto compromiso a largo plazo. Pero en equipos altamente expertos, el estilo Laissez-Faire (autónomo) permite la máxima innovación.",
          "Integra la arteterapia y la introspección en tus dinámicas de equipo para liberar bloqueos creativos y fomentar la resolución disruptiva de problemas."
        ],
        reflectionPrompt: "Escribe una acción concreta para inspirar confianza y autonomía en tus colaboradores directos.",
        reflectionPlaceholder: "Mi acción será...",
        valueZap: 40
      }
    ];
  }

  return [
    {
      title: "Capítulo 1: Conectando con la Esencia",
      pages: [
        `Bienvenido a la versión interactiva de "${bookTitle}". Todo libro de crecimiento personal es un mapa de ruta hacia una nueva versión de ti mismo.`,
        "El primer paso de la transformación es suspender el juicio automático. Lee las ideas de forma activa, buscando cómo resuenan en tu historia personal y tu experiencia del ser."
      ],
      reflectionPrompt: "¿Qué intención principal tienes al explorar e integrar las lecciones de este libro en tu vida cotidiana?",
      reflectionPlaceholder: "Mi intención es...",
      valueZap: 30
    },
    {
      title: "Capítulo 2: La Práctica del Observador",
      pages: [
        "El conocimiento sin acción es simple entretenimiento. Para fijar un nuevo aprendizaje, debemos pasar por el cuerpo y la emoción. Es aquí donde la arteterapia y la escritura reflexiva juegan un rol vital.",
        "Al responder estas preguntas y realizar las pausas de respiración, estás reorganizando tu red neuronal y creando nuevos hábitos de alto rendimiento."
      ],
      reflectionPrompt: "¿Qué pequeño cambio de hábito podrías iniciar mañana mismo inspirado en lo que has leído hoy?",
      reflectionPlaceholder: "Ej: Hacer 5 respiraciones lentas antes de revisar mi teléfono...",
      valueZap: 30
    },
    {
      title: "Capítulo 3: Declaración de Evolución",
      pages: [
        "Has finalizado este libro interactivo. La andragogía (pedagogía de adultos) nos enseña que el aprendizaje real es autodirigido y continuo. Tu camino de expansión de consciencia no se detiene aquí.",
        "Sigue acumulando energía, conectando con tus mentores y expresando tu sabiduría en tu diario personal."
      ],
      reflectionPrompt: "Escribe una frase de agradecimiento y empoderamiento para cerrar este ciclo de lectura.",
      reflectionPlaceholder: "Agradezco este espacio porque...",
      valueZap: 40
    }
  ];
};

export function Dashboard() {
  const { user, logout } = useAuth();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [courseReviewing, setCourseReviewing] = useState<string | null>(null);
  const [reviewType, setReviewType] = useState<'course' | 'book' | 'coach'>('course');
  const [reviewName, setReviewName] = useState<string>('');
  const [showAdBanner, setShowAdBanner] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  
  // Interactive Gamification States
  const [userOwnedBooks, setUserOwnedBooks] = useState<string[]>([]);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [selectedBookForPurchase, setSelectedBookForPurchase] = useState<any | null>(null);
  const [isPurchasingBook, setIsPurchasingBook] = useState(false);
  const [readingBook, setReadingBook] = useState<any | null>(null);
  const [currentBookChapter, setCurrentBookChapter] = useState(0);
  const [bookAnswers, setBookAnswers] = useState<Record<string, string>>({});
  const [isSavingBookAnswer, setIsSavingBookAnswer] = useState(false);
  
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState<any | null>(null);
  const [enrollIntention, setEnrollIntention] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [availableBooks, setAvailableBooks] = useState<any[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<any[]>([]);
  const [favoriteCoaches, setFavoriteCoaches] = useState<any[]>([]);
  const [unlockedHistory, setUnlockedHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);

  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const [directorySearchQuery, setDirectorySearchQuery] = useState('');
  const [directorySpecialty, setDirectorySpecialty] = useState('Todos');
  const [selectedDirectoryCoach, setSelectedDirectoryCoach] = useState<any | null>(null);
  const [allCoaches, setAllCoaches] = useState<any[]>([]);
  const [userFavorites, setUserFavorites] = useState<string[]>([]);

  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [communityLinksArr, setCommunityLinksArr] = useState<any[]>([]);
  const [savingCommunity, setSavingCommunity] = useState(false);
  const [copied, setCopied] = useState(false);

  // ESCUCHAR CAMBIOS DEL ENLACE DE WHATSAPP EN FIRESTORE
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'coach')) {
      const docRef = doc(db, 'settings', 'community');
      const unsub = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.links)) {
            setCommunityLinksArr(data.links);
            const wa = data.links.find((l: any) => l.type === 'whatsapp');
            if (wa) {
              setWhatsappUrl(wa.url);
            } else if (data.links[0]) {
              setWhatsappUrl(data.links[0].url);
            }
          }
        }
      }, (err) => {
        console.error("Error listening to community settings:", err);
      });
      return () => unsub();
    }
  }, [user]);

  // GUARDAR NUEVO ENLACE DE WHATSAPP
  const saveWhatsappUrl = async () => {
    if (!user) return;
    setSavingCommunity(true);
    try {
      const updatedLinks = [...communityLinksArr];
      const waIndex = updatedLinks.findIndex((l: any) => l.type === 'whatsapp');
      if (waIndex !== -1) {
        updatedLinks[waIndex] = { ...updatedLinks[waIndex], url: whatsappUrl };
      } else if (updatedLinks.length > 0) {
        updatedLinks[0] = { ...updatedLinks[0], url: whatsappUrl };
      } else {
        updatedLinks.push({
          name: 'Comunidad WhatsApp',
          description: 'Soporte estelar, networking y canal oficial de avisos de Kira Moreno.',
          url: whatsappUrl,
          badge: 'Canal Oficial',
          type: 'whatsapp'
        });
      }
      
      const docRef = doc(db, 'settings', 'community');
      await setDoc(docRef, {
        links: updatedLinks,
        updatedAt: new Date(),
        updatedBy: user.uid
      });
      setShowCommunityModal(false);
      alert('✅ Enlace de WhatsApp actualizado correctamente');
    } catch (e) {
      console.error(e);
      alert('❌ Error al guardar el enlace. Por favor, inténtalo de nuevo.');
    } finally {
      setSavingCommunity(false);
    }
  };

  // COPIAR ENLACE AL PORTAPAPELES
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const userDocPoints = user?.points || 0;

  // Simulate popular courses by sorting (price as proxy if no rating)
  const popularCourses = [...availableCourses].sort((a,b) => (b.price || 0) - (a.price || 0)).slice(0, 3);
  const totalSlides = popularCourses.length;

  const nextSlide = () => setCurrentSlide(p => Math.min(p + 1, Math.max(0, totalSlides - 1)));
  const prevSlide = () => setCurrentSlide(p => Math.max(p - 1, 0));

  useEffect(() => {
    if (user && user.hasCompletedOnboarding === undefined) {
      setShowOnboarding(true);
    }
  }, [user]);

  const completeOnboarding = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        hasCompletedOnboarding: true,
        points: (user.points || 0) + 50
      });
      setShowOnboarding(false);
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!user) {
      setUserFavorites([]);
      setUserOwnedBooks([]);
      return;
    }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setUserFavorites(snap.data().favorites || []);
        setUserOwnedBooks(snap.data().ownedBooks || []);
      }
    });
    return () => unsub();
  }, [user]);

  // ESCUCHAR REVIEWS EN TIEMPO REAL
  useEffect(() => {
    if (!user) {
      setMyReviews([]);
      return;
    }
    const reviewsQ = query(collection(db, 'reviews'), where('userId', '==', user.uid));
    const unsub = onSnapshot(reviewsQ, (snap) => {
      setMyReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // ESCUCHAR RESPUESTAS DE LIBRO EN TIEMPO REAL
  useEffect(() => {
    if (!user) {
      setBookAnswers({});
      return;
    }
    const q = query(collection(db, 'bookReflections'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const answersMap: Record<string, string> = {};
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const key = `${data.bookId}_${data.chapterIndex}`;
        answersMap[key] = data.answer || '';
      });
      setBookAnswers(answersMap);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (allCoaches.length > 0 && userFavorites.length > 0) {
      const favs = allCoaches.filter(c => userFavorites.includes(c.id));
      setFavoriteCoaches(favs);
    } else {
      setFavoriteCoaches([]);
    }
  }, [allCoaches, userFavorites]);

  const toggleDirectoryFavorite = async (e: React.MouseEvent, coachId: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const isFav = userFavorites.includes(coachId);
      const updatedFavorites = isFav 
        ? userFavorites.filter((id: string) => id !== coachId)
        : [...userFavorites, coachId];
      await updateDoc(doc(db, 'users', user.uid), {
        favorites: updatedFavorites
      });
      toastSuccess(isFav ? 'Eliminado de favoritos' : 'Agregado a favoritos');
    } catch (err) {
      console.error("Error toggling favorite:", err);
      toastError("Error al guardar favoritos");
    }
  };

  const getTier = (pts: number) => {
    if (pts <= 500) return { name: 'Bronce', next: 501, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', icon: <Zap size={14} /> };
    if (pts <= 1500) return { name: 'Plata', next: 1501, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', icon: <ShieldCheck size={14} /> };
    if (pts <= 5000) return { name: 'Oro', next: 5001, color: 'text-kiragold', bg: 'bg-kiragold/10', border: 'border-kiragold/20', icon: <Star size={14} /> };
    return { name: 'Platino', next: Infinity, color: 'text-kirateal', bg: 'bg-kirateal/10', border: 'border-kirateal/20', icon: <Award size={14} /> };
  };

  const currentTier = getTier(userDocPoints);
  const progressToNext = currentTier.next === Infinity ? 100 : Math.round((userDocPoints / currentTier.next) * 100);

  useEffect(() => {
    fetchData();
    handlePaymentSuccess();
  }, [user]);

  const handlePaymentSuccess = async () => {
    const success = searchParams.get('success');
    const courseId = searchParams.get('courseId');
    const amount = searchParams.get('amount');

    if (success === 'true' && courseId && user) {
      try {
        // Evitar duplicaciones consultando directamente antes de escribir
        const existingQ = query(
          collection(db, 'enrollments'),
          where('userId', '==', user.uid),
          where('courseId', '==', courseId)
        );
        const existingSnap = await getDocs(existingQ);
        
        if (existingSnap.empty) {
          await addDoc(collection(db, 'enrollments'), {
            userId: user.uid,
            courseId,
            progress: 0,
            createdAt: new Date()
          });

          await addDoc(collection(db, 'transactions'), {
            userId: user.uid,
            amount: Number(amount) || 0,
            type: 'course_purchase',
            courseId,
            createdAt: new Date()
          });

          toastSuccess('¡Inscripción completada exitosamente! Bienvenido al curso.');
        } else {
          toastInfo('Ya estás inscrito en este curso.');
        }

        setSearchParams({});
        fetchData();
      } catch (e: any) {
        console.error('Error recording payment success:', e);
        toastError('No se pudo registrar la inscripción: ' + (e.message || String(e)));
      }
    }
  };

  const fetchData = async () => {
    if (!user) return;
    try {
      const coursesQ = query(collection(db, 'courses'), where('status', '==', 'published'));
      const coursesSnap = await getDocs(coursesQ);
      setAvailableCourses(coursesSnap.docs.map(d => ({id: d.id, ...d.data()})));

      try {
        const booksQ = query(collection(db, 'books'), where('status', '==', 'published'));
        const booksSnap = await getDocs(booksQ);
        setAvailableBooks(booksSnap.docs.map(d => ({id: d.id, ...d.data()})));
      } catch (booksErr) {
        console.warn("Dynamic books fetch failed:", booksErr);
      }

      const enrollQ = query(collection(db, 'enrollments'), where('userId', '==', user.uid));
      const enrollSnap = await getDocs(enrollQ);
      setMyEnrollments(enrollSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch all coaches
      try {
        const allCoachesQ = query(collection(db, 'users'), where('role', '==', 'coach'));
        const allCoachesSnap = await getDocs(allCoachesQ);
        const approvedCoaches = allCoachesSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((c: any) => c.approvalStatus === 'approved');
        setAllCoaches(approvedCoaches);
      } catch (err) {
        console.warn("Error fetching all coaches:", err);
      }

      const historyQ = query(collection(db, 'unlockedHistory'), where('userId', '==', user.uid));
      const historySnap = await getDocs(historyQ);
      const historyItems = historySnap.docs.map(d => ({id: d.id, ...d.data()}));
      historyItems.sort((a: any, b: any) => {
         const tA = a.unlockedAt?.seconds || 0;
         const tB = b.unlockedAt?.seconds || 0;
         return tB - tA;
      });
      setUnlockedHistory(historyItems);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStripeCheckout = async (course: any) => {
    if(!user) return;
    setCheckingOutId(course.id);
    try {
      const resp = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          userId: user.uid,
          amount: typeof course.price === 'number' ? course.price : Number(course.price) || 0,
          title: course.title || 'Curso de Kira'
        })
      });
      const data = await resp.json();
      if (data.error) {
        throw new Error(data.error);
      }
      window.location.href = data.url;
    } catch(e: any) {
      console.error('Stripe Redirect Error:', e);
      toastError('Error al iniciar la inscripción: ' + (e.message || String(e)));
    } finally {
      setCheckingOutId(null);
    }
  };

  const handleSimpleEnroll = async (course: any) => {
    if (!user) return;
    setCheckingOutId(course.id);
    try {
      const existingQ = query(
        collection(db, 'enrollments'),
        where('userId', '==', user.uid),
        where('courseId', '==', course.id)
      );
      const existingSnap = await getDocs(existingQ);
      if (!existingSnap.empty) {
        toastInfo('Ya has solicitado la inscripción a este curso.');
        return;
      }

      await addDoc(collection(db, 'enrollments'), {
        userId: user.uid,
        courseId: course.id,
        courseTitle: course.title || 'Curso',
        coachId: course.coachId || '',
        studentName: user.displayName || user.email || 'Alumno',
        studentEmail: user.email,
        progress: 0,
        status: 'pending',
        createdAt: new Date()
      });

      toastSuccess('¡Solicitud de inscripción enviada exitosamente! Tu coach o administrador autorizará tu ingreso pronto.');
      fetchData();
    } catch (e: any) {
      console.error('Error in simple enrollment:', e);
      toastError('Error al enviar la solicitud: ' + (e.message || String(e)));
    } finally {
      setCheckingOutId(null);
    }
  };

  const submitReview = async () => {
    if (!user || !courseReviewing) return;
    try {
      await addDoc(collection(db, 'reviews'), {
        courseId: reviewType === 'course' ? courseReviewing : null,
        bookId: reviewType === 'book' ? courseReviewing : null,
        coachId: reviewType === 'coach' ? courseReviewing : null,
        itemId: courseReviewing,
        itemType: reviewType,
        itemName: reviewName,
        userId: user.uid,
        rating,
        comment,
        status: 'published',
        createdAt: new Date()
      });
      toastSuccess(`¡Gracias por tu feedback! Tu calificación para "${reviewName || 'el elemento'}" ha sido registrada con éxito.`);
      setCourseReviewing(null);
      setComment('');
      setRating(5);
    } catch(e: any) {
      console.error(e);
      toastError('Error al enviar la calificación: ' + (e.message || String(e)));
    }
  };

  const handlePurchaseBook = async (book: any) => {
    if (!user) return;
    setIsPurchasingBook(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedOwnedBooks = [...userOwnedBooks];
      if (!updatedOwnedBooks.includes(book.id)) {
        updatedOwnedBooks.push(book.id);
      }
      
      const currentPoints = user?.points || 0;
      const newPoints = currentPoints + 50;

      await updateDoc(userRef, {
        ownedBooks: updatedOwnedBooks,
        points: newPoints
      });

      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: Number(book.price) || 0,
        type: 'book_purchase',
        bookId: book.id,
        bookTitle: book.title,
        createdAt: new Date()
      });

      toastSuccess(`¡Felicidades! Has adquirido "${book.title}". Se han acreditado +50 Zaps de energía a tu cuenta.`);
      setSelectedBookForPurchase(null);
    } catch (e: any) {
      console.error("Error purchasing book:", e);
      toastError("Error al realizar la adquisición del libro: " + (e.message || String(e)));
    } finally {
      setIsPurchasingBook(false);
    }
  };

  const handleSaveBookReflection = async (bookId: string, chapterIndex: number, answer: string, rewardZaps: number) => {
    if (!user) return;
    if (!answer || !answer.trim()) {
      toastError("Por favor escribe tu reflexión antes de guardar.");
      return;
    }
    
    setIsSavingBookAnswer(true);
    try {
      const reflectionId = `${user.uid}_${bookId}_${chapterIndex}`;
      await setDoc(doc(db, 'bookReflections', reflectionId), {
        userId: user.uid,
        bookId,
        chapterIndex,
        answer,
        updatedAt: new Date()
      });

      const completedKey = `award_${reflectionId}`;
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data() || {};
      const completedRewards = userData.completedRewards || [];

      if (!completedRewards.includes(completedKey)) {
        const currentPoints = userData.points || 0;
        await updateDoc(userRef, {
          points: currentPoints + rewardZaps,
          completedRewards: [...completedRewards, completedKey]
        });
        toastSuccess(`✨ ¡Reflexión Guardada! Has ganado +${rewardZaps} Zaps de energía.`);
      } else {
        toastSuccess("✨ ¡Reflexión Guardada correctamente!");
      }
    } catch (e: any) {
      console.error("Error saving reflection:", e);
      toastError("Error al guardar la reflexión: " + (e.message || String(e)));
    } finally {
      setIsSavingBookAnswer(false);
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10 animate-in fade-in duration-700">
      {/* Header Ejecutivo para Alumno */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-kirateal/10 text-kirateal text-[10px] font-black uppercase tracking-widest rounded-lg border border-kirateal/20">
              <Activity size={10} />
              Evolution Pipeline
            </div>
            <span className="text-slate-300">/</span>
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Workspace Personal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">
            Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-kirateal to-violet-600">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-500 mt-4 font-medium text-lg max-w-xl">Tu centro de comando para el alto rendimiento y la expansión de consciencia.</p>
        </div>
               <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-[24px] border border-slate-100 shadow-inner">
          <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-200/60">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Energy Pts</p>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-kiragold fill-kiragold" />
              <span className="text-2xl font-black text-slate-900 tracking-tight">{userDocPoints.toLocaleString()}</span>
            </div>
          </div>
          {(user?.role === 'admin' || user?.role === 'coach') && (
            <button
              onClick={() => setShowCommunityModal(true)}
              className="px-5 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/5 h-16 shrink-0"
              title="Editar enlace de comunidad WhatsApp"
              id="dashboard-edit-whatsapp-floating-btn"
            >
              <MessageCircle size={15} className="fill-white/30" />
              <span>Editar WhatsApp</span>
            </button>
          )}
          <button 
            onClick={() => navigate('/dashboard/profile')}
            className="w-16 h-16 rounded-2xl bg-slate-200 overflow-hidden border-4 border-white shadow-md hover:ring-4 hover:ring-kirateal/10 transition-all duration-300"
            title="Mi Perfil"
          >
            {user?.photoUrl ? <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-2xl">{user?.name?.[0]}</div>}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-150 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all duration-300 hover:shadow-md animate-in fade-in duration-300 cursor-pointer"
            title="Cerrar sesión"
            id="logout-button"
          >
            <LogOut size={14} className="shrink-0" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN ESPECIAL ANIVERSARIO: EBOOK INTERACTIVO */}
      {showAdBanner && myReviews.length === 0 && (
        <div className="bg-gradient-to-r from-teal-900 to-indigo-950 border border-teal-500/20 rounded-[32px] p-6 text-white relative overflow-hidden shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <button 
            onClick={() => setShowAdBanner(false)}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors p-1 z-20 cursor-pointer"
            title="Ocultar publicidad"
          >
            <X size={16} />
          </button>
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400/5 rounded-full filter blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-teal-500/10 text-teal-400 rounded-2xl border border-teal-400/20">
              <Award size={28} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-teal-400 tracking-widest bg-teal-500/15 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                <Sparkles size={10} className="fill-current" /> Especial de Aniversario
              </div>
              <h3 className="text-xl font-black">Nuevo Ebook de Coaching Ontológico & Arteterapia</h3>
              <p className="text-xs text-slate-300 max-w-xl text-left">
                ¡Disfruta del microaprendizaje interactivo! Convierte la lectura en acción con preguntas de reflexión de Kira Moreno, mándalas virtuales y gana +50 Zaps por capítulo.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/microlearning')}
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black uppercase tracking-widest text-[11px] px-6 py-3.5 rounded-2xl shadow-lg shadow-teal-500/15 hover:scale-105 transition active:scale-95 shrink-0 relative z-10 cursor-pointer flex items-center gap-2"
          >
            Explorar Ebook Gamificado <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ONBOARDING MODAL */}
      {showOnboarding && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <div className="bg-white rounded-3xl w-full max-w-md p-8 relative z-10 shadow-2xl text-center flex flex-col items-center animate-in zoom-in-95 duration-500">
               <div className="w-20 h-20 bg-kirateal/10 rounded-full flex items-center justify-center text-kirateal mb-6 relative">
                  <Sparkles size={32} />
                  <div className="absolute -top-2 -right-2 bg-kiragold text-white text-[10px] font-black px-2 py-1 rounded-full animate-bounce shadow-md">+50 pts</div>
               </div>
               <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">¡Bienvenido a Kira Coach!</h2>
               <p className="text-slate-500 text-sm leading-relaxed mb-8">
                 Te hemos regalado tus primeros 50 puntos de consciencia. Comienza tu viaje escribiendo en el Diario, o explora nuestro directorio para elegir a tu mentor.
               </p>
               <div className="flex flex-col w-full gap-3">
                  <button 
                    onClick={() => { completeOnboarding(); navigate('/dashboard/journal'); }}
                    className="w-full py-3.5 bg-kirateal text-white rounded-xl font-bold text-[13px] hover:bg-kirateal-light transition flex items-center justify-center gap-2"
                  >
                    Escribir mi primer Diario
                  </button>
                  <button 
                    onClick={() => { completeOnboarding(); setShowDirectoryModal(true); }}
                    className="w-full py-3.5 bg-slate-50 text-slate-700 rounded-xl font-bold text-[13px] hover:bg-slate-100 transition border border-slate-200"
                  >
                    Explorar Mentores
                  </button>
               </div>
            </div>
         </div>
      )}      
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={cn("p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all hover:shadow-md h-44", currentTier.bg, currentTier.border)}>
          <div className="flex justify-between items-center mb-1">
             <div className="flex items-center gap-2">
                <span className={cn("p-2 rounded-xl bg-white/60", currentTier.color)}>{currentTier.icon}</span>
                <h3 className={cn("text-[10px] font-black uppercase tracking-widest", currentTier.color)}>Tier {currentTier.name}</h3>
             </div>
             <span className="text-[10px] font-bold opacity-50 uppercase tracking-tighter">Kira League™</span>
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1 italic">Personal Growth</p>
            <div className="flex items-baseline gap-2">
               <p className="text-4xl font-black text-slate-900 tracking-tighter">{userDocPoints.toLocaleString()}</p>
               <span className="text-[11px] font-bold text-slate-500 uppercase">Energy Pts</span>
            </div>
          </div>
          <div className="mt-4">
             <div className="w-full h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                <div className={cn("h-full transition-all duration-1000", currentTier.color.split(' ')[0].replace('text', 'bg'))} style={{ width: `${progressToNext}%` }} />
             </div>
             <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tight">Siguiente nivel: {currentTier.next === Infinity ? 'MÁXIMO' : `${currentTier.next} pts`}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center h-44 hover:border-kirateal/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
            <GraduationCap size={24}/>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cursos Activos</p>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{myEnrollments.filter(e => e.status === 'approved' || !e.status).length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center h-44 hover:border-kiragold/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
            <Award size={24}/>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Insignias</p>
            <p className="text-4xl font-black text-slate-900 tracking-tight">12</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center h-44 hover:border-violet-300 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 mb-4">
            <HeartPulse size={24}/>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado de Ánimo</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight">Evolutivo</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-3xl border border-white/10 flex flex-col justify-between h-44 text-white shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
            <CalendarDays size={120} />
          </div>
          <div className="flex justify-between items-start relative z-10">
             <h3 className="text-white/80 text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
                <CalendarDays size={14}/> Próxima Sesión
             </h3>
             <span className="bg-amber-400 text-slate-900 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase shadow-md">En 2 días</span>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold opacity-80 mb-1">Coach One-on-One</p>
            <p className="text-xl font-black leading-tight tracking-tight">Biohacking & High Focus</p>
          </div>
        </div>
      </div>
            
      {/* Grid de Contenido Principal: Mentor + Actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 flex flex-col gap-12">
          {/* Mentor AI Widget */}
          <section className="bg-slate-50 rounded-[40px] p-1 border border-slate-100 shadow-inner">
            <MentorWidget />
          </section>

          {/* Marketplace de Cursos Recomendados */}
          <section className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <Star className="text-kiragold fill-kiragold" size={24} />
                  Kira Academy: Recomendados
                </h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">Programas curados por IA según tu trayectoria de crecimiento.</p>
              </div>
              {totalSlides > 1 && (
                <div className="flex gap-2">
                  <button 
                    onClick={prevSlide} 
                    disabled={currentSlide === 0}
                    className="w-11 h-11 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-kirateal disabled:opacity-30 disabled:hover:bg-transparent transition shadow-sm bg-white"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button 
                    onClick={nextSlide} 
                    disabled={currentSlide >= totalSlides - 1}
                    className="w-11 h-11 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-kirateal disabled:opacity-30 disabled:hover:bg-transparent transition shadow-sm bg-white"
                  >
                    <ChevronRight size={22} />
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-700 ease-in-out" 
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {popularCourses.length > 0 ? popularCourses.map((course) => {
                  const enrollment = myEnrollments.find(e => e.courseId === course.id);
                  const isEnrolled = enrollment && (enrollment.status === 'approved' || !enrollment.status);
                  const isPending = enrollment && enrollment.status === 'pending';
                  const review = myReviews.find(r => r.courseId === course.id);
                  return (
                    <div key={course.id} className="w-full flex-shrink-0 px-1">
                      <div className="border border-slate-100 rounded-[32px] overflow-hidden bg-slate-50/40 hover:border-kirateal transition-all duration-500 flex flex-col md:flex-row h-72">
                        <div className="md:w-5/12 bg-slate-200 relative shrink-0">
                          {course.bannerUrl && <img src={course.bannerUrl} alt={course.title} className="w-full h-full object-cover" />}
                          <div className="absolute top-5 left-5 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl text-[13px] font-black shadow-lg text-slate-900 border border-white/20">
                            ${course.price}
                          </div>
                        </div>
                        <div className="p-8 md:p-10 flex flex-col flex-1">
                          <h4 className="font-black text-2xl text-slate-900 mb-3 tracking-tight">{course.title}</h4>
                          <p className="text-[13px] text-slate-500 mb-6 flex-1 line-clamp-3 leading-relaxed font-medium">{course.description}</p>
                          
                          <div className="flex gap-5 mt-auto items-center">
                            <div className="flex-1">
                              <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block mb-2 opacity-60">Identity Verified By</span>
                              <div className="-ml-3 scale-90 origin-left">
                                <Seal size={42} />
                              </div>
                            </div>
                            <div className="flex-1 flex min-w-[140px]">
                              {review ? (
                                <div className="w-full text-center py-3.5 bg-emerald-50 text-emerald-700 rounded-2xl text-[11px] font-black uppercase tracking-wider border border-emerald-100 flex items-center justify-center gap-1.5 shadow-sm">
                                  <BadgeCheck size={14} className="text-emerald-600 shrink-0" />
                                  <span>Calificado ★ {review.rating}.0</span>
                                </div>
                              ) : isEnrolled ? (
                                <button 
                                  onClick={() => {
                                    setCourseReviewing(course.id);
                                    setReviewType('course');
                                    setReviewName(course.title);
                                    setRating(5);
                                    setComment('');
                                  }} 
                                  className="w-full text-[13px] px-6 py-3.5 bg-white text-slate-700 border border-slate-200 rounded-2xl hover:bg-slate-50 font-black transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                                >
                                  <Star size={16} /> Calificar
                                </button>
                              ) : isPending ? (
                                <button 
                                  disabled
                                  className="w-full text-[13px] px-6 py-3.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl font-black flex items-center justify-center gap-2"
                                >
                                  <Clock size={16} /> Pendiente
                                </button>
                              ) : (
                                <button 
                                  onClick={() => setSelectedCourseForEnroll(course)} 
                                  disabled={checkingOutId !== null}
                                  className="w-full text-[12px] px-4 py-3.5 bg-kirateal text-white rounded-2xl hover:bg-kirateal-light font-black transition flex items-center justify-center gap-2 shadow-xl shadow-teal-100 disabled:opacity-50 cursor-pointer"
                                >
                                  <UserPlus size={14} /> Solicitar Cupo
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="w-full text-center py-20 bg-slate-50 border border-slate-100 rounded-3xl">
                     <p className="text-slate-400 font-medium text-sm italic">Explorando nuevos horizontes académicos...</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Marketplace de Libros Recomendados (Librería Premium) */}
          {availableBooks.length > 0 && (
            <section className="bg-slate-900 rounded-[40px] border border-slate-800 p-10 shadow-xl relative overflow-hidden text-white">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full filter blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4 relative z-10">
                <div>
                  <h3 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-3">
                    <BookOpen className="text-emerald-400" size={24} />
                    Librería Premium: Ebooks Recomendados
                  </h3>
                  <p className="text-sm text-slate-400 mt-1 font-medium">Lecturas concisas seleccionadas por coaches para tu desarrollo holístico.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                {availableBooks.map((book) => {
                  const bookReview = myReviews.find(r => r.bookId === book.id || (r.itemId === book.id && r.itemType === 'book'));
                  return (
                    <div key={book.id} className="border border-white/5 rounded-[32px] overflow-hidden bg-slate-950/60 hover:border-emerald-400/40 transition-all duration-500 flex flex-col h-[400px]">
                      <div className="h-56 bg-slate-950 relative overflow-hidden shrink-0">
                        {book.imageUrl && <img src={book.imageUrl} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />}
                        {userOwnedBooks.includes(book.id) ? (
                          <div className="absolute top-5 left-5 bg-emerald-500 text-slate-950 px-3.5 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-1">
                            <BadgeCheck size={12} className="text-slate-950" /> Desbloqueado
                          </div>
                        ) : (
                          <div className="absolute top-5 left-5 bg-emerald-500 text-white px-3.5 py-1.5 rounded-full text-xs font-black shadow-lg">
                            ${book.price} USD
                          </div>
                        )}
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <h4 className="font-black text-lg text-slate-100 mb-1 line-clamp-1">{book.title}</h4>
                        <p className="text-[11px] text-emerald-400 font-bold mb-4">Por {book.author || 'Kira Coach'}</p>
                        <p className="text-xs text-slate-400 mb-5 flex-1 line-clamp-3 leading-relaxed font-medium">
                          {book.description || 'Un libro canalizado y estructurado con herramientas prácticas de arteterapia, respiración consciente y autoconocimiento.'}
                        </p>
                        
                        {userOwnedBooks.includes(book.id) ? (
                          <div className="mt-auto space-y-2">
                            <button 
                              onClick={() => {
                                setReadingBook(book);
                                setCurrentBookChapter(0);
                              }}
                              className="w-full text-[11px] py-3 bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 text-slate-950 font-black rounded-2xl transition flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                            >
                              <BookOpen size={13} /> Leer Ebook Interactivo
                            </button>
                            
                            {bookReview ? (
                              <div className="w-full text-center py-2 bg-emerald-950/40 text-emerald-400 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20 flex items-center justify-center gap-1">
                                <Check size={12} /> Calificado ★ {bookReview.rating}.0
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setCourseReviewing(book.id);
                                  setReviewType('book');
                                  setReviewName(book.title);
                                  setRating(5);
                                  setComment('');
                                }}
                                className="w-full text-[10px] py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition flex items-center justify-center gap-1 uppercase tracking-wider cursor-pointer border border-white/5"
                              >
                                <Star size={11} /> Calificar Libro
                              </button>
                            )}
                          </div>
                        ) : (
                          <button 
                            onClick={() => setSelectedBookForPurchase(book)}
                            className="w-full mt-auto text-[11px] py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 hover:text-white rounded-2xl font-black transition flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                          >
                            <ShoppingCart size={13} /> Adquirir Libro
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Mentores Favoritos */}
          {favoriteCoaches.length > 0 && (
             <section className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shadow-sm">
                        <MessageCircleHeart size={24} />
                     </div>
                     <h3 className="text-2xl font-black text-slate-900 tracking-tight">Mis Mentores</h3>
                  </div>
                  <button onClick={() => setShowDirectoryModal(true)} className="text-[11px] font-black text-kirateal uppercase tracking-widest hover:underline border border-kirateal/20 px-4 py-2 rounded-xl transition-colors hover:bg-kirateal/5">Full Directory</button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {favoriteCoaches.map(coach => (
                    <div key={coach.id} className="p-6 rounded-3xl border border-slate-100 bg-slate-50/40 hover:bg-white hover:shadow-2xl hover:border-kirateal/20 transition-all duration-300 group flex flex-col items-center text-center">
                       <div className="w-24 h-24 rounded-full overflow-hidden mb-5 border-4 border-white shadow-lg ring-4 ring-slate-100 group-hover:scale-110 transition-transform duration-500">
                          <img src={coach.photoURL} alt={coach.displayName} className="w-full h-full object-cover" />
                       </div>
                       <h4 className="text-base font-black text-slate-900 mb-1">{coach.displayName}</h4>
                       <p className="text-[11px] text-slate-400 mb-6 line-clamp-1 w-full font-bold uppercase tracking-tight">{coach.specialty}</p>
                       <button 
                        onClick={() => { setSelectedDirectoryCoach(coach); setShowDirectoryModal(true); }}
                        className="mt-auto px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[11px] font-black hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm w-full"
                       >
                         Ver Perfil
                       </button>
                    </div>
                  ))}
                </div>
             </section>
          )}
        </div>

        {/* SIDEBAR DERECHA */}
        <aside className="lg:col-span-4 flex flex-col gap-8">
          <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-kirateal/20 rounded-full blur-[80px] -mt-16 -mr-16"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-kiragold mb-8 border border-white/20">
                <Sparkles size={24} />
              </div>
              <h3 className="font-black text-2xl mb-6 tracking-tight leading-none">AI Insight <br/> Evolution</h3>
              <p className="text-sm opacity-80 leading-relaxed mb-8 font-medium italic text-indigo-100/90">
                "Tu reciente actividad académica sugiere un enfoque en Liderazgo. Recomendamos profundizar con el análisis de 'Biología del Éxito' en tu Vault."
              </p>
              <button className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-black transition-all hover:tracking-widest uppercase shadow-lg">
                Explorar Recomendaciones
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-8 relative z-10">
               <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-kiragold/10 rounded-2xl flex items-center justify-center text-kiragold-dark shadow-sm">
                     <Zap size={22} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Kira Vault</h3>
               </div>
               <button onClick={() => navigate('/dashboard/elite-library')} className="text-[10px] font-black text-kirateal uppercase tracking-widest hover:underline px-3 py-1.5 bg-kirateal/5 rounded-lg border border-kirateal/10">Ir</button>
            </div>
            
            <div className="space-y-5 relative z-10">
              {unlockedHistory.slice(0, 5).map((item, idx) => (
                 <a 
                   href={item.type === 'video' ? '#' : item.url}
                   target={item.type === 'video' ? '_self' : '_blank'}
                   rel="noopener noreferrer"
                   key={idx} 
                   className="flex items-center gap-4 p-4 rounded-3xl border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-kiragold/30 hover:shadow-2xl transition-all duration-300 group"
                 >
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm overflow-hidden shrink-0 relative p-1 border border-slate-100">
                       <img src={item.type === 'imagen' ? item.url : `https://picsum.photos/seed/${item.title}/100/100`} alt={item.title} className="w-full h-full object-cover rounded-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="text-[14px] font-black text-slate-800 truncate group-hover:text-kirateal transition-colors leading-tight mb-1">{item.title}</h4>
                       <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest opacity-60">{item.coachName}</p>
                    </div>
                 </a>
              ))}
              {unlockedHistory.length === 0 && (
                <div className="py-16 flex flex-col items-center justify-center text-center opacity-20 grayscale transition-all hover:grayscale-0 hover:opacity-100 duration-1000">
                   <Zap size={56} className="mb-4 text-kiragold" />
                   <div className="space-y-1">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-tight mb-1">Elite Vault</p>
                      <p className="text-[10px] font-bold text-slate-500 italic">Desbloquea contenido exclusivo</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Review Section */}
      {courseReviewing && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setCourseReviewing(null)} />
           <div className="bg-white rounded-[40px] w-full max-w-xl p-10 relative z-10 shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100">
             <div className="flex justify-between items-start mb-8">
               <div>
                 <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Feedback de Transformación</h4>
                 <p className="text-sm text-slate-500 font-medium">
                   Estás calificando {reviewType === 'course' ? 'el curso' : reviewType === 'book' ? 'el libro' : 'al mentor'}: <strong className="text-kirateal">{reviewName || 'Kira Coach'}</strong>
                 </p>
               </div>
               <button onClick={() => setCourseReviewing(null)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">✕</button>
             </div>
             
             <div className="flex gap-3 mb-8 justify-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
               {[1,2,3,4,5].map(star => (
                 <button 
                  key={star} 
                  onClick={() => setRating(star)} 
                  className={`text-4xl hover:scale-125 transition-all duration-300 ${rating >= star ? 'text-kiragold' : 'text-slate-200'}`}
                 >
                  ★
                 </button>
               ))}
             </div>
             
             <textarea 
               value={comment} 
               onChange={e => setComment(e.target.value)} 
               placeholder="Comparte tu experiencia... ¿Cómo ha cambiado tu perspectiva?"
               className="w-full p-6 border border-slate-100 rounded-3xl text-sm mb-8 focus:outline-none focus:ring-2 focus:ring-kirateal/20 h-40 resize-none bg-slate-50 font-medium leading-relaxed"
             />
             
             <div className="flex gap-4">
               <button onClick={() => setCourseReviewing(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs hover:bg-slate-200 transition-colors uppercase tracking-widest">
                 Cancelar
               </button>
               <button onClick={submitReview} className="flex-[2] py-4 bg-kirateal text-white rounded-2xl font-black text-xs hover:bg-kirateal-light transition-all shadow-lg shadow-teal-100 uppercase tracking-widest">
                 Enviar mi Opinión
               </button>
              </div>
            </div>
          </div>
       )}

      {/* EXCLUSIVE COMMUNITY CONFIG MODAL - MEJORADO */}
      {showCommunityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCommunityModal(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-[40px] border border-slate-200/60 w-full max-w-lg p-10 relative z-10 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                <Globe size={11} className="text-emerald-500" /> Landing Page Floating Button
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight font-serif">Editar Link de WhatsApp</h2>
              <p className="text-slate-500 font-medium text-xs leading-relaxed">
                Actualiza el link de invitación que se abre cuando un usuario hace clic en el botón flotante <strong className="font-bold">"Únete a nuestra Comunidad"</strong> en la página de inicio.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Enlace de Invitación de WhatsApp</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-500">
                    <MessageCircle size={16} />
                  </div>
                  <input
                    type="url"
                    value={whatsappUrl}
                    onChange={(e) => setWhatsappUrl(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full text-xs font-mono border border-slate-200 rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 bg-slate-50 focus:bg-white transition text-slate-800"
                  />
                </div>
              </div>

              {/* Mostrar enlace actual con botón de copiar */}
              {whatsappUrl && (
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">🔗 Enlace actual activo</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] font-mono text-slate-600 bg-white p-2 rounded-lg border border-slate-200 truncate">
                      {whatsappUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(whatsappUrl)}
                      className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Copiar enlace"
                    >
                      {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-slate-500" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-[11px] text-amber-700 font-medium leading-relaxed">
                ⚠️ <strong className="text-amber-800">Importante:</strong> Para obtener un nuevo enlace, ve a tu grupo de WhatsApp → Ajustes de grupo → Enlace de invitación → <strong>Restablecer enlace</strong>. Luego copia el nuevo enlace y pégalo aquí.
              </div>

              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-[11px] text-slate-500 font-medium leading-relaxed">
                💡 <strong className="text-slate-700">Nota técnica:</strong> Este cambio se actualiza en tiempo real en Firestore y se sincroniza automáticamente con el botón flotante de la landing page y la pestaña <strong>"Comunidad Estelar"</strong> del panel de alumnos.
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setShowCommunityModal(false)}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs transition uppercase tracking-widest cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={saveWhatsappUrl}
                disabled={savingCommunity || !whatsappUrl.trim()}
                className="flex-[2] py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-emerald-500/10 uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2"
              >
                {savingCommunity ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Guardando...
                  </>
                ) : (
                  'Guardar y Publicar'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* COCH / MENTOR DIRECTORY MODAL */}
      {showDirectoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => { setShowDirectoryModal(false); setSelectedDirectoryCoach(null); }} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white rounded-[40px] border border-slate-200/80 w-full max-w-6xl h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-8 py-6 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight font-serif flex items-center gap-2">
                  <Sparkles className="text-kirateal animate-pulse" size={22} />
                  {selectedDirectoryCoach ? `Mentor: ${selectedDirectoryCoach.displayName}` : "Directorio de Mentores Kira Coach"}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedDirectoryCoach 
                    ? "Explora la biografía, especialidades y los servicios evolutivos que ofrece este mentor." 
                    : "Encuentra el guía ideal para tu transformación consciente e inscríbete a sus cursos."}
                </p>
              </div>
              <button 
                onClick={() => { setShowDirectoryModal(false); setSelectedDirectoryCoach(null); }}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {selectedDirectoryCoach ? (
              /* DETAIL VIEW (COACH PROFILE & THEIR SERVICES) */
              <div className="flex-1 overflow-y-auto p-8 lg:p-10 flex flex-col lg:flex-row gap-10">
                {/* Left Side: Coach Profile Info */}
                <div className="lg:w-1/3 flex flex-col items-center text-center lg:items-start lg:text-left border-b lg:border-b-0 lg:border-r border-slate-100 pb-8 lg:pb-0 lg:pr-10 shrink-0">
                  <div className="w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-white shadow-xl ring-4 ring-slate-100">
                    <img 
                      src={selectedDirectoryCoach.photoURL || `https://picsum.photos/seed/${selectedDirectoryCoach.displayName}/150/150`} 
                      alt={selectedDirectoryCoach.displayName} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-2">
                    {selectedDirectoryCoach.displayName}
                    <BadgeCheck className="text-kirateal shrink-0" size={20} />
                  </h3>
                  <span className="px-4 py-1.5 bg-kirateal/10 text-kirateal rounded-full text-xs font-black uppercase tracking-widest mb-6">
                    {selectedDirectoryCoach.specialty || "Mentor General"}
                  </span>

                  <p className="text-slate-600 text-sm leading-relaxed mb-6 whitespace-pre-line font-medium">
                    {selectedDirectoryCoach.bio || "Este mentor está dedicado a guiar a las almas en su despertar de consciencia y desarrollo del ser."}
                  </p>

                  {/* Social media contact mockups/real and Favorites Toggle */}
                  <div className="w-full border-t border-slate-150 pt-6 mt-auto">
                    <div className="flex flex-wrap gap-4 justify-center lg:justify-start items-center mb-6">
                      <button
                        onClick={(e) => toggleDirectoryFavorite(e, selectedDirectoryCoach.id)}
                        className={cn(
                          "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition border",
                          userFavorites.includes(selectedDirectoryCoach.id)
                            ? "bg-rose-50 border-rose-100 text-rose-600"
                            : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300"
                        )}
                      >
                        <Heart size={14} className={cn(userFavorites.includes(selectedDirectoryCoach.id) && "fill-current")} />
                        {userFavorites.includes(selectedDirectoryCoach.id) ? "Favorito" : "Guardar Mentor"}
                      </button>

                      {(() => {
                        const coachReview = myReviews.find(r => r.coachId === selectedDirectoryCoach.id || (r.itemId === selectedDirectoryCoach.id && r.itemType === 'coach'));
                        return coachReview ? (
                          <div className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-wider">
                            <Check size={14} className="text-emerald-600" />
                            <span>Calificado ★ {coachReview.rating}.0</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setCourseReviewing(selectedDirectoryCoach.id);
                              setReviewType('coach');
                              setReviewName(selectedDirectoryCoach.displayName);
                              setRating(5);
                              setComment('');
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition border bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300"
                          >
                            <Star size={14} className="fill-amber-400 text-amber-500 animate-pulse" />
                            <span>Calificar Mentor</span>
                          </button>
                        );
                      })()}
                    </div>

                    <div className="flex gap-3 justify-center lg:justify-start">
                      {selectedDirectoryCoach.instagram && (
                        <a href={selectedDirectoryCoach.instagram} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 text-slate-500 rounded-xl transition">
                          <Instagram size={16} />
                        </a>
                      )}
                      {selectedDirectoryCoach.linkedin && (
                        <a href={selectedDirectoryCoach.linkedin} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 text-slate-500 rounded-xl transition">
                          <Linkedin size={16} />
                        </a>
                      )}
                      <button 
                        onClick={() => setSelectedDirectoryCoach(null)}
                        className="ml-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl uppercase tracking-widest transition"
                      >
                        ← Volver
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Side: Cursos & Servicios que ofrece */}
                <div className="flex-1 flex flex-col min-w-0">
                  <h4 className="text-xl font-black text-slate-800 tracking-tight font-serif mb-6 flex items-center gap-2">
                    <GraduationCap className="text-kirateal" size={20} />
                    Cursos y Servicios Activos
                  </h4>

                  <div className="flex-1 space-y-6">
                    {(() => {
                      const coachCourses = availableCourses.filter(c => c.coachId === selectedDirectoryCoach.id);
                      if (coachCourses.length === 0) {
                        return (
                          <div className="py-20 text-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200 p-8 flex flex-col items-center justify-center">
                            <GraduationCap size={44} className="text-slate-300 mb-4" />
                            <h5 className="text-slate-700 font-bold text-base mb-1">Sin cursos activos actualmente</h5>
                            <p className="text-slate-400 text-xs max-w-sm">
                              Este mentor está estructurando nuevas experiencias y consultorías de alto impacto. ¡Vuelve pronto!
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {coachCourses.map(course => {
                            // Determine user's enrollment status
                            const enrollment = myEnrollments.find(e => e.courseId === course.id);
                            const isEnrolled = enrollment && enrollment.status === 'approved';
                            const isPending = enrollment && enrollment.status === 'pending';

                            return (
                              <div key={course.id} className="bg-white border border-slate-150 rounded-[32px] p-6 hover:shadow-2xl transition duration-300 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                  <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono">
                                    {course.modality || "Online"}
                                  </span>
                                  {course.price > 0 ? (
                                    <span className="text-sm font-black text-kirateal font-mono">
                                      ${course.price}
                                    </span>
                                  ) : (
                                    <span className="text-sm font-black text-emerald-600 uppercase tracking-widest text-[11px]">
                                      Gratuito
                                    </span>
                                  )}
                                </div>
                                <h5 className="font-serif font-black text-slate-800 text-base mb-2 line-clamp-1">{course.title}</h5>
                                <p className="text-slate-500 text-xs leading-relaxed mb-6 line-clamp-3">
                                  {course.description || "Sin descripción disponible."}
                                </p>
                                
                                <div className="mt-auto pt-4 border-t border-slate-100">
                                  {isEnrolled ? (
                                    <div className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-[11px] font-black uppercase tracking-widest text-center border border-emerald-100">
                                      ✓ Inscrito & Activo
                                    </div>
                                  ) : isPending ? (
                                    <div className="w-full py-3 bg-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest text-center border border-slate-200">
                                      ⏳ Solicitud Pendiente
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setSelectedCourseForEnroll(course)}
                                      disabled={checkingOutId === course.id}
                                      className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest text-center transition flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      {checkingOutId === course.id ? (
                                        <>
                                          <Loader2 size={12} className="animate-spin" /> Procesando...
                                        </>
                                      ) : (
                                        "Solicitar Cupo Directo"
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              /* LIST VIEW OF COACHES */
              <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
                {/* Search & Filter Bar */}
                <div className="bg-white border-b border-slate-100 p-6 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
                  <div className="relative w-full sm:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Search size={16} />
                    </div>
                    <input
                      type="text"
                      value={directorySearchQuery}
                      onChange={(e) => setDirectorySearchQuery(e.target.value)}
                      placeholder="Buscar por nombre, especialidad..."
                      className="w-full text-xs border border-slate-200 rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-kirateal/10 focus:border-kirateal bg-slate-50 focus:bg-white transition"
                    />
                  </div>

                  <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                    {["Todos", "Espiritualidad", "Liderazgo", "Ontología", "Arteterapia"].map((spec) => (
                      <button
                        key={spec}
                        onClick={() => setDirectorySpecialty(spec)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-black transition shrink-0 uppercase tracking-widest",
                          directorySpecialty === spec
                            ? "bg-kirateal text-white shadow-md shadow-teal-500/15"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        )}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-8 lg:p-10">
                  {(() => {
                    const filtered = allCoaches.filter(c => {
                      const matchesSearch = 
                        c.displayName?.toLowerCase().includes(directorySearchQuery.toLowerCase()) ||
                        c.specialty?.toLowerCase().includes(directorySearchQuery.toLowerCase()) ||
                        c.bio?.toLowerCase().includes(directorySearchQuery.toLowerCase());
                      const matchesSpec = 
                        directorySpecialty === 'Todos' || 
                        c.specialty?.toLowerCase().includes(directorySpecialty.toLowerCase());
                      return matchesSearch && matchesSpec;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="py-24 text-center">
                          <User size={48} className="text-slate-300 mx-auto mb-4" />
                          <h4 className="text-slate-700 font-bold text-lg mb-1">No se encontraron mentores</h4>
                          <p className="text-slate-400 text-sm max-w-xs mx-auto">
                            Intenta ajustar los términos de búsqueda o filtros para explorar a nuestros guías.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filtered.map(coach => (
                          <div 
                            key={coach.id} 
                            onClick={() => setSelectedDirectoryCoach(coach)}
                            className="bg-white border border-slate-150 rounded-[40px] p-6 hover:shadow-2xl hover:border-kirateal/20 transition-all duration-300 group flex flex-col items-center text-center cursor-pointer relative"
                          >
                            <button
                              onClick={(e) => toggleDirectoryFavorite(e, coach.id)}
                              className="absolute top-6 right-6 w-9 h-9 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center border border-slate-100 text-slate-400 hover:text-rose-500 transition shadow-sm z-10"
                            >
                              <Heart size={14} className={cn(userFavorites.includes(coach.id) && "fill-current text-rose-500")} />
                            </button>

                            <div className="w-24 h-24 rounded-full overflow-hidden mb-5 border-4 border-white shadow-lg ring-4 ring-slate-100 group-hover:scale-105 transition-transform duration-500">
                              <img 
                                src={coach.photoURL || `https://picsum.photos/seed/${coach.displayName}/150/150`} 
                                alt={coach.displayName} 
                                className="w-full h-full object-cover" 
                              />
                            </div>
                            
                            <h4 className="text-lg font-black text-slate-900 mb-1 group-hover:text-kirateal transition-colors">{coach.displayName}</h4>
                            <p className="text-[10px] text-kirateal font-black uppercase tracking-widest mb-4 bg-kirateal/5 px-3 py-1 rounded-full border border-kirateal/10">
                              {coach.specialty || "Mentor General"}
                            </p>
                            
                            <p className="text-slate-500 text-xs leading-relaxed mb-6 line-clamp-3">
                              {coach.bio || "Este mentor está dedicado a guiar a las almas en su despertar de consciencia y desarrollo del ser."}
                            </p>

                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedDirectoryCoach(coach); }}
                              className="mt-auto w-full py-3 bg-slate-50 hover:bg-slate-900 text-slate-700 hover:text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border border-slate-200"
                            >
                              Ver Perfil & Servicios
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

export function Journal() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('positive');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  
  useEffect(() => {
    if (user) {
      generatePredictivePrompt();
    }
  }, [user]);

  const generatePredictivePrompt = async () => {
    if (!user) return;
    setLoadingPrompt(true);
    try {
      const q = query(
        collection(db, 'journals'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const snap = await getDocs(q);
      const previousEntries = snap.docs.map(d => d.data().content).join('\n---\n');

      const prompt = `
        Actúa como Kira, una asistente de bienestar consciente.
        Basado en los últimos diarios de ${user.displayName || 'el usuario'}:
        "${previousEntries || 'El usuario aún no tiene entradas previas.'}"
        
        Genera una pregunta corta, cálida y empática (máximo 15 palabras) para que el usuario reflexione hoy. 
        Si no hay entradas previas, dale una bienvenida inspiradora.
      `;

      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          contents: prompt
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const text = data.text || '';
      setAiPrompt(text.trim());
    } catch (e) {
      console.error('Error generating predictive prompt:', e);
      setAiPrompt('¿Qué intención quieres sembrar en tu corazón hoy?');
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleSave = async () => {
    if(!content.trim() || !user) return;
    try {
      const currentPoints = user.points || 0;
      const userRef = doc(db, 'users', user.uid);
      
      await addDoc(collection(db, 'journals'), {
        userId: user.uid,
        content: content.trim(),
        sentiment,
        createdAt: new Date()
      });

      await updateDoc(userRef, {
        points: currentPoints + 20
      });

      setContent('');
      alert("¡Entrada sincronizada! Has generado +20 Energy Pts.");
    } catch(e) {
      handleFirestoreError(e, OperationType.WRITE, 'journals');
    }
  };

  const sentiments = [
    { id: 'positive', label: 'Evolutivo', emoji: '🌟' },
    { id: 'neutral', label: 'Estable', emoji: '🌿' },
    { id: 'negative', label: 'Desafiante', emoji: '🌪️' }
  ];

  return (
    <div className="flex flex-col gap-10 animate-in fade-in transition-all">
      <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
           <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center shadow-sm">
              <Activity size={24} />
           </div>
           <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Journaling IA</h2>
              <p className="text-slate-500 font-medium text-sm">Sincroniza tu estado interno con el Pipeline de Evolución.</p>
           </div>
        </div>

        {aiPrompt && (
          <div className="mb-10 p-8 bg-slate-50 border border-slate-150 rounded-[32px] flex items-start gap-5 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-violet-100/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
             <div className="p-3 bg-white rounded-2xl shadow-sm text-violet-600 border border-slate-100 group-hover:scale-110 transition-transform">
                <Sparkles size={20} />
             </div>
             <div className="relative z-10 flex-1">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Kira Predictive Insight</p>
                <p className="text-lg text-slate-700 italic font-medium leading-relaxed italic">
                  {loadingPrompt ? "Decodificando patrones energéticos..." : `"${aiPrompt}"`}
                </p>
             </div>
          </div>
        )}
        
        <div className="flex gap-4 mb-10">
          {sentiments.map(s => (
            <button
              key={s.id}
              onClick={() => setSentiment(s.id as any)}
              className={cn(
                "flex-1 p-5 rounded-[24px] border transition-all text-center group relative overflow-hidden",
                sentiment === s.id 
                  ? "bg-violet-50 border-violet-100 shadow-inner ring-1 ring-violet-200/50" 
                  : "bg-white border-slate-100 hover:border-slate-200"
              )}
            >
              <div className="text-2xl mb-2 grayscale group-hover:grayscale-0 transition-all">{s.emoji}</div>
              <div className={cn(
                "text-[11px] font-black uppercase tracking-widest",
                sentiment === s.id ? "text-violet-600" : "text-slate-400 group-hover:text-slate-600"
              )}>{s.label}</div>
            </button>
          ))}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Comienza a descargar tus pensamientos..."
          className="w-full h-56 p-8 rounded-[32px] border border-slate-100 focus:outline-none focus:ring-4 focus:ring-violet-500/5 font-medium leading-relaxed bg-slate-50 mb-8 text-[15px] shadow-inner transition-all focus:bg-white focus:border-violet-200"
        />
        
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-[28px] border border-slate-100">
          <div className="px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            {content.length} caracteres
          </div>
          <button 
            onClick={handleSave}
            disabled={!content.trim()}
            className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[13px] font-black uppercase tracking-widest hover:bg-black disabled:opacity-30 transition-all shadow-xl active:scale-95"
          >
            Sincronizar Al Búnker
          </button>
        </div>
      </div>
      <KiraNudge />
    </div>
  );
}
