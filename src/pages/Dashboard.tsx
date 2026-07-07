import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot, doc, updateDoc, setDoc, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { MentorWidget } from '../components/MentorWidget';
import { Seal } from '../components/Brand';
import { CreditCard, Star, GraduationCap, Zap, CheckCircle2, ShoppingCart, ShieldCheck, Activity, Award, CalendarDays, Sparkles, ArrowRight, MessageCircleHeart, ChevronLeft, ChevronRight, HeartPulse, Loader2, BookOpen, LogOut, MessageCircle, Globe, Copy, Check } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { KiraNudge } from '../components/KiraNudge';

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reviewingItem, setReviewingItem] = useState<{ id: string; type: 'course' | 'book'; title: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [availableBooks, setAvailableBooks] = useState<any[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<any[]>([]);
  const [favoriteCoaches, setFavoriteCoaches] = useState<any[]>([]);
  const [unlockedHistory, setUnlockedHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);

  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [paymentForm, setPaymentForm] = useState({ cardName: '', cardNumber: '', expiry: '', cvv: '' });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any | null>(null);

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
        await addDoc(collection(db, 'enrollments'), {
          userId: user.uid,
          courseId,
          progress: 0,
          createdAt: new Date()
        });

        await addDoc(collection(db, 'transactions'), {
          userId: user.uid,
          amount: Number(amount),
          type: 'course_purchase',
          courseId,
          createdAt: new Date()
        });

        setSearchParams({});
        fetchData();
      } catch (e) {
        console.error('Error recording payment success:', e);
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
      setMyEnrollments(enrollSnap.docs.map(d => d.data().courseId));

      // Fetch favorites
      if (user.favorites && user.favorites.length > 0) {
        const coachesQ = query(
          collection(db, 'users'), 
          where('__name__', 'in', user.favorites.slice(0, 10))
        );
        const coachesSnap = await getDocs(coachesQ);
        setFavoriteCoaches(coachesSnap.docs.map(d => ({id: d.id, ...d.data()})));
      } else {
        setFavoriteCoaches([]);
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

      try {
        const purchasesQ = query(collection(db, 'purchases'), where('userId', '==', user.uid));
        const purchasesSnap = await getDocs(purchasesQ);
        setPurchases(purchasesSnap.docs.map(d => ({id: d.id, ...d.data()})));
      } catch (purchasesErr) {
        console.warn("Purchases fetch failed:", purchasesErr);
      }
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
          amount: course.price,
          title: course.title
        })
      });
      const data = await resp.json();
      if (data.error) {
        throw new Error(data.error);
      }
      window.location.href = data.url;
    } catch(e: any) {
      console.error('Stripe Redirect Error:', e);
      alert('Error al iniciar la inscripción: ' + (e.message || String(e)));
      setCheckingOutId(null);
    }
  };

  const addToCart = (item: any, type: 'course' | 'book') => {
    if (cartItems.some(it => it.id === item.id)) {
      setShowCart(true);
      return;
    }
    setCartItems([...cartItems, { ...item, itemType: type }]);
    setShowCart(true);
  };

  const removeFromCart = (id: string) => {
    setCartItems(cartItems.filter(it => it.id !== id));
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsProcessingPayment(true);
    
    try {
      for (const item of cartItems) {
        await addDoc(collection(db, 'purchases'), {
          userId: user.uid,
          userEmail: user.email || '',
          userName: user.displayName || user.name || 'Alumno',
          itemId: item.id,
          itemType: item.itemType || (item.bannerUrl ? 'course' : 'book'),
          itemTitle: item.title,
          itemPrice: Number(item.price),
          imageUrl: item.imageUrl || item.bannerUrl || '',
          status: 'pending_release',
          createdAt: new Date()
        });

        await addDoc(collection(db, 'transactions'), {
          userId: user.uid,
          amount: Number(item.price),
          type: item.itemType === 'course' ? 'course_purchase' : 'book_purchase',
          itemId: item.id,
          itemTitle: item.title,
          status: 'pending_release',
          createdAt: new Date()
        });
      }

      setPaymentSuccessData({
        items: [...cartItems],
        total: cartItems.reduce((acc, it) => acc + Number(it.price), 0)
      });
      
      setCartItems([]);
      setPaymentForm({ cardName: '', cardNumber: '', expiry: '', cvv: '' });
      setShowPaymentModal(false);
      
      fetchData();
    } catch (err: any) {
      console.error("Error creating purchases:", err);
      alert("Ocurrió un error al registrar el pago: " + (err.message || String(err)));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const submitReview = async () => {
    if (!user || !reviewingItem) return;
    try {
      await addDoc(collection(db, 'reviews'), {
        itemId: reviewingItem.id,
        itemType: reviewingItem.type,
        courseId: reviewingItem.type === 'course' ? reviewingItem.id : null,
        bookId: reviewingItem.type === 'book' ? reviewingItem.id : null,
        userId: user.uid,
        rating,
        comment,
        status: 'published',
        createdAt: new Date()
      });
      setReviewingItem(null);
      setComment('');
      setRating(5);
    } catch(e) {
      console.error(e);
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
            Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-kirateal to-violet-600">{(user?.displayName || user?.name || user?.email || 'Alumno').split(' ')[0]}</span>
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
          {/* Cart Button */}
          <button
            onClick={() => setShowCart(true)}
            className="relative p-4 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl border border-slate-200/60 shadow-sm transition-all duration-300 hover:shadow-md cursor-pointer active:scale-95 flex items-center justify-center h-16 w-16 shrink-0"
            title="Ver mi Carrito"
          >
            <ShoppingCart size={22} className="text-kirateal" />
            {cartItems.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[10px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                {cartItems.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => navigate('/dashboard/profile')}
            className="w-16 h-16 rounded-2xl bg-slate-200 overflow-hidden border-4 border-white shadow-md hover:ring-4 hover:ring-kirateal/10 transition-all duration-300"
            title="Mi Perfil"
          >
            {(user?.photoURL || user?.photoUrl) ? (
              <img src={user.photoURL || user.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-2xl">
                {(user?.displayName || user?.name || '?')[0].toUpperCase()}
              </div>
            )}
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
      <div className="bg-gradient-to-r from-teal-900 to-indigo-950 border border-teal-500/20 rounded-[32px] p-6 text-white relative overflow-hidden shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
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
                    onClick={() => { completeOnboarding(); navigate('/'); }}
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
            <p className="text-4xl font-black text-slate-900 tracking-tight">{myEnrollments.length}</p>
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
                  const isEnrolled = myEnrollments.includes(course.id);
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
                              {(() => {
                                if (isEnrolled) {
                                  return (
                                    <button 
                                      onClick={() => setReviewingItem({ id: course.id, type: 'course', title: course.title })} 
                                      className="w-full text-[13px] px-6 py-3.5 bg-white text-slate-700 border border-slate-200 rounded-2xl hover:bg-slate-50 font-black transition flex items-center justify-center gap-2 shadow-sm"
                                    >
                                      <Star size={16} /> Calificar
                                    </button>
                                  );
                                }
                                const coursePurchase = purchases.find(p => p.itemId === course.id);
                                if (coursePurchase) {
                                  if (coursePurchase.status === 'pending_release') {
                                    return (
                                      <button 
                                        disabled
                                        className="w-full text-[13px] px-6 py-3.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-2xl font-black flex items-center justify-center gap-2 shadow-sm cursor-not-allowed"
                                      >
                                        ⏳ Pendiente
                                      </button>
                                    );
                                  } else {
                                    return (
                                      <button 
                                        onClick={async () => {
                                          try {
                                            await addDoc(collection(db, 'enrollments'), {
                                              userId: user.uid,
                                              courseId: course.id,
                                              progress: 0,
                                              createdAt: new Date()
                                            });
                                            fetchData();
                                          } catch (err) {
                                            console.error(err);
                                          }
                                        }}
                                        className="w-full text-[13px] px-6 py-3.5 bg-violet-600 text-white rounded-2xl hover:bg-violet-700 font-black transition flex items-center justify-center gap-2 shadow-sm"
                                      >
                                        <CheckCircle2 size={16} /> Activar
                                      </button>
                                    );
                                  }
                                }
                                const isInCart = cartItems.some(item => item.id === course.id);
                                return (
                                  <button 
                                    onClick={() => addToCart(course, 'course')}
                                    className="w-full text-[13px] px-6 py-3.5 bg-kirateal text-white rounded-2xl hover:bg-kirateal-light font-black transition flex items-center justify-center gap-2 shadow-xl shadow-teal-100"
                                  >
                                    <ShoppingCart size={16} /> {isInCart ? 'En Carrito' : 'Inscribirse'}
                                  </button>
                                );
                              })()}
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
                    Biblioteca y Ebooks de la Plataforma
                  </h3>
                  <p className="text-sm text-slate-400 mt-1 font-medium">Lecturas, guías y ebooks publicados por nuestros Coaches y Administradores oficiales de Kira.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                {availableBooks.map((book) => (
                  <div key={book.id} className="border border-white/5 rounded-[32px] overflow-hidden bg-slate-950/60 hover:border-emerald-400/40 transition-all duration-500 flex flex-col min-h-[460px] justify-between">
                    <div className="h-44 bg-slate-950/80 relative overflow-hidden shrink-0 flex items-center justify-center p-4 border-b border-white/5">
                      {book.imageUrl && (
                        <div 
                          className="absolute inset-0 bg-cover bg-center opacity-20 blur-md scale-110 pointer-events-none"
                          style={{ backgroundImage: `url(${book.imageUrl})` }}
                        />
                      )}
                      
                      {book.imageUrl ? (
                        <img 
                          src={book.imageUrl} 
                          alt={book.title} 
                          className="h-full max-w-[120px] object-contain transition-transform duration-500 hover:scale-105 drop-shadow-2xl z-10 rounded-lg" 
                        />
                      ) : (
                        <div className="h-full aspect-[3/4] bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 text-xs font-black border border-slate-700 z-10 shadow-xl">
                          NO COVER
                        </div>
                      )}
                      
                      <div className="absolute top-4 left-4 bg-emerald-500/95 text-slate-950 px-2.5 py-1 rounded-full text-[10px] font-black shadow-lg z-20 uppercase tracking-wider">
                        ${book.price} USD
                      </div>
                      
                      <div className="absolute top-4 right-4 flex gap-1.5 z-20">
                        <span className="px-2 py-0.5 bg-violet-600/90 backdrop-blur rounded text-[8px] font-black text-white uppercase tracking-wider shadow-sm flex items-center gap-1">
                          pdf
                        </span>
                        <span className="px-2 py-0.5 bg-kiragold/90 backdrop-blur rounded text-[8px] font-black text-slate-950 uppercase tracking-wider shadow-sm flex items-center gap-1">
                          {book.authorType === 'admin' || book.author?.toLowerCase().includes('zurita') || book.role === 'admin' ? 'Oficial' : 'Coach'}
                        </span>
                      </div>
                    </div>
                    <div className="p-5 flex flex-col flex-1 justify-between">
                      <div>
                        <h4 className="font-black text-base text-slate-100 mb-1 line-clamp-1" title={book.title}>{book.title}</h4>
                        <p className="text-[10px] text-emerald-400 font-bold mb-3 uppercase tracking-wider">Por {book.author || 'Kira Coach'}</p>
                        <p className="text-xs text-slate-400 mb-4 line-clamp-3 leading-relaxed font-medium">
                          {book.description || 'Un libro canalizado y estructurado con herramientas prácticas de arteterapia, respiración consciente y autoconocimiento.'}
                        </p>
                      </div>
                      
                      <div className="mt-auto pt-2">
                        {(() => {
                          const bookPurchase = purchases.find(p => p.itemId === book.id);
                          if (bookPurchase) {
                            if (bookPurchase.status === 'pending_release') {
                              return (
                                <button 
                                  disabled
                                  className="w-full text-[10px] py-2.5 bg-slate-800 text-slate-500 rounded-xl font-black flex items-center justify-center gap-2 uppercase tracking-wider cursor-not-allowed border border-slate-700"
                                >
                                  ⏳ Pendiente de liberación
                                </button>
                              );
                            } else {
                              return (
                                <div className="flex flex-col gap-2 w-full">
                                  <button 
                                    onClick={() => alert(`Lectura del Ebook: "${book.title}". ¡Excelente decisión! Hemos habilitado el material interactivo y PDF en tu correo corporativo o personal.`)}
                                    className="w-full text-[10px] py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black transition flex items-center justify-center gap-2 uppercase tracking-wider shadow-lg shadow-violet-900/20 active:scale-[0.98]"
                                  >
                                    <BookOpen size={12} /> Leer PDF
                                  </button>
                                  <button 
                                    onClick={() => setReviewingItem({ id: book.id, type: 'book', title: book.title })}
                                    className="w-full text-[10px] py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-black transition flex items-center justify-center gap-2 uppercase tracking-wider active:scale-[0.98]"
                                  >
                                    <Star size={12} className="text-kiragold" /> Calificar Libro
                                  </button>
                                </div>
                              );
                            }
                          }
                          const isInCart = cartItems.some(item => item.id === book.id);
                          return (
                            <button 
                              onClick={() => addToCart(book, 'book')}
                              className="w-full text-[10px] py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 hover:text-white rounded-xl font-black transition flex items-center justify-center gap-2 uppercase tracking-wider shadow-lg shadow-emerald-500/10 active:scale-[0.98]"
                            >
                              <ShoppingCart size={12} /> {isInCart ? 'En Carrito' : 'Adquirir Libro'}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECCIÓN DE MIS COMPRAS (Librería y Cursos Adquiridos) */}
          {purchases.length > 0 && (
            <section className="bg-slate-50 border border-slate-200 rounded-[40px] p-10 shadow-sm mt-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <CreditCard className="text-kirateal" size={24} />
                    Mis Compras & Historial
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 font-medium">Sigue el estado de liberación de tus ebooks y programas premium adquiridos.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {purchases.map((purchase) => (
                  <div key={purchase.id} className="bg-white border border-slate-150 rounded-[32px] overflow-hidden p-6 hover:shadow-md transition-all flex flex-col justify-between min-h-[180px]">
                    <div className="flex gap-4 items-start">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-150">
                        {purchase.imageUrl ? (
                          <img src={purchase.imageUrl} alt={purchase.itemTitle} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-200 flex items-center justify-center font-black text-slate-400 uppercase text-xs">
                            {purchase.itemType === 'course' ? 'C' : 'B'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mb-2 ${purchase.itemType === 'course' ? 'bg-kirateal/10 text-kirateal border border-kirateal/15' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                          {purchase.itemType === 'course' ? 'Programa' : 'Ebook'}
                        </span>
                        <h4 className="font-black text-base text-slate-900 leading-tight truncate">{purchase.itemTitle}</h4>
                        <p className="text-[11px] text-slate-400 font-bold mt-1">Precio: ${purchase.itemPrice} USD</p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${purchase.status === 'pending_release' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                          {purchase.status === 'pending_release' ? 'Pendiente' : 'Liberado'}
                        </span>
                      </div>

                      {purchase.status === 'pending_release' ? (
                        <span className="text-[10px] text-slate-400 font-medium italic">Esperando al Coach...</span>
                      ) : (
                        purchase.itemType === 'course' ? (
                          myEnrollments.includes(purchase.itemId) ? (
                            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle2 size={12} /> Activo
                            </span>
                          ) : (
                            <button
                              onClick={async () => {
                                try {
                                  await addDoc(collection(db, 'enrollments'), {
                                    userId: user.uid,
                                    courseId: purchase.itemId,
                                    progress: 0,
                                    createdAt: new Date()
                                  });
                                  fetchData();
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="text-xs px-4 py-2 bg-kirateal hover:bg-kirateal-dark text-white rounded-xl font-black uppercase tracking-wider transition active:scale-95 cursor-pointer"
                            >
                              Ingresar
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => alert(`Lectura del Ebook: "${purchase.itemTitle}". ¡Disfruta de esta obra maestra interactiva en PDF que hemos habilitado en tu correo!`)}
                            className="text-xs px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black uppercase tracking-wider transition active:scale-95 cursor-pointer"
                          >
                            Leer
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
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
                  <button onClick={() => navigate('/')} className="text-[11px] font-black text-kirateal uppercase tracking-widest hover:underline border border-kirateal/20 px-4 py-2 rounded-xl transition-colors hover:bg-kirateal/5">Full Directory</button>
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
                        onClick={() => navigate('/')}
                        className="mt-auto px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[11px] font-black hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm w-full"
                       >
                         Chat Mentor
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
               <button onClick={() => navigate('/dashboard/elite')} className="text-[10px] font-black text-kirateal uppercase tracking-widest hover:underline px-3 py-1.5 bg-kirateal/5 rounded-lg border border-kirateal/10">Ir</button>
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
      {reviewingItem && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setReviewingItem(null)} />
           <div className="bg-white rounded-[40px] w-full max-w-xl p-10 relative z-10 shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100">
             <div className="flex justify-between items-start mb-8">
               <div>
                 <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Feedback de Transformación</h4>
                 {reviewingItem && (
                   <p className="text-xs text-kirateal font-extrabold uppercase tracking-widest mt-1 mb-2">
                     {reviewingItem.type === 'course' ? 'Curso' : 'Libro'}: {reviewingItem.title}
                   </p>
                 )}
                 <p className="text-sm text-slate-500 font-medium">Ayúdanos a elevar el estándar de Kira Coach.</p>
               </div>
               <button onClick={() => setReviewingItem(null)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">✕</button>
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
               <button onClick={() => setReviewingItem(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs hover:bg-slate-200 transition-colors uppercase tracking-widest">
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

      {/* SIDEBAR CART DRAWER */}
      {showCart && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowCart(false)} />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md">
              <div className="h-full flex flex-col bg-white shadow-2xl overflow-y-scroll rounded-l-[40px] border-l border-slate-200">
                <div className="flex-1 py-8 overflow-y-auto px-6 sm:px-8">
                  <div className="flex items-start justify-between pb-6 border-b border-slate-150">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <ShoppingCart size={24} className="text-kirateal" /> Carrito de Compras
                    </h2>
                    <button onClick={() => setShowCart(false)} className="text-slate-400 hover:text-slate-600 p-2 font-black">✕</button>
                  </div>

                  <div className="mt-8">
                    {cartItems.length === 0 ? (
                      <div className="text-center py-24">
                        <ShoppingCart size={48} className="mx-auto text-slate-300 mb-4 stroke-[1.5]" />
                        <p className="text-slate-500 font-bold">Tu carrito está vacío</p>
                        <p className="text-slate-400 text-xs mt-1">Explora nuestros ebooks y cursos recomendados para añadir contenido.</p>
                      </div>
                    ) : (
                      <div className="flow-root">
                        <ul className="-my-6 divide-y divide-slate-100">
                          {cartItems.map((item) => (
                            <li key={item.id} className="py-6 flex gap-4">
                              <div className="flex-shrink-0 w-24 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                                <img src={item.imageUrl || item.bannerUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150'} alt={item.title} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 flex flex-col">
                                <div>
                                  <div className="flex justify-between text-base font-black text-slate-900">
                                    <h3 className="line-clamp-1">{item.title}</h3>
                                    <p className="ml-4">${item.price} USD</p>
                                  </div>
                                  <p className="mt-1 text-xs text-slate-500 font-medium">
                                    {item.bannerUrl ? 'Curso Premium' : 'Ebook Recomendado'}
                                  </p>
                                </div>
                                <div className="flex-1 flex items-end justify-between text-sm">
                                  <span className="text-slate-400 text-xs font-bold">Cantidad: 1</span>
                                  <div className="flex">
                                    <button 
                                      onClick={() => removeFromCart(item.id)} 
                                      className="font-black text-xs text-rose-500 hover:text-rose-600 uppercase tracking-widest cursor-pointer"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {cartItems.length > 0 && (
                  <div className="border-t border-slate-100 py-8 px-6 sm:px-8 bg-slate-50/50">
                    <div className="flex justify-between text-base font-black text-slate-900 mb-6">
                      <p>Total de la Orden</p>
                      <p>${cartItems.reduce((acc, item) => acc + Number(item.price), 0).toFixed(2)} USD</p>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 mb-6 leading-relaxed">
                      El pago se procesará a través de nuestro simulador de pasarela segura. Una vez completado, el Coach liberará tu acceso de forma inmediata o manual.
                    </p>
                    <div>
                      <button
                        onClick={() => { setShowCart(false); setShowPaymentModal(true); }}
                        className="w-full flex justify-center items-center px-6 py-4 border border-transparent rounded-2xl shadow-xl shadow-teal-100 bg-kirateal text-base font-black text-white hover:bg-kirateal-dark transition duration-300"
                      >
                        Proceder al Pago
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATED PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
          <div className="bg-white rounded-[40px] w-full max-w-lg p-8 sm:p-10 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <CreditCard size={24} className="text-kirateal" /> Checkout de Compra
                </h3>
                <p className="text-xs text-slate-500 mt-1">Simulador de pasarela de pago segura de Kira Coach</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 font-bold p-2">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              {/* Order Summary */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Resumen del Pedido</h4>
                <ul className="space-y-3 divide-y divide-slate-100">
                  {cartItems.map((item) => (
                    <li key={item.id} className="pt-2 first:pt-0 flex justify-between items-center text-sm">
                      <div>
                        <span className="font-bold text-slate-800">{item.title}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded ml-2 font-bold uppercase">
                          {item.bannerUrl ? 'Curso' : 'Libro'}
                        </span>
                      </div>
                      <span className="font-black text-slate-900 shrink-0 ml-4">${item.price} USD</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between items-center text-base font-black text-slate-900">
                  <span>Monto Total</span>
                  <span>${cartItems.reduce((acc, item) => acc + Number(item.price), 0).toFixed(2)} USD</span>
                </div>
              </div>

              {/* Card form */}
              <form onSubmit={handleProcessPayment} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Nombre en la Tarjeta</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Robert Harrison"
                    value={paymentForm.cardName}
                    onChange={(e) => setPaymentForm({ ...paymentForm, cardName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-kirateal/5 transition-all outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Número de Tarjeta</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="4000 1234 5678 9010"
                      maxLength={19}
                      value={paymentForm.cardNumber}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                        let matches = val.match(/\d{4,16}/g);
                        let match = matches && matches[0] || '';
                        let parts = [];
                        for (let i = 0, len = match.length; i < len; i += 4) {
                          parts.push(match.substring(i, i + 4));
                        }
                        if (parts.length > 0) {
                          setPaymentForm({ ...paymentForm, cardNumber: parts.join(' ') });
                        } else {
                          setPaymentForm({ ...paymentForm, cardNumber: val });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-kirateal/5 transition-all outline-none pl-11"
                    />
                    <CreditCard className="absolute left-4 top-3.5 text-slate-400" size={18} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Vencimiento</label>
                    <input
                      type="text"
                      required
                      placeholder="MM/AA"
                      maxLength={5}
                      value={paymentForm.expiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length >= 2) {
                          setPaymentForm({ ...paymentForm, expiry: val.substring(0, 2) + '/' + val.substring(2, 4) });
                        } else {
                          setPaymentForm({ ...paymentForm, expiry: val });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-kirateal/5 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">CVC / CVV</label>
                    <input
                      type="password"
                      required
                      placeholder="123"
                      maxLength={4}
                      value={paymentForm.cvv}
                      onChange={(e) => setPaymentForm({ ...paymentForm, cvv: e.target.value.replace(/[^0-9]/g, '') })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-kirateal/5 transition-all outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="w-full mt-6 py-4 bg-kirateal text-white hover:bg-kirateal-dark rounded-2xl font-black uppercase text-xs tracking-wider transition-all duration-300 hover:shadow-xl hover:shadow-teal-100 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-50"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Procesando Transacción...
                    </>
                  ) : (
                    <>
                      Pagar ${cartItems.reduce((acc, item) => acc + Number(item.price), 0).toFixed(2)} USD
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT SUCCESS MODAL */}
      {paymentSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPaymentSuccessData(null)} />
          <div className="bg-white rounded-[40px] w-full max-w-md p-8 relative z-10 shadow-2xl text-center flex flex-col items-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6">
              <CheckCircle2 size={40} className="stroke-[2.5]" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">¡Pago Realizado con Éxito!</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Hemos registrado el pago de tu orden de forma segura en Firestore.
            </p>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left w-full mb-6 space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalle de la Transacción</p>
              {paymentSuccessData.items.map((it: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">{it.title}</span>
                  <span className="font-black text-slate-900">${it.price} USD</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-xs font-black text-slate-900">
                <span>Total pagado</span>
                <span>${paymentSuccessData.total.toFixed(2)} USD</span>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4 text-amber-800 text-xs text-left leading-relaxed mb-8 flex gap-3 items-start">
              <span className="text-lg">⏳</span>
              <div>
                <strong className="font-bold block mb-0.5">Pendiente de liberación por el Coach:</strong>
                Según las políticas de Kira Coach, tu material/acceso será liberado y habilitado manualmente por tu Coach o Administrador desde su Panel de Control. ¡Te avisaremos por correo!
              </div>
            </div>
            <button 
              onClick={() => setPaymentSuccessData(null)}
              className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300"
            >
              Cerrar y Ver Mis Compras
            </button>
          </div>
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
