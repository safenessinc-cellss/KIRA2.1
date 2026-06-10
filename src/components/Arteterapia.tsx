import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, Download, Sparkles, CheckCircle, RotateCcw, FileText, Printer, HelpCircle, Heart } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface ArteterapiaProps {
  onAwardPoints?: (points: number) => void;
}

export function Arteterapia({ onAwardPoints }: ArteterapiaProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({
    colors: '',
    release: '',
    breath: '',
    mantra: ''
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pointsRewarded, setPointsRewarded] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Load answers from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kira_arteterapia_responses');
      const pointState = localStorage.getItem('kira_arteterapia_points_rewarded');
      if (saved) {
        setAnswers(JSON.parse(saved));
      }
      if (pointState === 'true') {
        setPointsRewarded(true);
      }
    } catch (e) {
      console.error('Error loading Arteterapia local storage: ', e);
    }
  }, []);

  const handleInputChange = (key: string, val: string) => {
    setAnswers(prev => ({
      ...prev,
      [key]: val
    }));
    setSavedSuccess(false);
  };

  const handleSaveAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('kira_arteterapia_responses', JSON.stringify(answers));
      setSavedSuccess(true);

      // Reward points if they filled out key inputs and haven't been rewarded yet
      const textFilled = Object.values(answers).some(val => val.trim().length > 5);
      if (textFilled && !pointsRewarded) {
        // Reward 15 local points
        const savedLocalPoints = localStorage.getItem('kira_microlearning_local_points') || '0';
        const newLocalPoints = parseInt(savedLocalPoints) + 15;
        localStorage.setItem('kira_microlearning_local_points', newLocalPoints.toString());
        localStorage.setItem('kira_arteterapia_points_rewarded', 'true');
        setPointsRewarded(true);

        if (onAwardPoints) {
          onAwardPoints(15);
        }

        // Push points online if logged in
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const currentPoints = snap.data().points || 0;
            await updateDoc(userRef, {
              points: currentPoints + 15
            });
          }
        }
      }

      setTimeout(() => {
        setSavedSuccess(false);
      }, 3500);

    } catch (err) {
      console.error('Error saving answers:', err);
    }
  };

  const handleReset = () => {
    if (confirm('¿Seguro de que deseas limpiar tus reflexiones de Arteterapia? Esto no quitará tus puntos acumulados.')) {
      const empty = { colors: '', release: '', breath: '', mantra: '' };
      setAnswers(empty);
      localStorage.setItem('kira_arteterapia_responses', JSON.stringify(empty));
    }
  };

  const downloadResource = (id: string, name: string) => {
    setDownloadingId(id);
    setTimeout(() => {
      // Create mockup download link
      const element = document.createElement("a");
      const file = new Blob([`Mock creative resource for printable mandala [${name}]. Ready to import, print or display.`], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `KiraMoreno_ArteTerapia_${name}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      setDownloadingId(null);
    }, 1200);
  };

  const creativeResources = [
    {
      id: 'r1',
      title: 'Mándala de la Calma Estelar',
      description: 'Lienzo floral de alta definición y trazo grueso optimizado para disminuir el cortisol en 10 minutos.',
      format: 'PDF Imprimible / 300 DPI',
      size: '4.2 MB'
    },
    {
      id: 'r2',
      title: 'Diario de Auto-Calibración de Color',
      description: 'Plantilla de autodiagnóstico emocional para emparejar tus tonos diarios con espectros conscientes.',
      format: 'Papel A4 / 2 Caras',
      size: '1.8 MB'
    },
    {
      id: 'r3',
      title: 'Mándala Geometría Sagrada (Ondas)',
      description: 'Círculo concéntrico de ondas entrelazadas que simulan la relajación diafragmática profunda.',
      format: 'Tablet PNG / HQ Digital',
      size: '2.5 MB'
    },
    {
      id: 'r4',
      title: 'Manual de Trazo Consciente',
      description: 'Guía práctica para sincronizar cada pincelada con la respiración rítmica del observador 4-7-8.',
      format: 'Folleto PDF / 4 páginas',
      size: '3.1 MB'
    }
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500 font-sans" id="arteterapia-section">
      
      {/* Introduction Card */}
      <div className="bg-gradient-to-r from-teal-500 to-indigo-600 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full filter blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/15 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-white/10">
            <Palette size={13} className="text-amber-300" /> Zona de Acción Holística
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
            Arteterapia & Diálogos en Silencio
          </h2>
          <p className="text-xs md:text-sm text-teal-100 leading-relaxed max-w-2xl font-medium">
            El arte despierta zonas cognitivas inaccesibles al habla racional. Tómate un momento para sincronizar con tus colores, plasmar tu estado actual y reflexionar mediante preguntas de coaching ontológico holístico.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Reflection Journaling Area (Column - Left) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                <Heart size={20} className="fill-teal-100" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Bitácora de Auto-Calibración</h3>
                <p className="text-[10px] text-slate-500 font-medium">Preguntas para decantar la experiencia artística</p>
              </div>
            </div>
            {pointsRewarded && (
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-100">
                <Sparkles size={11} className="text-amber-500 fill-amber-300" /> +15 Pts Sincronizados
              </div>
            )}
          </div>

          <form onSubmit={handleSaveAndSubmit} className="space-y-6">
            
            {/* Question 1 */}
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-xs font-bold text-slate-700 leading-normal">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-50 text-teal-600 text-[10px] font-bold shrink-0 mt-0.5">1</span>
                ¿Qué colores seleccionaste para tu mándala y qué emoción representan en tu interior hoy?
              </label>
              <textarea
                value={answers.colors}
                onChange={(e) => handleInputChange('colors', e.target.value)}
                placeholder="Ej. Toques dorados de gratitud con violetas de introspección espiritual..."
                className="w-full p-4 border border-slate-150 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 bg-slate-50/50 resize-none h-24 font-medium leading-relaxed"
                required
              />
            </div>

            {/* Question 2 */}
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-xs font-bold text-slate-700 leading-normal">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-50 text-teal-600 text-[10px] font-bold shrink-0 mt-0.5">2</span>
                ¿En qué parte de tu cuerpo sentiste mayor liberación o relajación mientras coloreabas cíclicamente?
              </label>
              <textarea
                value={answers.release}
                onChange={(e) => handleInputChange('release', e.target.value)}
                placeholder="Ej. Mis hombros soltaron tensión al focalizar la respiración..."
                className="w-full p-4 border border-slate-150 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 bg-slate-50/50 resize-none h-24 font-medium leading-relaxed"
                required
              />
            </div>

            {/* Question 3 */}
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-xs font-bold text-slate-700 leading-normal">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-50 text-teal-600 text-[10px] font-bold shrink-0 mt-0.5">3</span>
                Si tu respiración diafragmática tuviera un sonido, ¿cómo la describirías y que te enseña de tu ritmo actual?
              </label>
              <textarea
                value={answers.breath}
                onChange={(e) => handleInputChange('breath', e.target.value)}
                placeholder="Ej. Un murmullo de olas marinas pacíficas, indicando calma progresiva..."
                className="w-full p-4 border border-slate-150 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 bg-slate-50/50 resize-none h-24 font-medium leading-relaxed"
                required
              />
            </div>

            {/* Question 4 */}
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-xs font-bold text-slate-700 leading-normal">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-50 text-teal-600 text-[10px] font-bold shrink-0 mt-0.5">4</span>
                Redacta un mantra de autocompasión que desees sembrar e interiorizar en tu corazón:
              </label>
              <input
                type="text"
                value={answers.mantra}
                onChange={(e) => handleInputChange('mantra', e.target.value)}
                placeholder="Ej. 'Confío en mi proceso lento, honro mi energía y merezco descansar hoy'"
                className="w-full p-4 border border-slate-150 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 bg-slate-50/50 font-medium"
                required
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={14} /> Reestablecer
              </button>
              
              <button
                type="submit"
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-teal-600/15 flex items-center justify-center gap-2"
                id="save-art-dynamics"
              >
                <CheckCircle size={15} /> Guardar Reflexión en mi Disparador
              </button>
            </div>

            {/* Inline success overlay */}
            <AnimatePresence>
              {savedSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-xs font-medium flex items-center gap-2.5 shadow-sm"
                >
                  <CheckCircle size={16} className="text-emerald-500" />
                  <span>Reflexiones guardadas y sincronizadas exitosamente en el almacenamiento local de tu dispositivo.</span>
                </motion.div>
              )}
            </AnimatePresence>

          </form>
        </div>

        {/* Resource Downloads Area (Column - Right) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-md space-y-6 flex-1">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="p-2 bg-gradient-to-br from-teal-400 to-indigo-500 rounded-xl text-white">
                <Download size={18} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Recursos de Arteterapia</h3>
                <p className="text-[10px] text-slate-400 font-medium">Lienzos y guías para descargar e imprimir</p>
              </div>
            </div>

            <div className="space-y-4">
              {creativeResources.map((res) => {
                const isDownloading = downloadingId === res.id;
                return (
                  <div
                    key={res.id}
                    className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-teal-500/20 hover:bg-white/10 transition-all duration-300 flex flex-col gap-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <span className="block text-xs font-black text-slate-200 group-hover:text-teal-400 transition-colors truncate">{res.title}</span>
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded">{res.format}</span>
                          <span className="text-[9px] font-mono text-[#14b8a6]">{res.size}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => downloadResource(res.id, res.title)}
                        disabled={downloadingId !== null}
                        className={cn(
                          "w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center transition shrink-0 hover:bg-teal-500 hover:text-white hover:border-teal-500 shadow-sm text-slate-400 cursor-pointer disabled:opacity-50",
                          isDownloading && "bg-teal-500 text-white border-teal-500"
                        )}
                        title="Descargar Recurso"
                      >
                        {isDownloading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Download size={14} />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium">{res.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl text-[10px] text-teal-300 leading-relaxed font-semibold flex items-start gap-2.5 shadow-inner">
              <HelpCircle size={14} className="text-[#14b8a6] shrink-0 mt-0.5 animate-pulse" />
              <span>💡 Estos recursos fueron optimizados e ilustrados por el equipo editorial de Kira Coach para que los imprimas y colorees en casa con lápices o rotuladores.</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
