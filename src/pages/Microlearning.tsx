import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { 
  Sparkles, BookOpen, MessageCircle, Download, CheckCircle2, 
  ArrowRight, Compass, FileText, Lightbulb, Share2, Users, Check, 
  ChevronRight, RefreshCw, Star, HeartPulse, Palette, ExternalLink, ArrowLeft, Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Arteterapia } from '../components/Arteterapia';

interface Chapter {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  summary: string[];
  coachingQuestions: { id: string; text: string; placeholder: string }[];
  dynamics: { id: string; title: string; instruction: string; mandalaType: string }[];
}

const DEFAULT_CHAPTERS: Chapter[] = [
  {
    id: 'cap-1',
    title: 'Capítulo 1: El Despertar del Observador Consciente',
    subtitle: 'Aprende a desvincularte del ruido mental y conectar con tu presente',
    duration: '5 min',
    summary: [
      'Nuestra mente funciona en piloto automático el 95% del día, reaccionando a estímulos sin conciencia real.',
      'El "Observador" es esa parte de ti que mira tus pensamientos sin juzgarlos ni identificarse con ellos.',
      'Al tomar distancia de la tormentas emocionales, recuperas tu poder de elección y tu paz de inmediato.'
    ],
    coachingQuestions: [
      { id: 'q1_1', text: '¿Qué pensamiento recurrente has observado hoy que drena tu energía emocional?', placeholder: 'Ej: Sentirme insuficiente con mis entregas...' },
      { id: 'q1_2', text: 'Si miraras ese pensamiento como una nube pasajera en el cielo, ¿qué le dirías con compasión?', placeholder: 'Ej: Entiendo que tienes miedo, pero yo tengo el control ahora...' }
    ],
    dynamics: [
      { 
        id: 'dyn_1_1', 
        title: 'Mándala de la Calma Centrada', 
        instruction: 'Descarga o dibuja este mándala circular interactivo para centrar tu mente. Enfócate exclusivamente en trazos curvos y respira hondo 4-7-8 al final de cada color.', 
        mandalaType: 'calm' 
      }
    ]
  },
  {
    id: 'cap-2',
    title: 'Capítulo 2: Alquimia Emocional: De la Reactividad a la Acción',
    subtitle: 'Transforma tus crisis de estrés en combustible creativo',
    duration: '7 min',
    summary: [
      'Las emociones no son buenas ni malas; son simplemente indicadores biológicos de energía en movimiento.',
      'La reactividad canjea tu paz a corto plazo por arrepentimiento a largo plazo; la responsabilidad te da soberanía.',
      'Canalizar el enojo o la duda hacia una actividad artística despierta zonas cerebrales de alta resolución de problemas.'
    ],
    coachingQuestions: [
      { id: 'q2_1', text: '¿Qué situación actual te genera mayor frustración y cómo has estado reaccionando mecánicamente?', placeholder: 'Ej: Cuando mi jefe cambia los requerimientos a última hora...' },
      { id: 'q2_2', text: 'Al transformarlo en arte o acción positiva, ¿cuál es el primer paso creativo que darás hoy?', placeholder: 'Ej: Escribir un poema libre o crear un boceto de mi estado ideal...' }
    ],
    dynamics: [
      { 
        id: 'dyn_2_1', 
        title: 'Mándala del Fuego y Liberación', 
        instruction: 'Este patrón geométrico de estrellas ayuda a liberar el estrés reprimido. Utiliza tonos cálidos de rojo, naranja y dorado para transmutar la atención hostil.', 
        mandalaType: 'fire' 
      }
    ]
  },
  {
    id: 'cap-3',
    title: 'Capítulo 3: Ontología del Éxito Sostenible',
    subtitle: 'Configura tus hábitos con un propósito alineado a tus valores reales',
    duration: '6 min',
    summary: [
      'El éxito social a menudo ignora la ecología interna. El verdadero alto rendimiento surge de la coherencia interna.',
      'Los objetivos eficientes necesitan apoyarse en tu SER antes de enfocarse en el HACER o TENER.',
      'Tu red de apoyo y tu nivel de autodisciplina compasiva determinan la longevidad de tu evolución profesional.'
    ],
    coachingQuestions: [
      { id: 'q3_1', text: 'Define 3 valores innegociables que guían tu vida laboral y personal actualmente.', placeholder: 'Ej: Autenticidad, Salud integral, Libertad creativa...' },
      { id: 'q3_2', text: '¿Qué hábito diario podrías implementar hoy para honrar el más importante de estos valores?', placeholder: 'Ej: 10 minutos de lectura sin dispositivos antes de dormir...' }
    ],
    dynamics: [
      { 
        id: 'dyn_3_1', 
        title: 'Mándala de la Red Sagrada', 
        instruction: 'Un diseño floral intrincado que simboliza la interconectividad y tu comunidad estelar. Colorea de afuera hacia adentro para reconectar.', 
        mandalaType: 'flower' 
      }
    ]
  }
];

export function Microlearning() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Configuration (dynamic from firestore or falls back to sensible defaults)
  const [config, setConfig] = useState({
    welcomeTitle: '✨ Aniversario Estelar: Del Libro a la Acción Consciente',
    welcomeMessage: '¡Celebramos un año de transformar vidas! Este espacio gamificado de Microlearning está diseñado para convertir la lectura pasiva en un viaje interactivo de autodescubrimiento. Explora los capítulos de mi nuevo Ebook, responde a las preguntas clave de coaching ontológico y realiza las dinámicas creativas avanzadas. Tus descubrimientos se guardan localmente para que midas tu evolución.',
    communityUrl: 'https://chat.whatsapp.com/GZpEnbI7V64DuKiraCommunity',
    chapters: DEFAULT_CHAPTERS
  });

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [completedChapters, setCompletedChapters] = useState<string[]>([]);
  const [points, setPoints] = useState(0);
  const [selectedMandala, setSelectedMandala] = useState<string | null>(null);
  const [coloredMandalas, setColoredMandalas] = useState<Record<string, string[]>>({}); // mandalaType -> colors filled
  const [colorPalette, setColorPalette] = useState(['#14b8a6', '#06b6d4', '#3b82f6', '#ec4899', '#f59e0b', '#84cc16', '#a855f7', '#64748b']);
  const [selectedColor, setSelectedColor] = useState('#14b8a6');
  const [activeTab, setActiveTab] = useState<'reading' | 'action' | 'art'>('reading');

  // Load custom configuration from Firebase doc if it exists (allows instant admin updates)
  useEffect(() => {
    setLoadingConfig(true);
    const docRef = doc(db, 'settings', 'microlearning');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        let cleanedMessage = data.welcomeMessage || '';
        // If the message has placeholder or developer text, replace it with a professional description
        if (
          !cleanedMessage || 
          cleanedMessage.toLowerCase().includes('en desarrollo') || 
          cleanedMessage.toLowerCase().includes('módulo en desarrollo') ||
          cleanedMessage === 'Contenido educativo en formato micro para aprendizaje rápido y efectivo.'
        ) {
          cleanedMessage = '¡Celebramos un año de transformar vidas! Este espacio gamificado de Microlearning está diseñado para convertir la lectura pasiva en un viaje interactivo de autodescubrimiento. Explora los capítulos de mi nuevo Ebook, responde a las preguntas clave de coaching ontológico y realiza las dinámicas creativas avanzadas. Tus descubrimientos se guardan localmente para que midas tu evolución.';
        }

        let cleanedTitle = data.welcomeTitle || '';
        if (!cleanedTitle || cleanedTitle.trim() === 'Microlearning' || cleanedTitle.trim() === '') {
          cleanedTitle = '✨ Aniversario Estelar: Del Libro a la Acción Consciente';
        }

        const cleanedChapters = data.chapters && data.chapters.length > 0 ? data.chapters : DEFAULT_CHAPTERS;

        setConfig(prev => ({
          welcomeTitle: cleanedTitle,
          welcomeMessage: cleanedMessage,
          communityUrl: data.communityUrl || prev.communityUrl,
          chapters: cleanedChapters
        }));
      }
      setLoadingConfig(false);
    }, (err) => {
      console.warn("Could not load microlearning realtime config:", err);
      setLoadingConfig(false);
    });
    return () => unsub();
  }, []);

  // Load user local progress (answers, points, completions)
  useEffect(() => {
    try {
      const savedAnswers = localStorage.getItem('kira_microlearning_answers');
      if (savedAnswers) setLocalAnswers(JSON.parse(savedAnswers));

      const savedCompletions = localStorage.getItem('kira_microlearning_completions');
      if (savedCompletions) setCompletedChapters(JSON.parse(savedCompletions));

      const savedPoints = localStorage.getItem('kira_microlearning_local_points');
      if (savedPoints) {
        setPoints(parseInt(savedPoints));
      } else {
        setPoints(0);
      }

      const savedMandalas = localStorage.getItem('kira_microlearning_colored_mandalas');
      if (savedMandalas) setColoredMandalas(JSON.parse(savedMandalas));
    } catch (e) {
      console.error("Error loading local progress", e);
    }
  }, []);

  // Update localStorage helper
  const saveProgressToLocal = (updatedAnswers: Record<string, string>, updatedCompletions: string[], addedPoints: number) => {
    try {
      localStorage.setItem('kira_microlearning_answers', JSON.stringify(updatedAnswers));
      localStorage.setItem('kira_microlearning_completions', JSON.stringify(updatedCompletions));
      const newPoints = points + addedPoints;
      localStorage.setItem('kira_microlearning_local_points', newPoints.toString());
      setPoints(newPoints);

      // Award to Firebase user document if logged in
      if (user && addedPoints > 0) {
        const userRef = doc(db, 'users', user.uid);
        getDoc(userRef).then((snap) => {
          if (snap.exists()) {
            const currentPoints = snap.data().points || 0;
            updateDoc(userRef, {
              points: currentPoints + addedPoints
            }).catch(e => console.error("Could not sync points to user profile", e));
          }
        });
      }
    } catch (e) {
      console.error("Error writing progress to localStorage", e);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    const updated = { ...localAnswers, [questionId]: value };
    setLocalAnswers(updated);
    // Silent save
    localStorage.setItem('kira_microlearning_answers', JSON.stringify(updated));
  };

  const handleCompleteChapter = (chapterId: string) => {
    if (completedChapters.includes(chapterId)) {
      alert("¡Ya has completado este capítulo anteriormente! Sigue explorando.");
      return;
    }

    const updatedCompletions = [...completedChapters, chapterId];
    setCompletedChapters(updatedCompletions);
    saveProgressToLocal(localAnswers, updatedCompletions, 50); // E.g., Award 50 Zaps for completing a chapter!
    alert("✨ ¡Capítulo Completado! +50 Zaps de Energía añadidos a tu dispositivo local y perfil.");
  };

  const currentChapter = (config.chapters && config.chapters[activeChapterIndex]) || (config.chapters && config.chapters[0]) || DEFAULT_CHAPTERS[0];

  // Simple mandala grid click handler for virtual painting
  const handleColorSegment = (mandalaId: string, segmentIndex: number) => {
    const currentFilled = coloredMandalas[mandalaId] || Array(24).fill('#f1f5f9');
    const updated = [...currentFilled];
    updated[segmentIndex] = selectedColor;
    const newColoredMandalas = { ...coloredMandalas, [mandalaId]: updated };
    setColoredMandalas(newColoredMandalas);
    localStorage.setItem('kira_microlearning_colored_mandalas', JSON.stringify(newColoredMandalas));

    // Award bonus for starting to paint mandala
    if (!coloredMandalas[mandalaId]) {
      saveProgressToLocal(localAnswers, completedChapters, 15); // +15 for starting creative therapy
    }
  };

  // Helper template renderer for Interactive SVG Mandala
  const renderMandalaSVG = (mandalaId: string, type: string) => {
    const filledColors = coloredMandalas[mandalaId] || Array(24).fill('#f1f5f9');

    if (type === 'fire') {
      // Star/Sun themed mandala
      return (
        <svg viewBox="0 0 200 200" className="w-64 h-64 md:w-80 md:h-80 mx-auto max-w-full drop-shadow-md cursor-crosshair">
          <circle cx="100" cy="100" r="95" fill="none" stroke="#64748b" strokeWidth="1" />
          {/* Slices */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 360) / 12;
            const angleRad = (angle * Math.PI) / 180;
            const angleNextRad = (((angle + 30) % 360) * Math.PI) / 180;
            const x1 = 100 + 95 * Math.cos(angleRad);
            const y1 = 100 + 95 * Math.sin(angleRad);
            const x2 = 100 + 95 * Math.cos(angleNextRad);
            const y2 = 100 + 95 * Math.sin(angleNextRad);

            const pathInner = `M 100 100 L ${x1} ${y1} A 95 95 0 0 1 ${x2} ${y2} Z`;
            return (
              <path 
                key={i} 
                d={pathInner} 
                fill={filledColors[i]} 
                stroke="#475569" 
                strokeWidth="1" 
                onClick={() => handleColorSegment(mandalaId, i)}
                className="hover:opacity-85 transition-all duration-150"
              />
            );
          })}
          {/* Inner details / Triangles */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 360) / 12 + 15;
            const angleRad = (angle * Math.PI) / 180;
            const x = 100 + 55 * Math.cos(angleRad);
            const y = 100 + 55 * Math.sin(angleRad);
            const pathStar = `M 100 100 L ${x} ${y} z`;
            return (
              <circle 
                key={`inner-${i}`} 
                cx={x} 
                cy={y} 
                r="12" 
                fill={filledColors[i + 12]} 
                stroke="#1e293b" 
                strokeWidth="0.8" 
                onClick={() => handleColorSegment(mandalaId, i + 12)}
                className="hover:scale-110 origin-center transition-all duration-150 cursor-pointer"
              />
            );
          })}
          <circle cx="100" cy="100" r="22" fill="#fff" stroke="#14b8a6" strokeWidth="2" />
          <circle cx="100" cy="100" r="14" fill="#14b8a6" />
        </svg>
      );
    }

    if (type === 'calm') {
      // Concentric circles with petal slices
      return (
        <svg viewBox="0 0 200 200" className="w-64 h-64 md:w-80 md:h-80 mx-auto max-w-full drop-shadow-md cursor-crosshair">
          <circle cx="100" cy="100" r="95" fill="none" stroke="#64748b" strokeWidth="1" />
          {/* Slices of external rings */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 360) / 8;
            const angleRad = (angle * Math.PI) / 180;
            const angleNextRad = (((angle + 45) % 360) * Math.PI) / 180;
            const x1 = 100 + 95 * Math.cos(angleRad);
            const y1 = 100 + 95 * Math.sin(angleRad);
            const x1_inner = 100 + 60 * Math.cos(angleRad);
            const y1_inner = 100 + 60 * Math.sin(angleRad);
            const x2 = 100 + 95 * Math.cos(angleNextRad);
            const y2 = 100 + 95 * Math.sin(angleNextRad);
            const x2_inner = 100 + 60 * Math.cos(angleNextRad);
            const y2_inner = 100 + 60 * Math.sin(angleNextRad);

            const pathRing = `M ${x1_inner} ${y1_inner} L ${x1} ${y1} A 95 95 0 0 1 ${x2} ${y2} L ${x2_inner} ${y2_inner} A 60 60 0 0 0 ${x1_inner} ${y1_inner} Z`;
            return (
              <path 
                key={`outer-${i}`} 
                d={pathRing} 
                fill={filledColors[i]} 
                stroke="#475569" 
                strokeWidth="1" 
                onClick={() => handleColorSegment(mandalaId, i)}
                className="hover:opacity-85 transition-all duration-150"
              />
            );
          })}
          {/* Inner flowers */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 360) / 16;
            const angleRad = (angle * Math.PI) / 180;
            const x = 100 + 35 * Math.cos(angleRad);
            const y = 100 + 35 * Math.sin(angleRad);
            return (
              <rect
                key={`mid-${i}`}
                x={x - 10}
                y={y - 10}
                width="20"
                height="20"
                rx="4"
                transform={`rotate(${angle + 45}, ${x}, ${y})`}
                fill={filledColors[i + 8] || '#f1f5f9'}
                stroke="#1e293b"
                strokeWidth="0.8"
                onClick={() => handleColorSegment(mandalaId, i + 8)}
                className="hover:opacity-85 transition-all duration-150"
              />
            );
          })}
          <circle cx="100" cy="100" r="15" fill="#14b8a6" stroke="#fff" strokeWidth="2" />
        </svg>
      );
    }

    // Default: flower themed
    return (
      <svg viewBox="0 0 200 200" className="w-64 h-64 md:w-80 md:h-80 mx-auto max-w-full drop-shadow-md cursor-crosshair">
        <circle cx="100" cy="100" r="95" fill="none" stroke="#64748b" strokeWidth="1" />
        {/* Flower petals */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 360) / 12;
          const angleRad = (angle * Math.PI) / 180;
          const x = 100 + 50 * Math.cos(angleRad);
          const y = 100 + 50 * Math.sin(angleRad);
          return (
            <path
              key={i}
              d={`M 100 100 C 100 100, ${x - 30 * Math.sin(angleRad)} ${y + 30 * Math.cos(angleRad)}, ${x} ${y} C ${x} ${y}, ${x + 30 * Math.sin(angleRad)} ${y - 30 * Math.cos(angleRad)}, 100 100 Z`}
              fill={filledColors[i]}
              stroke="#334155"
              strokeWidth="1"
              onClick={() => handleColorSegment(mandalaId, i)}
              className="hover:opacity-85 transition-all duration-150"
            />
          );
        })}
        {/* Inner core */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 360) / 12 + 15;
          const angleRad = (angle * Math.PI) / 180;
          const x = 100 + 25 * Math.cos(angleRad);
          const y = 100 + 25 * Math.sin(angleRad);
          return (
            <circle
              key={`inner-${i}`}
              cx={x}
              cy={y}
              r="8"
              fill={filledColors[i + 12]}
              stroke="#1e293b"
              strokeWidth="0.8"
              onClick={() => handleColorSegment(mandalaId, i + 12)}
              className="hover:opacity-85 transition-all duration-150 cursor-pointer"
            />
          );
        })}
        <circle cx="100" cy="100" r="10" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
      </svg>
    );
  };

  // Levels based on accumulated local/global points
  const getBadgeTitle = (pts: number) => {
    if (pts >= 150) return 'Consciencia Suprema (Maestro)';
    if (pts >= 80) return 'Creador Inspirado (Avanzado)';
    if (pts >= 40) return 'Buscador Activo (Intermedio)';
    return 'Iniciante Curioso (Inicial)';
  };

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <RefreshCw className="animate-spin text-kirateal mb-4" size={48} />
        <p className="font-bold text-slate-600 animate-pulse text-sm">Cargando experiencia de Microlearning interactivo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      {/* Top Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (user) {
                navigate(user.role === 'coach' ? '/coach' : user.role === 'admin' ? '/admin' : '/dashboard');
              } else {
                navigate('/');
              }
            }} 
            className="p-2 hover:bg-white/10 rounded-xl transition text-slate-300 hover:text-white flex items-center justify-center"
            id="back_to_main"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm font-black tracking-tight flex items-center gap-1.5 uppercase">
              <Sparkles className="text-amber-400 fill-amber-400" size={16} /> Kira Coach Studio
            </h1>
            <p className="text-[10px] text-teal-400 font-bold tracking-widest uppercase">Aniversario Ebook Gamificado</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-800 border border-slate-700 rounded-full px-4 py-1.5 flex items-center gap-2">
            <Trophy className="text-amber-400" size={15} />
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Tu Progreso</p>
              <p className="text-xs font-black text-white leading-none mt-1">{points} Zaps</p>
            </div>
          </div>
          <div className="hidden sm:block text-xs bg-teal-500/10 border border-teal-500/20 text-teal-400 px-3 py-1.5 rounded-full font-black uppercase tracking-wider">
            {getBadgeTitle(points)}
          </div>
        </div>
      </div>

      {/* Hero Anniversary Banner */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="bg-gradient-to-r from-teal-500/90 to-cyan-600 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6 border border-teal-400/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full filter blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full filter blur-2xl -ml-16 -mb-16 pointer-events-none" />
          
          <div className="relative z-10 p-2 bg-white/15 rounded-2xl shrink-0 animate-bounce duration-3000">
            <div className="w-16 h-16 flex items-center justify-center bg-white rounded-xl text-teal-600 shadow-md">
              <Compass size={36} className="animate-spin duration-10000" />
            </div>
          </div>

          <div className="relative z-10 space-y-2 text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-black leading-tight tracking-tight">
              {config.welcomeTitle}
            </h2>
            <p className="text-sm text-teal-50/90 leading-relaxed max-w-3xl">
              {config.welcomeMessage}
            </p>
            <div className="pt-2 flex flex-wrap justify-center md:justify-start gap-4">
              <a 
                href={config.communityUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="bg-white text-teal-800 hover:bg-slate-50 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition duration-200 shadow-md"
              >
                <Users size={16} /> Unirse a Comunidad de WhatsApp
              </a>
              <button 
                onClick={() => {
                  setActiveTab('action');
                  document.getElementById('capitulos-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-teal-900/30 border border-white/20 hover:bg-teal-900/40 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition"
              >
                Comenzar Reto Diario
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8" id="capitulos-section">
        
        {/* CHAPTERS NAVIGATION (COLUMN - LEFT) */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Indice del Ebook Activo</h3>
          <div className="space-y-3">
            {config.chapters.map((ch, idx) => {
              const isActive = activeChapterIndex === idx;
              const isComp = completedChapters.includes(ch.id);
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveChapterIndex(idx);
                    setActiveTab('reading');
                  }}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-start gap-3.5 relative overflow-hidden group",
                    isActive 
                      ? "bg-white border-teal-500 shadow-lg shadow-teal-500/5 translate-x-1" 
                      : "bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300"
                  )}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-500" />}
                  
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs transition",
                    isComp 
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                      : isActive 
                        ? "bg-teal-500 text-white" 
                        : "bg-slate-100 text-slate-500"
                  )}>
                    {isComp ? <CheckCircle2 size={15} /> : (idx + 1)}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-700 group-hover:text-slate-900 transition line-clamp-1">{ch.title}</p>
                    <p className="text-[11px] text-slate-400 group-hover:text-slate-500 transition line-clamp-1">{ch.subtitle}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{ch.duration}</span>
                      {isComp && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">Completado +50 Zaps</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Gamified Rank Display Card */}
          <div className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden mt-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full filter blur-xl pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-teal-450 to-cyan-500 rounded-2xl text-white shadow-md shadow-teal-500/15">
                <Trophy size={20} className="text-amber-300" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Medalla de Consciencia</h4>
                <p className="text-[12px] text-[#14b8a6] font-black tracking-tight">{getBadgeTitle(points)}</p>
              </div>
            </div>
            
            <p className="text-[11px] text-slate-400 leading-relaxed mb-5">
              Completa la lectura de los capítulos, responde las preguntas de introspección y realiza prácticas de arteterapia para acumular Zaps de Energía.
            </p>

            {/* Visual Progress Bars */}
            <div className="space-y-4 pt-4 border-t border-slate-900">
              {/* Chapters Progress */}
              <div className="space-y-1.5 animate-in slide-in-from-left-2 duration-300">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-slate-400">Lectura de Capítulos</span>
                  <span className="text-teal-400">{completedChapters.length} de {config.chapters.length} ({Math.round((completedChapters.length / Math.max(config.chapters.length, 1)) * 100)}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedChapters.length / Math.max(config.chapters.length, 1)) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full"
                  />
                </div>
              </div>

              {/* Exercises Response Progress */}
              {(() => {
                const totalQuestions = config.chapters.reduce((acc, ch) => acc + (ch.coachingQuestions?.length || 0), 0);
                const answeredQuestions = Object.values(localAnswers).filter(val => val && val.trim().length > 0).length;
                const percentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
                return (
                  <div className="space-y-1.5 animate-in slide-in-from-left-2 duration-450">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-400">Ejercicios Realizados</span>
                      <span className="text-indigo-400">{answeredQuestions} de {totalQuestions} ({percentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-[#14b8a6] to-indigo-500 rounded-full"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-900 flex justify-between items-center text-[10px] text-slate-500">
              <span className="font-medium">Total de Energía:</span>
              <span className="font-black text-white bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-md">{points} Zaps</span>
            </div>
          </div>
        </div>

        {/* WORKSPACE & CONTROLS (COLUMN - RIGHT) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
          
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 pb-3 mb-6 gap-2">
            <button
              onClick={() => setActiveTab('reading')}
              className={cn(
                "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center gap-1.5",
                activeTab === 'reading' 
                  ? "bg-slate-900 text-white shadow" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              )}
            >
              <BookOpen size={14} /> 1. Resumen
            </button>
            <button
              onClick={() => setActiveTab('action')}
              className={cn(
                "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center gap-1.5 relative",
                activeTab === 'action' 
                  ? "bg-slate-900 text-white shadow" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              )}
            >
              <Lightbulb size={14} /> 2. Coaching Activo
              {(currentChapter?.coachingQuestions || []).some(q => q?.id && localAnswers[q.id]) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-500 rounded-full border border-white" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('art')}
              className={cn(
                "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center gap-1.5",
                activeTab === 'art' 
                  ? "bg-slate-900 text-white shadow" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              )}
            >
              <Palette size={14} /> 3. Arteterapia Mándala
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'reading' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
                key="reading-tab"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full uppercase tracking-widest">{(currentChapter?.duration || '5 min')} de lectura activa</span>
                  <h2 className="text-xl font-black text-slate-800">{(currentChapter?.title || '')}</h2>
                  <p className="text-sm font-semibold text-slate-500">{(currentChapter?.subtitle || '')}</p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                    <FileText size={14} className="text-teal-500" /> Ideas Clave del Capítulo
                  </h4>
                  <ul className="space-y-3.5">
                    {(currentChapter?.summary || []).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0 text-xs font-black mt-0.5">
                          {idx + 1}
                        </div>
                        <p className="text-xs leading-relaxed text-slate-600 font-medium">
                          {item}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-amber-500/[0.04] border border-amber-500/10 rounded-2xl flex items-start gap-3.5">
                  <Sparkles className="text-amber-500 shrink-0 mt-0.5" size={18} />
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-amber-800">Próximo paso interactivo</h5>
                    <p className="text-xs text-amber-700/90 leading-relaxed">
                      Al terminar este resumen, ve a la pestaña <strong>2. Coaching Activo</strong> para responder las preguntas de Kira y guardar tu evolución.
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setActiveTab('action')}
                    className="px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-2"
                  >
                    Ir a Coaching Activo <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'action' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
                key="action-tab"
              >
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-800">Zona de Preguntas Ontológicas</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Escribe tus respuestas con honestidad. Todo queda respaldado de forma segura en tu propio dispositivo. ¡Nadie más que tú tiene acceso!
                  </p>
                </div>

                <div className="space-y-5">
                  {(currentChapter?.coachingQuestions || []).map((q) => (
                    <div key={q?.id || ''} className="space-y-2 border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                      <label className="block text-xs font-black text-slate-700 leading-relaxed">
                        {q?.text || ''}
                      </label>
                      <textarea
                        value={(q?.id && localAnswers[q.id]) || ''}
                        onChange={(e) => q?.id && handleAnswerChange(q.id, e.target.value)}
                        placeholder={q?.placeholder || ''}
                        className="w-full h-24 text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium leading-relaxed"
                      />
                    </div>
                  ))}
                </div>

                {/* Progress actions */}
                <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-100">
                  <p className="text-[11px] text-slate-400 font-semibold italic">
                    {Object.keys(localAnswers).length > 0 ? "Progreso guardado automáticamente." : "El formulario se autoguarda al escribir."}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setActiveTab('art')}
                      className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition"
                    >
                      Ver Arteterapia
                    </button>
                    <button
                      onClick={() => handleCompleteChapter(currentChapter?.id || '')}
                      disabled={completedChapters.includes(currentChapter?.id || '')}
                      className={cn(
                        "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-2",
                        completedChapters.includes(currentChapter?.id || '')
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100 cursor-not-allowed shadow-none"
                          : "bg-teal-500 hover:bg-teal-600 text-white"
                      )}
                    >
                      {completedChapters.includes(currentChapter?.id || '') ? (
                        <>
                          Completado <Check size={14} />
                        </>
                      ) : (
                        <>
                          Finalizar Capítulo <Check size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'art' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
                key="art-tab"
              >
                {(currentChapter?.dynamics || []).map((dyn) => (
                  <div key={dyn?.id || ''} className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-teal-600">
                        <Palette size={20} />
                        <h3 className="font-black text-lg text-slate-800">{dyn.title}</h3>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed border-l-2 border-teal-500 pl-3">
                        {dyn.instruction}
                      </p>
                    </div>

                    {/* interactive coloring UI */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      
                      {/* Mandala Display Area */}
                      <div className="md:col-span-8 flex justify-center py-4 bg-white rounded-xl border border-slate-100 shadow-inner">
                        {renderMandalaSVG(dyn.id, dyn.mandalaType)}
                      </div>

                      {/* Coloring Controls Side Panel */}
                      <div className="md:col-span-4 space-y-4">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Pincel del Observador</label>
                          <div className="grid grid-cols-4 gap-2">
                            {colorPalette.map((color) => {
                              const isSelected = selectedColor === color;
                              return (
                                <button
                                  key={color}
                                  onClick={() => setSelectedColor(color)}
                                  style={{ backgroundColor: color }}
                                  className={cn(
                                    "w-8 h-8 rounded-full border-2 transition-transform duration-200 shadow-sm relative",
                                    isSelected ? "scale-110 border-slate-900" : "border-transparent hover:scale-105"
                                  )}
                                >
                                  {isSelected && (
                                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs drop-shadow-md">✓</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="pt-2 space-y-2">
                          <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-[11px] text-teal-700 leading-relaxed font-medium">
                            💡 Haz clic sobre las secciones o pétalos del mándala a la izquierda para rellenar con tu vibración actual.
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => {
                                if (confirm("¿Seguro que quieres borrar tus trazos en este mándala?")) {
                                  const updated = { ...coloredMandalas, [dyn.id]: Array(24).fill('#f1f5f9') };
                                  setColoredMandalas(updated);
                                  localStorage.setItem('kira_microlearning_colored_mandalas', JSON.stringify(updated));
                                }
                              }}
                              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              Volver a empezar mándala
                            </button>
                            <button
                              onClick={() => {
                                window.print();
                              }}
                              className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2"
                            >
                              <Download size={14} /> Imprimir / PDF
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}

                <div className="border-t border-slate-100 pt-10 mt-10">
                  <Arteterapia onAwardPoints={(pts) => saveProgressToLocal(localAnswers, completedChapters, pts)} />
                </div>

                <div className="p-3.5 bg-slate-905 border border-slate-800 rounded-2xl flex items-center justify-between mt-8 text-xs bg-slate-900 text-white">
                  <span className="font-semibold text-slate-300">¡Comparte tus creaciones!</span>
                  <a 
                    href={config.communityUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-black uppercase rounded-xl tracking-wider text-[11px] transition flex items-center gap-1 shadow-md shadow-teal-500/10"
                  >
                    Compartir en WhatsApp <ExternalLink size={12} />
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
