import { useState, useEffect } from 'react';
import { BookOpen, Palette, Users, Download, MessageCircle, Send, Instagram, ChevronRight, Sparkles } from 'lucide-react';

// Datos estáticos del ebook y contenido (fáciles de editar)
const EBOOK_CHAPTERS = [
  {
    id: 1,
    title: "Capítulo 1: El poder de la comunidad",
    content: "Cuando leemos juntos, crecemos juntos. La comunidad es el alma de cualquier proceso de aprendizaje. En KIRA, creemos que el conocimiento se multiplica cuando se comparte. Este primer capítulo te invita a reflexionar sobre cómo el apoyo mutuo transforma nuestras metas personales en logros colectivos."
  },
  {
    id: 2,
    title: "Capítulo 2: La lectura como práctica transformadora",
    content: "Leer no es solo absorber información. Es un acto de creación. Cada página que pasas, cada idea que subrayas, cada reflexión que anotas, te va transformando. Este capítulo explora cómo convertir la lectura en una práctica diaria que nutra tu alma y expanda tu mirada."
  },
  {
    id: 3,
    title: "Capítulo 3: El arte de encontrarse en el camino",
    content: "El verdadero viaje del conocimiento no es solitario. En este capítulo descubrirás cómo las pequeñas acciones creativas -dibujar, escribir, compartir- pueden convertirse en puentes que conectan corazones. Porque al final, no se trata solo de lo que aprendemos, sino de con quién lo compartimos."
  }
];

const COACHING_QUESTIONS = [
  "¿Qué libro o lectura marcó un antes y un después en tu vida? ¿Por qué?",
  "Si pudieras compartir una sola enseñanza con tu comunidad, ¿cuál sería?",
  "¿Qué pequeño hábito de lectura o creación puedes empezar hoy para nutrirte?"
];

const MANDALAS = [
  { id: 1, name: "Mandala de la Calma", preview: "🎨", downloadUrl: "#" },
  { id: 2, name: "Mandala de la Creatividad", preview: "🎨", downloadUrl: "#" },
  { id: 3, name: "Mandala de la Comunidad", preview: "🎨", downloadUrl: "#" }
];

type TabType = 'leer' | 'crear' | 'compartir';

export default function ClubPaginasVivas() {
  const [activeTab, setActiveTab] = useState<TabType>('leer');
  const [selectedChapter, setSelectedChapter] = useState(EBOOK_CHAPTERS[0]);
  const [savedReflections, setSavedReflections] = useState<{ question: string; answer: string }[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Cargar reflexiones guardadas al iniciar
  useEffect(() => {
    const saved = localStorage.getItem('club_reflections');
    if (saved) {
      setSavedReflections(JSON.parse(saved));
    }
  }, []);

  // Guardar reflexión
  const saveReflection = () => {
    if (!currentAnswer.trim()) return;
    
    const newReflection = {
      question: COACHING_QUESTIONS[currentQuestionIndex],
      answer: currentAnswer
    };
    const updated = [...savedReflections, newReflection];
    setSavedReflections(updated);
    localStorage.setItem('club_reflections', JSON.stringify(updated));
    setCurrentAnswer('');
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    
    // Avanzar a siguiente pregunta
    if (currentQuestionIndex + 1 < COACHING_QUESTIONS.length) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Descargar mandala (simulado)
  const handleDownload = (mandalaName: string) => {
    alert(`📥 Descargando "${mandalaName}". Pronto tendrás el enlace directo en la comunidad.`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F1DE] via-white to-[#F4F1DE]">
      {/* Encabezado de bienvenida */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#E07A5F] to-[#c55a3e] text-white py-16 px-4">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#F2CC8F] rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">🎉 Espacio Especial</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">📚 Club de Páginas Vivas</h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            Un espacio para leer, crear y conectar con tu comunidad
          </p>
        </div>
      </div>

      {/* Pestañas de navegación */}
      <div className="max-w-6xl mx-auto px-4 -mt-6 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex flex-wrap border-b border-gray-100">
            {[
              { id: 'leer', icon: BookOpen, label: '📖 Leer', color: 'text-[#E07A5F]' },
              { id: 'crear', icon: Palette, label: '🎨 Crear / Arteterapia', color: 'text-[#81B29A]' },
              { id: 'compartir', icon: Users, label: '🤝 Compartir / Comunidad', color: 'text-[#F2CC8F]' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
                  activeTab === tab.id
                    ? 'border-b-2 border-[#E07A5F] text-[#E07A5F] bg-[#F4F1DE]/30'
                    : 'text-gray-500 hover:text-[#3D405B] hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.charAt(0)}</span>
              </button>
            ))}
          </div>

          {/* Contenido de cada pestaña */}
          <div className="p-6 md:p-8">
            {/* Pestaña LEER - Ebook interactivo */}
            {activeTab === 'leer' && (
              <div className="grid md:grid-cols-3 gap-6">
                {/* Índice de capítulos */}
                <div className="md:col-span-1 bg-[#F4F1DE]/30 rounded-xl p-4">
                  <h3 className="font-bold text-[#3D405B] mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#E07A5F]" />
                    Capítulos
                  </h3>
                  <div className="space-y-2">
                    {EBOOK_CHAPTERS.map(ch => (
                      <button
                        key={ch.id}
                        onClick={() => setSelectedChapter(ch)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center justify-between ${
                          selectedChapter.id === ch.id
                            ? 'bg-[#E07A5F] text-white'
                            : 'hover:bg-white text-[#3D405B]'
                        }`}
                      >
                        <span className="text-sm font-medium">{ch.title}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contenido del capítulo seleccionado */}
                <div className="md:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h2 className="text-2xl font-bold text-[#E07A5F] mb-4">{selectedChapter.title}</h2>
                  <p className="text-gray-700 leading-relaxed mb-6">{selectedChapter.content}</p>
                  <div className="bg-[#F4F1DE] rounded-lg p-4">
                    <p className="text-sm text-[#3D405B] italic">
                      💡 "Cada página leída es una semilla que germina en comunidad"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pestaña CREAR - Arteterapia + Coaching */}
            {activeTab === 'crear' && (
              <div className="space-y-8">
                {/* Mandalas para descargar */}
                <div>
                  <h2 className="text-2xl font-bold text-[#81B29A] mb-4 flex items-center gap-2">
                    <Palette className="w-6 h-6" />
                    Mandalas para descargar
                  </h2>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {MANDALAS.map(m => (
                      <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition">
                        <div className="text-6xl mb-3">{m.preview}</div>
                        <h3 className="font-semibold text-[#3D405B] mb-2">{m.name}</h3>
                        <button
                          onClick={() => handleDownload(m.name)}
                          className="inline-flex items-center gap-2 bg-[#81B29A] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#6a8f7a] transition"
                        >
                          <Download className="w-4 h-4" />
                          Descargar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preguntas de Coaching Ontológico */}
                <div className="bg-gradient-to-r from-[#81B29A]/10 to-transparent rounded-xl p-6">
                  <h2 className="text-2xl font-bold text-[#3D405B] mb-4 flex items-center gap-2">
                    💭 Pregunta para reflexionar
                  </h2>
                  
                  {currentQuestionIndex < COACHING_QUESTIONS.length ? (
                    <div>
                      <p className="text-lg text-[#3D405B] mb-4">
                        {COACHING_QUESTIONS[currentQuestionIndex]}
                      </p>
                      <textarea
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        placeholder="Escribe tu reflexión aquí..."
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#81B29A] focus:border-transparent resize-none"
                        rows={4}
                      />
                      <button
                        onClick={saveReflection}
                        className="mt-4 bg-[#81B29A] text-white px-6 py-2 rounded-lg hover:bg-[#6a8f7a] transition flex items-center gap-2"
                      >
                        Guardar reflexión
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-5xl mb-4">✨</div>
                      <p className="text-[#3D405B] font-medium">¡Completaste todas las reflexiones!</p>
                      <p className="text-sm text-gray-500 mt-2">Tus respuestas están guardadas en este dispositivo</p>
                    </div>
                  )}

                  {showSuccess && (
                    <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce">
                      ✨ ¡Reflexión guardada!
                    </div>
                  )}

                  {/* Reflexiones guardadas */}
                  {savedReflections.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="font-semibold text-[#3D405B] mb-3">📔 Mis reflexiones guardadas</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {savedReflections.slice(-3).reverse().map((ref, i) => (
                          <div key={i} className="bg-white p-3 rounded-lg text-sm">
                            <p className="font-medium text-[#81B29A]">{ref.question.substring(0, 60)}...</p>
                            <p className="text-gray-600 mt-1">{ref.answer.substring(0, 100)}...</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pestaña COMPARTIR - Comunidad */}
            {activeTab === 'compartir' && (
              <div className="text-center py-8">
                <div className="text-6xl mb-6">🤝</div>
                <h2 className="text-2xl font-bold text-[#3D405B] mb-4">Comparte tus descubrimientos</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Únete a nuestra comunidad y comparte tus reflexiones, mandalas y aprendizajes
                </p>
                
                <div className="flex flex-wrap justify-center gap-4">
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); alert("🔗 Enlace de WhatsApp disponible próximamente en la comunidad"); }}
                    className="inline-flex items-center gap-3 bg-[#25D366] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#1da15a] transition transform hover:scale-105"
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </a>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); alert("🔗 Enlace de Telegram disponible próximamente en la comunidad"); }}
                    className="inline-flex items-center gap-3 bg-[#0088cc] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#006699] transition transform hover:scale-105"
                  >
                    <Send className="w-5 h-5" />
                    Telegram
                  </a>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); alert("🔗 Enlace de Instagram disponible próximamente en la comunidad"); }}
                    className="inline-flex items-center gap-3 bg-gradient-to-r from-[#f09433] via-[#bc2a8d] to-[#e4405f] text-white px-6 py-3 rounded-xl font-medium transition transform hover:scale-105"
                  >
                    <Instagram className="w-5 h-5" />
                    Instagram
                  </a>
                </div>

                <div className="mt-12 p-6 bg-[#F4F1DE] rounded-2xl max-w-md mx-auto">
                  <p className="text-sm text-[#3D405B]">
                    🌱 "Lo que aprendes en soledad, lo multiplicas en comunidad"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer simple */}
      <div className="text-center py-8 text-gray-400 text-sm">
        <p>Club de Páginas Vivas · Un espacio para crecer juntos</p>
      </div>
    </div>
  );
}
