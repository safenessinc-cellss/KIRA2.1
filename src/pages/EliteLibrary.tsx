import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, onSnapshot, addDoc } from 'firebase/firestore';
import { Zap, Lock, Unlock, FileText, Video, Image as ImageIcon, Search, Filter, Loader2, Sparkles, X, PlayCircle, GripHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';
import { Reorder } from 'motion/react';

export function EliteLibrary() {
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [displayItems, setDisplayItems] = useState<any[]>([]);

  useEffect(() => {
    // Fetch all coaches to get their mediaItems
    const q = query(collection(db, 'users'), where('role', '==', 'coach'));
    const unsub = onSnapshot(q, (snap) => {
      const coachList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCoaches(coachList);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const items = coaches.flatMap(coach => 
      (coach.mediaItems || []).map((item: any) => ({
        ...item,
        uniqueId: `${coach.id}-${item.title}-${Date.now()}`,
        coachId: coach.id,
        coachName: coach.displayName,
        coachPhoto: coach.photoURL
      }))
    ).filter((item: any) => 
      (searchTerm === '' || item.title.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterType === 'all' || item.type === filterType)
    );
    setDisplayItems(items);
  }, [coaches, searchTerm, filterType]);

  const handleUnlock = async (item: any) => {
    if (!user || (user.points || 0) < (item.pointCost || 0)) {
      alert("No tienes suficientes Energy Pts.");
      return;
    }
    setUnlocking(`${item.coachId}-${item.title}`);
    try {
      // Deduct points and add to unlockedTools
      await updateDoc(doc(db, 'users', user.uid), {
        points: (user.points || 0) - (item.pointCost || 0),
        unlockedTools: arrayUnion(`${item.coachId}:${item.title}`)
      });
      // Add to history
      await addDoc(collection(db, 'unlockedHistory'), {
        userId: user.uid,
        coachId: item.coachId,
        coachName: item.coachName,
        title: item.title,
        type: item.type,
        url: item.url,
        cost: item.pointCost || 0,
        unlockedAt: new Date()
      });
      alert(`¡"${item.title}" desbloqueado con éxito!`);
    } catch (e) {
      console.error(e);
      alert("Error al desbloquear.");
    } finally {
      setUnlocking(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-kirateal to-slate-900 rounded-3xl p-10 text-white relative overflow-hidden shadow-2xl shadow-kirateal/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-kiragold/10 rounded-full blur-[100px] -mr-48 -mt-48" />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
             <div className="px-3 py-1 bg-kiragold/20 border border-kiragold/30 rounded-full text-kiragold text-[10px] font-black uppercase tracking-widest">
               Exclusivo Élite
             </div>
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight leading-tight">Bóveda de Herramientas Premium</h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Utiliza tus Energy Pts acumulados para desbloquear recursos exclusivos de los mejores coaches: plantillas, guías maestras y contenido secreto.
          </p>
          
          <div className="mt-8 flex items-center gap-6">
             <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 flex items-center gap-3">
                <Zap className="text-kiragold" size={24} fill="currentColor" />
                <div>
                   <p className="text-[10px] uppercase font-bold text-slate-400">Total Energy Pts</p>
                   <p className="text-2xl font-black text-white leading-none">{user?.points || 0}</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar plantillas, videos..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
          />
        </div>
        
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl overflow-x-auto w-full md:w-auto">
          <FilterBtn active={filterType === 'all'} onClick={() => setFilterType('all')} label="Todos" />
          <FilterBtn active={filterType === 'pdf'} onClick={() => setFilterType('pdf')} label="PDFs" icon={<FileText size={14}/>} />
          <FilterBtn active={filterType === 'video'} onClick={() => setFilterType('video')} label="Videos" icon={<Video size={14}/>} />
          <FilterBtn active={filterType === 'imagen'} onClick={() => setFilterType('imagen')} label="Imágenes" icon={<ImageIcon size={14}/>} />
        </div>
      </div>

      <Reorder.Group 
        axis="y" 
        values={displayItems} 
        onReorder={setDisplayItems} 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 list-none"
      >
        {displayItems.map((item) => {
          const isUnlocked = user?.unlockedTools?.includes(`${item.coachId}:${item.title}`) || (item.pointCost || 0) === 0;
          const canAfford = (user?.points || 0) >= (item.pointCost || 0);
          const isCurrentlyUnlocking = unlocking === `${item.coachId}-${item.title}`;

          return (
            <Reorder.Item 
              key={item.uniqueId} 
              value={item}
              className={cn(
                "group bg-white rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden cursor-grab active:cursor-grabbing",
                isUnlocked ? "border-slate-200 hover:shadow-xl hover:-translate-y-1" : "border-slate-100 shadow-sm"
              )}
            >
              <div className="relative h-40 bg-slate-50 overflow-hidden">
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-white">
                      <Lock size={32} className="mb-2 opacity-50" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.pointCost} Energy Pts</span>
                  </div>
                )}
                <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                   <div className="px-2 py-1 bg-white/90 backdrop-blur rounded-lg text-[9px] font-black text-slate-800 uppercase shadow-sm flex items-center gap-1.5">
                      {item.type === 'pdf' && <FileText size={10}/>}
                      {item.type === 'video' && <Video size={10}/>}
                      {item.type === 'imagen' && <ImageIcon size={10}/>}
                      {item.type}
                   </div>
                </div>
                <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="p-1.5 bg-white/80 backdrop-blur hover:bg-white text-slate-600 rounded-lg shadow-sm">
                      <GripHorizontal size={14} />
                   </div>
                </div>
                <img 
                  src={item.type === 'imagen' ? item.url : `https://picsum.photos/seed/${item.coachId}-${item.title}/400/200`} 
                  alt="Previa" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
              </div>

              <div className="p-6 flex-1 flex flex-col bg-white">
                <div className="flex items-center gap-2 mb-3">
                   <div className="w-5 h-5 rounded-full bg-slate-100 overflow-hidden">
                      <img src={item.coachPhoto || `https://ui-avatars.com/api/?name=${item.coachName}`} alt={item.coachName} className="w-full h-full object-cover" />
                   </div>
                   <span className="text-[10px] font-bold text-slate-500">{item.coachName}</span>
                </div>
                
                <h3 className="font-bold text-slate-900 text-sm mb-4 leading-tight pointer-events-none">{item.title}</h3>
                
                <div className="mt-auto relative z-10" onPointerDown={e => e.stopPropagation()}>
                  {isUnlocked ? (
                    item.type === 'video' ? (
                      <button 
                        onClick={() => setPlayingVideo(item.url)}
                        className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors"
                      >
                        <PlayCircle size={14} /> Reproducir
                      </button>
                    ) : (
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors"
                      >
                        <Unlock size={14} /> Acceder Ahora
                      </a>
                    )
                  ) : (
                    <button 
                      onClick={() => handleUnlock(item)}
                      disabled={!canAfford || isCurrentlyUnlocking}
                      className={cn(
                        "w-full py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition-all",
                        canAfford 
                          ? "bg-kiragold text-slate-900 shadow-lg shadow-kiragold/20 hover:scale-[1.02] active:scale-95" 
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      )}
                    >
                      {isCurrentlyUnlocking ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <>
                          <Zap size={14} fill={canAfford ? "currentColor" : "none"} />
                          Desbloquear por {item.pointCost} E-Pts
                        </>
                      )}
                    </button>
                  )}
                  {!isUnlocked && !canAfford && (
                    <p className="text-[9px] text-center text-rose-400 font-bold mt-2 uppercase tracking-tight">Energy Pts insuficientes</p>
                  )}
                </div>
              </div>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      {displayItems.length === 0 && (
        <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
           <Search size={48} className="mx-auto text-slate-200 mb-4" />
           <p className="text-slate-400 font-medium">No se encontraron herramientas que coincidan con tu búsqueda.</p>
        </div>
      )}

      {playingVideo && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
           <button onClick={() => setPlayingVideo(null)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center gap-2">
             <X size={24} /> <span className="text-sm font-bold uppercase tracking-widest hidden md:inline pr-2">Cerrar Reproductor</span>
           </button>
           <div className="w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative">
             <video src={playingVideo} autoPlay controls className="w-full h-full object-contain">
                Tu navegador no soporta el elemento de video.
             </video>
           </div>
        </div>
      )}
    </div>
  );
}

function FilterBtn({ active, onClick, label, icon }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-1.5 rounded-xl text-[12px] font-bold tracking-tight transition-all",
        active 
          ? "bg-white text-primary shadow-sm" 
          : "text-slate-500 hover:text-slate-800"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
