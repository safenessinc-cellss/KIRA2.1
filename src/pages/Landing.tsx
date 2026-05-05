import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Logo } from '../components/Brand';
import { LogIn, ArrowRight, ShieldCheck, Activity, Users, BrainCircuit, Globe, BarChart3, Star, DownloadCloud, Award, User, Instagram, Linkedin, Twitter, BadgeCheck, MessageCircleHeart, X, Send, Loader2, HeartPulse, FileText, Search, Zap, Wind, Heart, Target, Tag, Calendar, Ticket } from 'lucide-react';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import { cn } from '../lib/utils';

import { useNavigate } from 'react-router-dom';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export function Landing() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<any | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('Todos');
  const [selectedExperience, setSelectedExperience] = useState<string>('Todos');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCoach, setSelectedCoach] = useState<any | null>(null);
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>({
    heroImage: 'https://picsum.photos/seed/kiramoreno/800/1000',
    secondaryImage: 'https://api.dicebear.com/7.x/notionists/svg?seed=Kira&backgroundColor=f8fafc'
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'website'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSiteSettings((prev: any) => ({ ...prev, ...data }));
      }
    });
    return () => unsub();
  }, []);

  const handleUnlock = async (media: any) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const cost = media.pointCost || 0;
    const currentPoints = user.points || 0;

    if (currentPoints < cost) {
      alert(`No tienes suficientes Zaps. Necesitas ${cost} Zaps para desbloquear este contenido.`);
      return;
    }

    if (confirm(`¿Quieres desbloquear "${media.title}" por ${cost} Zaps?`)) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const unlockedId = `${selectedCoach.id}_${media.title}`;
        await updateDoc(userRef, {
          points: currentPoints - cost,
          unlockedMedia: [...(user.unlockedMedia || []), unlockedId]
        });
        alert("¡Contenido desbloqueado con éxito!");
      } catch (err) {
        console.error("Error unlocking media:", err);
      }
    }
  };

  useEffect(() => {
    if (selectedCoach && selectedCoach.id && !selectedCoach.id.startsWith('demo')) {
      // Increment view count
      const incrementView = async () => {
        try {
          const coachRef = doc(db, 'users', selectedCoach.id);
          await updateDoc(coachRef, {
            viewCount: (selectedCoach.viewCount || 0) + 1
          });
        } catch (err) {
          console.error("Error updating view count:", err);
        }
      };
      incrementView();
    }
  }, [selectedCoach]);

  useEffect(() => {
    // Simplified query to avoid composite index requirements (role + approved)
    const q = query(
      collection(db, 'users'), 
      where('role', '==', 'coach')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const approvedCoaches = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((c: any) => c.approvalStatus === 'approved');
      setCoaches(approvedCoaches);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users (coaches query)');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'promotions'), where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snap) => {
      const activeProms = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      // Filter out expired promos (in JS to avoid composite index requirements)
      const now = new Date();
      now.setHours(0,0,0,0);
      const validPromos = activeProms.filter(p => new Date(p.endDate) >= now).sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99));
      setPromotions(validPromos);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'promotions');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setUserFavorites([]);
      return;
    }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setUserFavorites(snap.data().favorites || []);
      }
    });
    return () => unsub();
  }, [user]);

  const toggleFavorite = async (e: React.MouseEvent, coachId: string) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const isFav = userFavorites.includes(coachId);
      await updateDoc(doc(db, 'users', user.uid), {
        favorites: isFav 
          ? userFavorites.filter(id => id !== coachId)
          : [...userFavorites, coachId]
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  if (user && role) {
    if (role === 'admin') return <Navigate to="/admin" />;
    if (role === 'coach') return <Navigate to="/coach" />;
    return <Navigate to="/dashboard" />;
  }

  const demoCoachesReal = [
    {
      id: 'demo1',
      displayName: 'Ana María Silva',
      specialty: 'Arte Terapia y Sanación',
      photoURL: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=800&auto=format&fit=crop',
      bio: 'Sanadora emocional certificada internacionalmente en Arte Terapia integrativa.',
      experienceLevel: 'Avanzado',
      languages: 'Español'
    },
    {
      id: 'demo2',
      displayName: 'Carlos Méndez',
      specialty: 'Liderazgo John Maxwell',
      photoURL: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop',
      bio: 'Mentor certificado de la John Maxwell Team para ejecutivos.',
      experienceLevel: 'Avanzado',
      languages: 'Español, Inglés'
    },
    {
      id: 'demo3',
      displayName: 'Elena Ferrán',
      specialty: 'Mindfulness para Mujeres',
      photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop',
      bio: 'Experta en mindfulness enfocada al bienestar de la mujer moderna.',
      experienceLevel: 'Intermedio',
      languages: 'Español'
    }
  ];

  const displayCoaches = coaches.length > 0 ? coaches : demoCoachesReal;
  
  const specialties = ['Todos', ...Array.from(new Set(displayCoaches.map(c => c.specialty || 'Bienestar Integral')))];
  
  const filteredCoaches = displayCoaches.filter(c => {
    const matchSpecialty = selectedSpecialty === 'Todos' || (c.specialty || 'Bienestar Integral') === selectedSpecialty;
    const matchExperience = selectedExperience === 'Todos' || (c.experienceLevel || 'Principiante') === selectedExperience;
    const matchLanguage = selectedLanguage === 'Todos' || (c.languages || '').toLowerCase().includes(selectedLanguage.toLowerCase());
    
    // Semantic search in name and bio
    const q = searchQuery.toLowerCase();
    const matchQuery = !searchQuery || 
      (c.displayName || '').toLowerCase().includes(q) || 
      (c.bio || '').toLowerCase().includes(q) ||
      (c.specialty || '').toLowerCase().includes(q);

    return matchSpecialty && matchExperience && matchLanguage && matchQuery;
  });

  return (
    <div className="flex flex-col min-h-screen text-slate-900 bg-[#FDFBF7] font-sans relative">
      {/* Subtle Paper Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply z-0" 
           style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/p6.png')` }} />
      
      <header className="px-6 lg:px-12 py-5 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200">
        <Logo withText size={42} />
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800 transition text-[13px]"
        >
          <LogIn size={16} />
          <span className="hidden sm:inline">Ingresar / Registrarse</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col">
        {/* HERO SECTION */}
        <section className="relative px-6 lg:px-12 py-20 lg:py-32 flex flex-col lg:flex-row items-center gap-12 overflow-hidden">
          <div className="flex-1 max-w-2xl space-y-8 z-10">
            <span className="text-kirateal font-bold tracking-widest uppercase text-xs flex items-center gap-2">
              <span className="w-8 h-px bg-kirateal inline-block"></span> Coach Adaptativo & Proactivo
            </span>
            <h2 className="text-5xl md:text-7xl font-bold leading-tight text-slate-900 tracking-tight">
              Libera el espacio mental que <br/> <span className="text-kirateal-light italic font-serif">no sabías</span> que tenías ocupado.
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed max-w-lg">
              Kira no es una IA que espera tus problemas; es el estratega que los desactiva antes de que ocurran. Al sincronizarse con tu biología y tus patrones de éxito, Kira despeja tu camino para que solo te preocupes por brillar.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all text-[15px] shadow-xl shadow-slate-900/20 flex items-center gap-2 hover:scale-105 active:scale-95"
              >
                Activar mi estratega personal <ArrowRight size={18} />
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all text-[15px] shadow-sm flex items-center gap-2 hover:scale-105"
              >
                Descubre qué sabe Kira de ti
              </button>
            </div>
          </div>
          <div className="flex-1 relative hidden lg:flex items-center justify-center">
            {/* Esfera de Inteligencia Adaptativa */}
            <div className="relative w-96 h-96">
              <motion.div 
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3],
                  rotate: [0, 90, 180, 270, 360]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-br from-healing-teal via-intel-indigo to-empathy-rose rounded-full blur-[100px]"
              />
              <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl rounded-full border border-white/10 shadow-2xl flex flex-col items-center justify-center text-center p-8 overflow-hidden group">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-tr from-healing-teal/5 to-transparent pointer-events-none" 
                />
                <div className="relative space-y-4">
                   <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                      <Zap size={24} className="text-kirateal shadow-lg shadow-kirateal/50" />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-kirateal-light mb-2">Kira Bio-Sync</p>
                   <h4 className="text-3xl font-serif italic text-white drop-shadow-md">Analizando Ritmo Vital</h4>
                   <div className="flex gap-1.5 justify-center mt-6">
                      {[1,2,3,4,5].map(i => (
                        <motion.div 
                          key={i}
                          animate={{ 
                            height: [8, 24, 8],
                            opacity: [0.3, 1, 0.3]
                          }}
                          transition={{ 
                            duration: 1.2, 
                            repeat: Infinity, 
                            delay: i * 0.1,
                            ease: "easeInOut"
                          }}
                          className="w-1.5 bg-kirateal rounded-full shadow-[0_0_10px_rgba(20,184,166,0.5)]"
                        />
                      ))}
                   </div>
                </div>
              </div>
              
              {/* Floating Data Bubbles */}
              <motion.div 
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute -top-10 -right-10 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-xl"
              >
                <p className="text-[10px] font-black uppercase tracking-tighter text-teal-400">Deep Sleep</p>
                <p className="text-xl font-mono text-white">82%</p>
              </motion.div>
              
              <motion.div 
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 6, repeat: Infinity }}
                className="absolute -bottom-6 -left-10 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-xl"
              >
                <p className="text-[10px] font-black uppercase tracking-tighter text-rose-400">Stress Level</p>
                <p className="text-xl font-mono text-white">Bajo</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* SECCIÓN: MÁS ALLÁ DE LA ESCUCHA (Funciones Proactivas) */}
        <section className="px-6 lg:px-12 py-24 bg-[#f8fafc] overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 text-center lg:text-left">
              <span className="text-indigo-600 font-bold tracking-widest uppercase text-xs">Inteligencia Anticipatoria</span>
              <h2 className="text-4xl md:text-6xl font-bold text-slate-900 mt-4 leading-tight">Más allá de la escucha</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div 
                whileHover={{ y: -10 }}
                className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100"
              >
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6">
                  <Activity size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Prevención de Burnout</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  No solo escuchamos lo que dices, sino cómo lo dices. Kira detecta micro-variaciones en tu voz y vocabulario que preceden al agotamiento, interviniendo con protocolos de calma antes de que llegues al límite.
                </p>
              </motion.div>

              <motion.div 
                whileHover={{ y: -10 }}
                className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100"
              >
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-6">
                  <HeartPulse size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Sincronización Vital</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Deja de gastar energía explicando cómo te sientes. Kira ya lo conoce. Al sincronizarse con tus datos de salud, eliminamos la carga de reporte: si tu cuerpo pide tregua, Kira adapta tu coaching y tus metas automáticamente.
                </p>
              </motion.div>

              <motion.div 
                whileHover={{ y: -10 }}
                className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100"
              >
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-6">
                  <Award size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Resúmenes de Valor</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  El progreso no es lineal, pero debe ser visible. Cada domingo, Kira sintetiza tu "Gran Victoria" de la semana y destila tu "Desafío Maestro". Una inyección de dopamina basada en hechos reales.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* SECCIÓN: PROMOCIONES (Solo se muestra si hay promociones) */}
        {promotions.length > 0 && (
          <section className="px-6 lg:px-12 py-24 bg-[#FAF9F5] border-t border-slate-200">
            <div className="max-w-7xl mx-auto">
              <div className="mb-14 text-center flex flex-col items-center">
                <span className="text-rose-600 font-bold tracking-widest uppercase text-xs mb-3 flex items-center gap-2">
                  <Tag size={14} /> Ofertas Especiales
                </span>
                <h3 className="text-4xl md:text-5xl font-serif text-slate-900 mb-6 tracking-tight">
                  Toma acción hoy mismo
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {promotions.map(prom => {
                  const now = new Date();
                  now.setHours(0,0,0,0);
                  const endD = new Date(prom.endDate);
                  const daysLeft = Math.floor((endD.getTime() - now.getTime()) / (1000 * 3600 * 24));
                  const isExpiring = daysLeft <= 3 && daysLeft >= 0;

                  return (
                    <div key={prom.id} className="bg-white rounded-[2rem] overflow-hidden shadow-lg border border-slate-100 flex flex-col group relative hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                      <div className="aspect-[16/9] bg-slate-100 relative overflow-hidden">
                         {isExpiring && (
                           <div className="absolute top-4 right-4 bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full z-10 animate-pulse shadow-md">
                             ¡Últimos {daysLeft} días!
                           </div>
                         )}
                         <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-indigo-600 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full z-10 shadow-sm">
                            {prom.type}
                         </div>
                         {prom.imageUrl ? (
                           <img src={prom.imageUrl} alt={prom.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                         ) : (
                           <div className="w-full h-full flex justify-center items-center text-slate-300 bg-slate-100"><Ticket size={48} className="opacity-50" /></div>
                         )}
                      </div>
                      <div className="p-6 md:p-8 flex-1 flex flex-col">
                         <h4 className="font-bold text-slate-900 text-xl leading-tight mb-3">{prom.title}</h4>
                         <p className="text-slate-500 text-sm mb-6 flex-1 line-clamp-3">{prom.description}</p>
                         
                         <div className="flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                               <Calendar size={14} /> 
                               Válido hasta {endD.toLocaleDateString()}
                            </div>
                            <button onClick={() => setSelectedPromotion(prom)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-kirateal transition-colors shadow-md">
                               Ver detalle
                            </button>
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* MARKETPLACE PREVIEW - DIRECTORIO ÉLITE */}
        <section className="px-6 lg:px-12 py-24 bg-white border-t border-slate-200">
          <div className="mb-14 max-w-3xl mx-auto text-center flex flex-col items-center">
            <span className="text-kiragold font-bold tracking-widest uppercase text-xs mb-3 flex items-center gap-2">
              <Star size={14} className="fill-kiragold" /> Directorio Élite
            </span>
            <h3 className="text-4xl md:text-5xl font-serif text-slate-900 mb-6 tracking-tight">
              Nuestros Terapeutas y Coaches
            </h3>
            <p className="text-slate-500 text-lg leading-relaxed mb-8">
              En Kira Coach no solo encuentras cursos, encuentras un camino trazado por expertos que yo misma he seleccionado para tu crecimiento. Un espacio de autoridad humana y técnica.
            </p>

            {/* BARRA DE BÚSQUEDA SEMÁNTICA */}
            <div className="w-full max-w-xl mx-auto mb-10 relative group">
               <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-kirateal transition-colors">
                  <Search size={20} />
               </div>
               <input 
                 type="text"
                 placeholder="Busca por nombre, especialidad o palabras clave (ej: ansiedad, liderazgo)..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-4 text-sm focus:bg-white focus:ring-4 focus:ring-kirateal/5 focus:border-kirateal/30 transition-all outline-none shadow-sm"
               />
               {searchQuery && (
                 <button 
                   onClick={() => setSearchQuery('')}
                   className="absolute inset-y-0 right-5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                 >
                   <X size={16} />
                 </button>
               )}
            </div>
            
            {/* Filtros Dropdowns */}
            <div className="flex flex-wrap justify-center gap-6 mb-12">
               <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Especialidad:</span>
                 <select 
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="bg-white border border-slate-200 rounded-full px-5 py-2 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-kirateal/20 transition-all appearance-none cursor-pointer hover:border-kirateal/30 shadow-sm"
                 >
                   {specialties.map(spec => (
                     <option key={spec} value={spec}>{spec}</option>
                   ))}
                 </select>
               </div>

               <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nivel:</span>
                 <select 
                  value={selectedExperience}
                  onChange={(e) => setSelectedExperience(e.target.value)}
                  className="bg-white border border-slate-200 rounded-full px-5 py-2 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-kirateal/20 transition-all appearance-none cursor-pointer hover:border-kirateal/30 shadow-sm"
                 >
                   <option value="Todos">Todos los niveles</option>
                   <option value="Principiante">Principiante</option>
                   <option value="Intermedio">Intermedio</option>
                   <option value="Avanzado">Avanzado</option>
                 </select>
               </div>

               <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Idioma:</span>
                 <select 
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-white border border-slate-200 rounded-full px-5 py-2 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-kirateal/20 transition-all appearance-none cursor-pointer hover:border-kirateal/30 shadow-sm"
                 >
                   <option value="Todos">Todos los idiomas</option>
                   <option value="Español">Español</option>
                   <option value="Inglés">Inglés</option>
                   <option value="Portugués">Portugués</option>
                   <option value="Francés">Francés</option>
                 </select>
               </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1400px] mx-auto">
            {filteredCoaches.map((coach) => (
              <div 
                key={coach.id} 
                onClick={() => setSelectedCoach(coach)}
                className="group relative aspect-[3/4] md:aspect-[4/5] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 cursor-pointer border border-slate-100"
              >
                {/* Imagen Principal */}
                <img 
                  src={coach.photoURL || `https://picsum.photos/seed/${coach.id}/800/1000`} 
                  alt={coach.displayName} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  referrerPolicy="no-referrer"
                />
                
                {/* Gradiente Oscuro Base */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                
                {/* Contenido Superior (Social Proof + Like Button) */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                  <div className="bg-slate-900/70 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wider shadow-md">
                    <Star size={10} className="text-amber-400 fill-amber-400" /> 5 (150+)
                  </div>
                  <button 
                    onClick={(e) => toggleFavorite(e, coach.id)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 border shadow-lg active:scale-90",
                      userFavorites.includes(coach.id)
                        ? "bg-rose-500 border-rose-400 text-white"
                        : "bg-white/20 border-white/30 text-white hover:bg-white hover:text-rose-500"
                    )}
                  >
                    <HeartPulse size={20} fill={userFavorites.includes(coach.id) ? "currentColor" : "none"} />
                  </button>
                </div>

                {/* Contenido Inferior (Nombre y Especialidad) */}
                <div className="absolute bottom-6 left-6 right-6 flex flex-col justify-end z-10">
                  <p className="text-kiragold font-bold text-[10px] uppercase tracking-[0.2em] mb-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    {coach.specialty || 'Bienestar Integral'}
                  </p>
                  <h4 className="text-white font-serif text-2xl font-bold flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500 delay-75">
                    {coach.displayName || 'Experto'} 
                    <BadgeCheck size={20} className="text-sky-400" />
                  </h4>
                  
                  {/* Acciones Hover (Redes y Botón) SOLO APARECEN EN HOVER */}
                  <div className="mt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-100">
                    <div className="flex gap-2">
                       <a href="#" className="w-8 h-8 rounded-full bg-white/20 hover:bg-white hover:text-slate-900 backdrop-blur-md flex items-center justify-center text-white transition-colors border border-white/30">
                         <Instagram size={14} />
                       </a>
                       <a href="#" className="w-8 h-8 rounded-full bg-white/20 hover:bg-white hover:text-slate-900 backdrop-blur-md flex items-center justify-center text-white transition-colors border border-white/30">
                         <Linkedin size={14} />
                       </a>
                    </div>
                    <button 
                      onClick={() => setSelectedCoach(coach)}
                      className="px-5 py-2.5 bg-white text-slate-900 rounded-full text-[11px] font-black uppercase tracking-wider hover:bg-kiragold hover:text-white hover:scale-110 hover:shadow-[0_10px_25px_-5px_rgba(196,160,82,0.4)] transition-all duration-300 shadow-xl"
                    >
                      Ver Perfil
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* PRÓXIMAMENTE - CARD DE RELLENO CON EFECTO GLASSMORPHISM 1 */}
            <div className="relative aspect-[3/4] md:aspect-[4/5] rounded-3xl overflow-hidden border border-white/40 bg-white/10 backdrop-blur-xl flex flex-col justify-center items-center p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] group hover:bg-white/20 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-kirateal/5 to-kiragold/5" />
              <div className="w-16 h-16 rounded-2xl bg-white/50 backdrop-blur-md shadow-sm border border-white/50 flex items-center justify-center text-kirateal mb-6 z-10 group-hover:scale-110 transition-transform duration-500">
                <User size={32} />
              </div>
              <h4 className="text-slate-700 font-serif text-xl font-bold mb-2 z-10">¿Eres Terapeuta o Coach?</h4>
              <p className="text-slate-500 text-sm leading-relaxed mb-6 z-10">
                Crecemos juntos bajo un sello de confianza. Yo me encargo de la tecnología, tú de transformar vidas.
              </p>
              <button 
                onClick={() => navigate('/login')}
                className="text-kirateal font-bold text-xs uppercase tracking-wider hover:text-kirateal-light transition flex items-center gap-1 z-10 hover:gap-2 duration-300"
              >
                Únete a la Red <ArrowRight size={14} />
              </button>
            </div>

            {/* PRÓXIMAMENTE - CARD DE RELLENO CON EFECTO GLASSMORPHISM 2 */}
             <div className="relative aspect-[3/4] md:aspect-[4/5] rounded-3xl overflow-hidden border border-white/40 bg-white/10 backdrop-blur-xl flex flex-col justify-center items-center p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] group hover:bg-white/20 transition-all duration-500 hidden md:flex">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-rose-500/5" />
              <div className="w-16 h-16 rounded-2xl bg-white/50 backdrop-blur-md shadow-sm border border-white/50 flex items-center justify-center text-slate-400 mb-6 z-10 group-hover:scale-110 transition-transform duration-500">
                <ShieldCheck size={32} />
              </div>
              <h4 className="text-slate-700 font-serif text-xl font-bold mb-2 z-10">Directorio Exclusivo</h4>
              <p className="text-slate-500 text-sm leading-relaxed mb-6 z-10">
                Estamos curando a los mejores profesionales para tu crecimiento.
              </p>
              <button 
                onClick={() => navigate('/login')}
                className="text-indigo-600 font-bold text-xs uppercase tracking-wider hover:text-indigo-700 transition flex items-center gap-1 z-10 hover:gap-2 duration-300"
              >
                Postular perfil <ArrowRight size={14} />
              </button>
            </div>
            
            {/* PRÓXIMAMENTE - CARD DE RELLENO CON EFECTO GLASSMORPHISM 3 */}
            <div className="relative aspect-[3/4] md:aspect-[4/5] rounded-3xl overflow-hidden border border-white/40 bg-white/10 backdrop-blur-xl flex flex-col justify-center items-center p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] group hover:bg-white/20 transition-all duration-500 hidden lg:flex">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-amber-500/5" />
              <div className="w-16 h-16 rounded-2xl bg-white/50 backdrop-blur-md shadow-sm border border-white/50 flex items-center justify-center text-slate-400 mb-6 z-10 group-hover:scale-110 transition-transform duration-500">
                <Star size={32} />
              </div>
              <h4 className="text-slate-700 font-serif text-xl font-bold mb-2 z-10">Nuevos Talentos</h4>
              <p className="text-slate-500 text-sm leading-relaxed mb-6 z-10">
                Estamos curando a los mejores profesionales para tu crecimiento.
              </p>
              <button 
                onClick={() => navigate('/login')}
                className="text-rose-600 font-bold text-xs uppercase tracking-wider hover:text-rose-700 transition flex items-center gap-1 z-10 hover:gap-2 duration-300"
              >
                Sumar valor <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* SECCIÓN TÉCNICA: CONFIANZA Y SEGURIDAD */}
        <section className="px-6 lg:px-12 py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold uppercase tracking-wider">
                <ShieldCheck size={12} /> Cuidado, no Vigilancia
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">Protocolo de Calma Proactiva</h2>
              <p className="text-slate-600 leading-relaxed text-lg">
                En momentos de crisis, la tecnología debe ser humana. Si detectamos señales de estrés extremo, Kira silencia las métricas, activa el Modo de Emergencia y te conecta con recursos profesionales. Tu bienestar es nuestra única métrica de éxito.
              </p>
              <div className="flex items-center gap-6 pt-4">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-slate-900">End-to-End</span>
                  <span className="text-xs text-slate-400 font-bold uppercase">Cifrado de grado militar</span>
                </div>
                <div className="h-10 w-px bg-slate-200"></div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-slate-900">Zero-Leak</span>
                  <span className="text-xs text-slate-400 font-bold uppercase">Privacidad por diseño</span>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full max-w-md">
              <div className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden text-white aspect-square flex flex-col justify-center">
                 <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Zap size={120} />
                 </div>
                 <h4 className="text-2xl font-serif italic mb-6">"Tus pensamientos son solo tuyos. Nuestra arquitectura no vende data; compra tu tranquilidad."</h4>
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
                      <ShieldCheck size={20} />
                   </div>
                   <div>
                      <p className="text-xs font-bold">Arquitectura Blindada</p>
                      <p className="text-[10px] text-slate-400">Verificado por Kira Systems</p>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* GAMIFICACIÓN DE LA EVOLUCIÓN: MEDALLAS DE CONSCIENCIA */}
        <section className="px-6 lg:px-12 py-24 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-kiragold font-black uppercase tracking-widest text-[10px]">Evolución Premiada</span>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-4">Medallas de Consciencia</h2>
              <p className="text-slate-500 mt-4 max-w-2xl mx-auto leading-relaxed">
                No premiamos el uso de la app. Premiamos tu coherencia, tu descanso y tu capacidad de cumplir compromisos contigo mismo.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { name: 'Guerrero del Sueño', desc: 'Priorizar el descanso sobre la agenda', icon: <Wind size={24} />, color: 'bg-indigo-50 text-indigo-500' },
                { name: 'Coherencia Radical', desc: 'Cumplir compromisos difíciles', icon: <Zap size={24} />, color: 'bg-emerald-50 text-emerald-500' },
                { name: 'Silencio Fecundo', desc: 'Completar días de recuperación profunda', icon: <Heart size={24} />, color: 'bg-rose-50 text-rose-500' },
                { name: 'Maestro del Enfoque', desc: 'Mantener +60% de charla en soluciones', icon: <Target size={24} />, color: 'bg-amber-50 text-amber-500' },
              ].map((medal, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center text-center p-8 rounded-[2.5rem] border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-xl hover:shadow-slate-200 transition-all cursor-default"
                >
                  <div className={`w-16 h-16 rounded-3xl ${medal.color} flex items-center justify-center mb-6 shadow-inner`}>
                    {medal.icon}
                  </div>
                  <h4 className="font-bold text-slate-900 mb-2">{medal.name}</h4>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{medal.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="px-6 lg:px-12 py-24 bg-kirateal text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-[120px] -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-[120px] -ml-48 -mb-48"></div>
          </div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight italic font-serif">
              "Kira entiende tu ritmo antes de que hables."
            </h2>
            <p className="text-xl text-teal-50 mb-12 max-w-2xl mx-auto">
              Únete a la evolución del bienestar. Tecnología humana, proactiva y blindada para proteger tu paz.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 bg-white text-kirateal rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-all hover:scale-110 shadow-2xl"
              >
                Activar mi estratega personal
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-white/30 text-white rounded-2xl font-bold text-sm hover:bg-white/10 transition-all"
              >
                Delegar mi estrés a Kira
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 bg-transparent text-white/80 rounded-2xl font-bold text-sm hover:text-white transition-all underline underline-offset-8 decoration-white/30"
              >
                Iniciar mi evolución consciente
              </button>
            </div>
          </div>
        </section>

        {/* ECOSYSTEM FEATURES */}
        <section className="px-6 lg:px-12 py-20 bg-slate-900 text-white">
          <div className="max-w-3xl mb-16">
            <span className="text-kiragold font-bold tracking-widest uppercase text-xs">Nuestro Ecosistema</span>
            <h2 className="text-4xl lg:text-5xl font-bold mt-4 mb-6 leading-tight">Tecnología al servicio de tu consciencia.</h2>
            <p className="text-slate-400 text-lg">No es solo una plataforma de cursos, es el espacio de autoridad donde nos conectamos para expandir nuestro bienestar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
            <div>
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                <BrainCircuit className="text-kiragold" size={24}/>
              </div>
              <h4 className="text-xl font-semibold mb-3">IA Mentora (Kira)</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Asistencia 24/7. Un modelo entrenado en la metodología de liderazgo consciente para resolver dudas y apoyar tu crecimiento personal de forma empática.</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                <ShieldCheck className="text-kirateal-light" size={24}/>
              </div>
              <h4 className="text-xl font-semibold mb-3">Infraestructura</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Tu arte y tu mensaje son tu prioridad. De la plataforma, el marketing y la comunidad nos encargamos nosotros, brindándote un espacio estable y profesional.</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                <Award className="text-kiragold" size={24}/>
              </div>
              <h4 className="text-xl font-semibold mb-3">Curaduría Exclusiva</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Un sello de confianza. Selecciono personalmente a los terapeutas para asegurar que compartimos la misma ética y visión de re-evolución.</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                <Globe className="text-kirateal-light" size={24}/>
              </div>
              <h4 className="text-xl font-semibold mb-3">Comunidad Conectada</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Más que alumnos, formamos una red de crecimiento. Espacios para interactuar y nutrir la transformación en un entorno respaldado.</p>
            </div>
             <div>
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                <BarChart3 className="text-sky-400" size={24}/>
              </div>
              <h4 className="text-xl font-semibold mb-3">CRM & Analíticas</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Herramientas poderosas para Coaches y Admins. Automatización de marketing (carritos abandonados) y métricas de retención integradas.</p>
            </div>
             <div>
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                <DownloadCloud className="text-rose-400" size={24}/>
              </div>
              <h4 className="text-xl font-semibold mb-3">Modo Offline PWA</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Descarga sesiones de audio o lectura para continuar tu desarrollo dondequiera que estés, sin necesidad de conexión constante a la red.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-50 py-10 px-6 lg:px-12 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} Kira Coach. Plataforma Integral de Bienestar.</p>
      </footer>

      {/* PROMOTION DETAILS MODAL */}
      {selectedPromotion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 fade-in">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedPromotion(null)} />
           <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden relative z-10 shadow-2xl flex flex-col">
              <button 
                onClick={() => setSelectedPromotion(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/10 hover:bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center transition-colors z-20 text-slate-900"
              >
                 <X size={20} />
              </button>
              
              {selectedPromotion.imageUrl ? (
                 <div className="w-full h-64 shrink-0 relative">
                    <img src={selectedPromotion.imageUrl} alt={selectedPromotion.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
                 </div>
              ) : (
                 <div className="w-full h-48 shrink-0 bg-slate-100 flex items-center justify-center text-slate-300">
                    <Ticket size={64} className="opacity-20" />
                 </div>
              )}

              <div className="p-8 md:p-10 overflow-y-auto">
                 <div className="inline-block px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider mb-4 border border-indigo-100">
                    {selectedPromotion.type}
                 </div>
                 <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                    {selectedPromotion.title}
                 </h2>
                 <div className="prose prose-slate max-w-none mb-8 text-slate-600 leading-relaxed font-serif whitespace-pre-wrap">
                    {selectedPromotion.description}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400">
                          <Calendar size={18} />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vigencia</p>
                          <p className="text-sm font-semibold text-slate-800">
                            Del {new Date(selectedPromotion.startDate).toLocaleDateString()} al {new Date(selectedPromotion.endDate).toLocaleDateString()}
                          </p>
                       </div>
                    </div>

                    {selectedPromotion.code && (
                      <div className="bg-kiragold/10 rounded-2xl p-4 border border-kiragold/20 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer" onClick={() => {navigator.clipboard.writeText(selectedPromotion.code); alert('¡Código copiado!');}}>
                         <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-kiragold transition-opacity">
                            <span className="text-[10px] font-bold uppercase">Copiar</span>
                         </div>
                         <p className="text-[10px] font-bold text-kiragold uppercase tracking-wider mb-1">Código de Descuento</p>
                         <p className="text-xl font-mono font-black text-slate-900 tracking-widest">{selectedPromotion.code}</p>
                      </div>
                    )}
                 </div>

                 <div className="flex justify-center pt-6 border-t border-slate-100">
                    <button onClick={() => {
                        window.open(`https://wa.me/1234567890?text=Hola, quiero aprovechar la promoción: ${selectedPromotion.title} ${selectedPromotion.code ? `con el código ${selectedPromotion.code}` : ''}`, '_blank');
                    }} className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-xl hover:shadow-2xl hover:-translate-y-1 transform w-full tracking-wider text-sm flex justify-center items-center gap-2 text-center">
                       Aprovechar Oferta <ArrowRight size={18} />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* COACH PROFILE MODAL */}
      {selectedCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 fade-in">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedCoach(null)} />
           <div className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-10 shadow-2xl flex flex-col md:flex-row">
              <button 
                onClick={() => setSelectedCoach(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center transition-colors z-20 text-white"
              >
                 <X size={20} />
              </button>
              
              <div className="w-full md:w-2/5 md:max-w-sm shrink-0 bg-slate-950 relative min-h-[300px]">
                 <img 
                    src={selectedCoach.photoURL || `https://picsum.photos/seed/${selectedCoach.id}/800/1000`} 
                    alt={selectedCoach.displayName} 
                    className="absolute inset-0 w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/20 to-transparent" />
                 <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex flex-wrap gap-1 mb-2">
                       {(selectedCoach.specialties || [selectedCoach.specialty]).map((s: string) => (
                          <span key={s} className="text-kiragold font-bold text-[9px] uppercase tracking-[0.1em] bg-kiragold/10 px-1.5 py-0.5 rounded leading-none border border-kiragold/20">
                             {s}
                          </span>
                       ))}
                    </div>
                    <h2 className="text-white font-serif text-3xl font-bold flex items-center gap-2">
                       {selectedCoach.displayName} <BadgeCheck size={24} className="text-sky-400" />
                    </h2>
                    <div className="flex flex-wrap gap-2 mt-4">
                       <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[9px] font-bold text-white uppercase tracking-wider">
                          {selectedCoach.experienceLevel || 'Principiante'}
                       </div>
                       <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[9px] font-bold text-white uppercase tracking-wider">
                          {selectedCoach.languages || 'Español'}
                       </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-4">
                       <div className="flex items-center gap-1.5">
                          <Star size={14} className="text-kiragold fill-kiragold" />
                          <span className="text-white text-xs font-black">{selectedCoach.rating?.toFixed(1) || '5.0'}</span>
                       </div>
                       <div className="flex items-center gap-1.5">
                          <Users size={14} className="text-sky-400" />
                          <span className="text-white text-xs font-black">{selectedCoach.studentCount || 0}</span>
                          <span className="text-white/40 text-[9px] uppercase font-bold tracking-widest pl-0.5">Estudiantes</span>
                       </div>
                    </div>

                    <div className="flex items-center gap-3 mt-6">
                       {selectedCoach.socialLinks?.instagram && (
                          <a href={selectedCoach.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-pink-500 transition-colors">
                             <Instagram size={14} />
                          </a>
                       )}
                       {selectedCoach.socialLinks?.linkedin && (
                          <a href={selectedCoach.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-blue-600 transition-colors">
                             <Linkedin size={14} />
                          </a>
                       )}
                       {selectedCoach.socialLinks?.twitter && (
                          <a href={selectedCoach.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-slate-900 transition-colors">
                             <Twitter size={14} />
                          </a>
                       )}
                    </div>
                 </div>
              </div>

              <div className="flex-1 p-8 sm:p-10 flex flex-col bg-slate-900 rounded-r-3xl">
                 {selectedCoach.welcomeVideoUrl && (
                    <div className="mb-8 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-slate-800 aspect-video bg-black">
                       <VideoPlayer url={selectedCoach.welcomeVideoUrl} poster={selectedCoach.photoURL} />
                    </div>
                 )}

                 <div className="mb-8">
                    <div className="flex justify-between items-start mb-3">
                       <h3 className="text-lg font-bold text-white">Sobre mí</h3>
                       {user && (
                         <div className="flex bg-slate-800 rounded-full px-2 py-1 gap-1 border border-slate-700">
                            {[1, 2, 3, 4, 5].map((star) => (
                               <button 
                                  key={star}
                                  title={`Calificar con ${star} estrellas`}
                                  onClick={async () => {
                                    try {
                                       await addDoc(collection(db, 'reviews'), {
                                          coachId: selectedCoach.id,
                                          userId: user.uid,
                                          rating: star,
                                          status: 'published',
                                          createdAt: new Date()
                                       });
                                       alert("¡Gracias por tu calificación!");
                                    } catch (e: any) {
                                       alert("Error al calificar: " + e.message);
                                    }
                                  }}
                                  className="text-slate-500 hover:text-kiragold hover:scale-110 transition-all focus:outline-none"
                               >
                                  <Star size={16} className="fill-current" />
                               </button>
                            ))}
                         </div>
                       )}
                    </div>
                    <div 
                       className="text-sm text-slate-300 leading-relaxed max-w-prose rich-text-content"
                       dangerouslySetInnerHTML={{ __html: selectedCoach.bio || '<p>Coach especialista en desarrollo integral acreditado por la plataforma Elíte.</p>' }}
                    />
                 </div>

                 {(() => {
                    const allMedia = selectedCoach.mediaItems || [];
                    const imageMedia = allMedia.filter((m: any) => m.type === 'imagen');
                    const otherMedia = allMedia.filter((m: any) => m.type !== 'imagen');

                    return (
                      <div className="flex-1 flex flex-col gap-8">
                        {otherMedia.length > 0 && (
                          <div>
                             <h3 className="text-sm font-bold text-white mb-4 px-1 uppercase tracking-widest text-slate-400">Contenido Destacado</h3>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {otherMedia.map((media: any, idx: number) => {
                                   let icon = <Award size={16} />;
                                   let color = 'text-kiragold';
                                   let bg = 'bg-slate-800';
                                   if (media.type === 'video') { icon = <Users size={16} />; color = 'text-rose-400'; bg = 'bg-slate-800'; }
                                   if (media.type === 'pdf') { icon = <FileText size={16} />; color = 'text-sky-400'; bg = 'bg-slate-800'; }

                                   const unlockedId = `${selectedCoach.id}_${media.title}`;
                                   const isUnlocked = !media.pointCost || (user?.unlockedMedia || []).includes(unlockedId);

                                   if (!isUnlocked) {
                                      return (
                                        <div 
                                          key={idx}
                                          className="flex items-start gap-4 p-4 rounded-xl border border-dashed border-slate-700 bg-slate-800/50 group relative"
                                        >
                                          <div className="w-10 h-10 rounded-lg bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                                             <ShieldCheck size={16} />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-bold text-slate-300 truncate">{media.title}</p>
                                            <button 
                                              onClick={(e) => { e.preventDefault(); handleUnlock(media); }}
                                              className="mt-1 flex items-center gap-1.5 text-[11px] font-black text-kiragold hover:text-kiragold-light transition-colors uppercase tracking-widest"
                                            >
                                              <Zap size={12} fill="currentColor" /> Desbloquear por {media.pointCost} Zaps
                                            </button>
                                          </div>
                                        </div>
                                      )
                                   }
                                   
                                   return (
                                      <a 
                                        key={idx}
                                        href={media.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-start gap-4 p-4 rounded-xl border border-slate-700 hover:border-kirateal hover:bg-slate-800 hover:shadow-kirateal/10 transition-all group"
                                      >
                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", bg, color)}>
                                           {icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[13px] font-bold text-slate-200 truncate">{media.title}</p>
                                          <p className="text-[11px] text-slate-400 capitalize mt-0.5">Ver {media.type}</p>
                                        </div>
                                      </a>
                                   )
                                })}
                             </div>
                          </div>
                        )}

                        {imageMedia.length > 0 && (
                          <div>
                             <h3 className="text-sm font-bold text-white mb-4 px-1 uppercase tracking-widest flex items-center gap-2 text-slate-400">
                               <Instagram size={16} className="text-pink-500" /> Mural
                             </h3>
                             <div className="grid grid-cols-3 gap-1 grid-flow-row rounded-xl overflow-hidden border border-slate-700/50">
                                {imageMedia.map((media: any, idx: number) => {
                                   const unlockedId = `${selectedCoach.id}_${media.title}`;
                                   const isUnlocked = !media.pointCost || (user?.unlockedMedia || []).includes(unlockedId);

                                   return (
                                     <div key={idx} className="relative aspect-square bg-slate-800 overflow-hidden group cursor-pointer">
                                       <img src={media.url} className={cn("object-cover w-full h-full transition-transform duration-500 group-hover:scale-105", !isUnlocked && "blur-[2px]")} alt={media.title} />
                                       
                                       <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 p-2 text-center">
                                         {!isUnlocked ? (
                                           <div className="flex flex-col items-center">
                                             <ShieldCheck size={20} className="text-white mb-1" />
                                             <button 
                                               onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleUnlock(media); }}
                                               className="bg-white/20 backdrop-blur-md border border-white/40 text-white rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
                                             >
                                               {media.pointCost} zaps
                                             </button>
                                           </div>
                                         ) : (
                                           <a 
                                             href={media.url}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             onClick={(e) => e.stopPropagation()}
                                             className="text-white font-bold text-[10px] uppercase tracking-wide truncate w-full"
                                           >
                                             {media.title}
                                           </a>
                                         )}
                                       </div>
                                     </div>
                                   );
                                })}
                             </div>
                          </div>
                        )}
                      </div>
                    )
                 })()}

                 <div className="pt-6 border-t border-slate-800 mt-auto">
                    <button 
                      onClick={() => navigate('/login')}
                      className="w-full py-4 bg-kirateal text-white rounded-2xl font-black text-[13px] uppercase tracking-widest hover:bg-kirateal-light transition-colors shadow-xl shadow-kirateal/20 flex items-center justify-center gap-3"
                    >
                      Inscribirse con {selectedCoach.displayName} <ArrowRight size={18} />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* FLOATING EMOTIONAL AI ASSISTANT */}
      <EmotionalAssistant contextualCoach={selectedCoach?.displayName} secondaryImage={siteSettings.secondaryImage} />
    </div>
  );
}

// --- VIDEO PLAYER COMPONENT ---
function VideoPlayer({ url, poster }: { url: string; poster?: string }) {
  const getEmbedUrl = (url: string) => {
    // YouTube
    const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    
    // Vimeo
    const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com)\/(.+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    
    return null;
  };

  const embedUrl = getEmbedUrl(url);

  if (embedUrl) {
    return (
      <iframe 
        src={embedUrl} 
        className="w-full h-full border-0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowFullScreen
      />
    );
  }

  return (
    <video 
      src={url} 
      controls 
      className="w-full h-full object-contain"
      poster={poster}
    />
  );
}

// --- EMOTIONAL ASSISTANT COMPONENT ---
function EmotionalAssistant({ contextualCoach, secondaryImage }: { contextualCoach?: string, secondaryImage?: string }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [escalationSent, setEscalationSent] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai' | 'system', text: string}[]>(() => {
    try {
      const saved = localStorage.getItem('kira-emotional-assistant-memory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('kira-emotional-assistant-memory', JSON.stringify(messages));
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleEscalation = async () => {
    if (!user) {
       // Logged out flow -> Native Email Client
       window.location.href = "mailto:soporte@kiracoach.com?subject=Solicitud%20Urgente%20de%20Apoyo%20Humano&body=Hola,%20necesito%20apoyo%20de%20un%20mentor.%20Mi%20situaci%C3%B3n%20es...";
       return;
    }
    
    try {
      await addDoc(collection(db, 'urgent_escalations'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        status: 'pending',
        createdAt: new Date()
      });
      setEscalationSent(true);
    } catch (error) {
      console.error(error);
      window.location.href = "mailto:soporte@kiracoach.com?subject=Solicitud%20Urgente%20de%20Apoyo%20Humano&body=Hola...";
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // Build conversation history for the model
      const pastContext = messages.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.text}`).join('\n');
      
      const userName = user?.displayName || 'Usuario';
      
      const prompt = `
Historial:
${pastContext}

Usuario actual: ${userName}
${contextualCoach ? `El usuario está viendo actualmente el perfil de: ${contextualCoach}` : ''}
Mensaje actual del usuario: ${userMessage}

Instrucciones: Eres Kira, una asistente emocional empática y coach de bienestar consciente. Actúa como un experto en ingeniería de prompts y desarrollo de producto. Tu objetivo es optimizar esta interacción para que sea robusta, precisa y profesional.
Implementa las siguientes capas de lógica:
1. Validación de Entrada: Si el usuario proporciona datos incompletos o ambiguos, solicita amablemente la información faltante en lugar de inventarla.
2. Estructura de Salida: Responde siempre utilizando Markdown para mejorar la legibilidad. Si los datos son comparativos, usa tablas. Si son procesos, usa listas numeradas.
3. Control de Calidad: Antes de entregar la respuesta, verifica que no contenga información contradictoria. Mantén un tono Profesional y Cercano. Evita introducciones innecesarias como "Claro, yo puedo ayudarte con eso".
4. Manejo de Errores: Si el usuario solicita algo que viola las políticas de seguridad o está fuera del alcance de la plataforma de bienestar, declina la petición de forma breve y sugiere una alternativa permitida.
5. REGLA DE ESCALAMIENTO MENTAL: Si detectas que el usuario está muy frustrado, triste, mencionó darse por vencido, o si notas necesidad de un diagnóstico profesional, debes incluir EXACTAMENTE la frase "[ESCALAR_HUMANO]" al final de tu respuesta secreta.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          temperature: 0.7,
        }
      });
      
      const aiTextRaw = response.text || 'Lo siento, en este momento no puedo procesar tu mensaje. Respira e inténtalo de nuevo.';
      
      // Parse for human escalation
      const needsHuman = aiTextRaw.includes('[ESCALAR_HUMANO]');
      const cleanAiText = aiTextRaw.replace('[ESCALAR_HUMANO]', '').trim();
      
      setMessages(prev => {
        const newMsgs: {role: 'user'|'ai'|'system', text: string}[] = [...prev, { role: 'ai', text: cleanAiText }];
        if (needsHuman) {
           newMsgs.push({ role: 'system', text: 'escalate' });
        }
        return newMsgs;
      });
      
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', text: 'Tengo un problema de conexión. Pero recuerda, siempre es buen momento para tomar una respiración profunda.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 w-14 h-14 bg-kirateal outline-none hover:bg-kirateal-light text-white rounded-full shadow-xl hover:shadow-2xl hover:shadow-kirateal-dark/20 transition-all duration-300 flex items-center justify-center group z-50",
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
      >
        <MessageCircleHeart size={28} className="group-hover:scale-110 transition-transform duration-300" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-kiragold border-2 border-white rounded-full animate-pulse"></span>
      </button>

      {/* Chat Window */}
      <div 
        className={cn(
          "fixed bottom-6 right-6 w-[350px] sm:w-[380px] h-[550px] max-h-[80vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-500 ease-out z-50 origin-bottom-right border border-slate-200",
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-kirateal to-kirateal-light p-4 px-6 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center p-0.5">
               <div className="w-full h-full bg-white rounded-full overflow-hidden">
                 <img src={secondaryImage || "https://api.dicebear.com/7.x/notionists/svg?seed=Kira&backgroundColor=f8fafc"} alt="Avatar" className="w-full h-full object-cover" />
               </div>
             </div>
             <div>
               <h4 className="font-bold text-sm tracking-tight leading-none">Kira Assistant</h4>
               <span className="text-[10px] text-teal-100 font-medium tracking-widest uppercase flex items-center gap-1 mt-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Soporte Emocional
               </span>
             </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-teal-100 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-1.5 rounded-full">
            <X size={18} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 relative">
          {messages.length > 0 && (
            <div className="flex justify-center mb-4">
              <button 
                onClick={() => {
                  setMessages([]);
                  localStorage.removeItem('kira-emotional-assistant-memory');
                }}
                className="text-[10px] text-slate-400 hover:text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm transition"
              >
                Limpiar Memoria
              </button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-in fade-in zoom-in duration-500">
               <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 mb-4 shadow-sm border border-teal-100">
                 <MessageCircleHeart size={32} />
               </div>
               <h5 className="font-bold text-slate-800 mb-2">¿Cómo te sientes hoy?</h5>
               <p className="text-xs text-slate-500 leading-relaxed">
                 Estoy aquí para escucharte, brindarte apoyo o guiarte hacia el contenido ideal para tu momento actual.
               </p>
            </div>
          ) : (
            messages.map((m, idx) => {
              if (m.role === 'system' && m.text === 'escalate') {
                 return (
                   <div key={idx} className="flex flex-col items-center my-4 animate-in fade-in">
                     <p className="text-xs text-rose-500 font-medium mb-2 text-center max-w-[200px]">Noto que estás pasando por un momento difícil.</p>
                     {escalationSent ? (
                       <div className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm">
                         <ShieldCheck size={14} /> Equipo notificado. Te contactaremos pronto.
                       </div>
                     ) : (
                       <button 
                         onClick={handleEscalation}
                         className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 shadow-sm"
                       >
                         <HeartPulse size={14} /> Solicitar mentor humano
                       </button>
                     )}
                   </div>
                 );
              }
              return (
                <div key={idx} className={cn("flex flex-col max-w-[85%] animate-in slide-in-from-bottom-2", m.role === 'user' ? "items-end self-end ml-auto" : "items-start")}>
                   <div className={cn(
                     "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm",
                     m.role === 'user' ? "bg-kirateal text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"
                   )}>
                     {m.text}
                   </div>
                </div>
              )
            })
          )}
          {isLoading && (
             <div className="flex items-start max-w-[85%] animate-in fade-in">
                <div className="px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
                   <Loader2 size={14} className="animate-spin text-kirateal" />
                   <span className="text-[11px] font-medium text-slate-400">Kira está escribiendo...</span>
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <div className="relative flex items-center">
             <textarea 
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder="Escribe tu mensaje aquí..."
               rows={1}
               className="w-full bg-slate-50 border border-slate-200 rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-kirateal focus:border-transparent resize-none overflow-hidden hover:bg-white"
             />
             <button 
               onClick={handleSend}
               disabled={!input.trim() || isLoading}
               className="absolute right-2 w-8 h-8 flex items-center justify-center bg-kirateal text-white rounded-full hover:bg-kirateal-light transition disabled:opacity-50 disabled:hover:bg-kirateal"
             >
               <Send size={14} className="ml-0.5" />
             </button>
          </div>
          <p className="text-center mt-3 text-[9px] text-slate-400 uppercase tracking-widest font-medium">IA Generativa • Respuestas orientativas</p>
        </div>
      </div>
    </>
  );
}
