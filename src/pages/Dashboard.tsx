import { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { MentorWidget } from '../components/MentorWidget';
import { Seal } from '../components/Brand';
import { CreditCard, Star, GraduationCap, Zap, CheckCircle2, ShoppingCart, ShieldCheck, Activity, Award, CalendarDays, Sparkles, ArrowRight, MessageCircleHeart, ChevronLeft, ChevronRight, HeartPulse } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { KiraNudge } from '../components/KiraNudge';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [courseReviewing, setCourseReviewing] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<any[]>([]);
  const [favoriteCoaches, setFavoriteCoaches] = useState<any[]>([]);
  const [unlockedHistory, setUnlockedHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

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
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStripeCheckout = async (course: any) => {
    if(!user) return;
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
      const { url } = await resp.json();
      window.location.href = url;
    } catch(e) {
      console.error('Stripe Redirect Error:', e);
    }
  };

  const submitReview = async () => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'reviews'), {
        courseId: courseReviewing,
        userId: user.uid,
        rating,
        comment,
        status: 'published',
        createdAt: new Date()
      });
      setCourseReviewing(null);
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
          <button 
            onClick={() => navigate('/perfil')}
            className="w-16 h-16 rounded-2xl bg-slate-200 overflow-hidden border-4 border-white shadow-md hover:ring-4 hover:ring-kirateal/10 transition-all duration-300"
          >
            {user?.photoUrl ? <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-2xl">{user?.name?.[0]}</div>}
          </button>
        </div>
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
      )}      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                              {isEnrolled ? (
                                <button 
                                  onClick={() => setCourseReviewing(course.id)} 
                                  className="w-full text-[13px] px-6 py-3.5 bg-white text-slate-700 border border-slate-200 rounded-2xl hover:bg-slate-50 font-black transition flex items-center justify-center gap-2 shadow-sm"
                                >
                                  <Star size={16} /> Calificar
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleStripeCheckout(course)} 
                                  className="w-full text-[13px] px-6 py-3.5 bg-kirateal text-white rounded-2xl hover:bg-kirateal-light font-black transition flex items-center justify-center gap-2 shadow-xl shadow-teal-100"
                                >
                                  <ShoppingCart size={16} /> Inscribirse
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
      {courseReviewing && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setCourseReviewing(null)} />
           <div className="bg-white rounded-[40px] w-full max-w-xl p-10 relative z-10 shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100">
             <div className="flex justify-between items-start mb-8">
               <div>
                 <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Feedback de Transformación</h4>
                 <p className="text-sm text-slate-500 font-medium">Ayúdanos a elevar el estándar de Kira Coach.</p>
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

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt
      });
      const text = result.text || '';
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
          <div className="mb-10 p-8 bg-slate-50 border border-slate-100 rounded-[32px] flex items-start gap-5 relative overflow-hidden group">
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
