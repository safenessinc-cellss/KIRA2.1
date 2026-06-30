import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { ProfileForm } from './ProfileForm';
import { SocialConnections } from './SocialConnections';
import { useToast } from '../../hooks/useToast';
import { 
  AlertTriangle, CheckCircle2, Loader2, ExternalLink, RefreshCw 
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ProfileLayoutProps {
  initialProfile: any;
  onSaved?: () => void;
}

export function ProfileLayout({ initialProfile, onSaved }: ProfileLayoutProps) {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    displayName: initialProfile?.displayName || '',
    specialty: initialProfile?.specialty || '',
    specialties: Array.isArray(initialProfile?.specialties) ? initialProfile.specialties : (initialProfile?.specialty ? [initialProfile.specialty] : []),
    bio: initialProfile?.bio || '',
    photoURL: initialProfile?.photoURL || '',
    calendlyUrl: initialProfile?.calendlyUrl || '',
    experienceLevel: initialProfile?.experienceLevel || 'Principiante',
    languages: initialProfile?.languages || 'Español',
    welcomeVideoUrl: initialProfile?.welcomeVideoUrl || '',
    rating: initialProfile?.rating || 5,
    studentCount: initialProfile?.studentCount || 0,
    socialLinks: {
      instagram: initialProfile?.socialLinks?.instagram || '',
      linkedin: initialProfile?.socialLinks?.linkedin || '',
      twitter: initialProfile?.socialLinks?.twitter || ''
    }
  });

  const [mediaItems, setMediaItems] = useState<any[]>(initialProfile?.mediaItems || []);

  useEffect(() => {
    if (initialProfile) {
      setFormData({
        displayName: initialProfile.displayName || '',
        specialty: initialProfile.specialty || '',
        specialties: Array.isArray(initialProfile.specialties) ? initialProfile.specialties : (initialProfile.specialty ? [initialProfile.specialty] : []),
        bio: initialProfile.bio || '',
        photoURL: initialProfile.photoURL || '',
        calendlyUrl: initialProfile.calendlyUrl || '',
        experienceLevel: initialProfile.experienceLevel || 'Principiante',
        languages: initialProfile.languages || 'Español',
        welcomeVideoUrl: initialProfile.welcomeVideoUrl || '',
        rating: initialProfile.rating || 5,
        studentCount: initialProfile.studentCount || 0,
        socialLinks: {
          instagram: initialProfile.socialLinks?.instagram || '',
          linkedin: initialProfile.socialLinks?.linkedin || '',
          twitter: initialProfile.socialLinks?.twitter || ''
        }
      });
      setMediaItems(initialProfile.mediaItems || []);
    }
  }, [initialProfile]);

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/?coach=${user?.uid || ''}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validate = () => {
    const isValidUrl = (str: string) => {
      try {
        const u = new URL(str);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    };
    const photoRegex = /\.(jpeg|jpg|gif|png|webp|svg)((\?.*)?|$)/i;
    const calendlyRegex = /calendly\.com\/[a-zA-Z0-9_\-]+(\/[a-zA-Z0-9_\-]+)?/i;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    const vimeoRegex = /^(https?:\/\/)?(www\.)?(vimeo\.com)\/.+$/;

    if (!formData.displayName.trim()) return "El nombre público es obligatorio.";
    if (formData.specialties.length === 0) return "Debes seleccionar al menos una especialidad profesional.";
    
    const bioText = formData.bio.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
    if (!bioText) return "La biografía es obligatoria.";
    
    if (formData.photoURL && !formData.photoURL.startsWith('data:image/')) {
      if (!isValidUrl(formData.photoURL)) return "La URL de la foto de perfil no es válida.";
    }
    
    if (formData.calendlyUrl) {
      if (!calendlyRegex.test(formData.calendlyUrl)) {
        return "El enlace de Calendly no es válido (ej: calendly.com/tu-usuario).";
      }
    }

    if (formData.welcomeVideoUrl) {
      const isDirectVideo = isValidUrl(formData.welcomeVideoUrl) && 
        (formData.welcomeVideoUrl.match(/\.(mp4|webm|ogg)$/i) || 
         formData.welcomeVideoUrl.includes('firebasestorage.googleapis.com'));
      const isYoutube = youtubeRegex.test(formData.welcomeVideoUrl);
      const isVimeo = vimeoRegex.test(formData.welcomeVideoUrl);

      if (!isDirectVideo && !isYoutube && !isVimeo) {
        return "El video de bienvenida debe ser una URL válida (Directa .mp4, YouTube o Vimeo).";
      }
    }

    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      toastError(`Error: ${validationError}`);
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const payload = {
        ...formData,
        mediaItems,
        updatedAt: new Date()
      };
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, payload);
      
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          title: 'Perfil Sincronizado',
          message: 'Tu perfil académico y portafolio de recursos fueron guardados exitosamente.',
          read: false,
          createdAt: new Date(),
          type: 'system'
        });
      } catch (notifErr) {
        console.warn("Failed to create background notification:", notifErr);
      }

      setSuccess(true);
      toastSuccess("¡Perfil y portafolio de la bóveda actualizados exitosamente!");
      if (onSaved) onSaved();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("[ProfileLayout] Fatal write error:", err);
      let errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Error al guardar el perfil: ${errorMsg}`);
      toastError("Error de permisos o conexión al guardar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {loading && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md">
          <div className="bg-white border border-slate-100 p-8 rounded-3xl flex flex-col items-center gap-4 max-w-sm text-center shadow-2xl animate-in zoom-in-95">
            <Loader2 className="animate-spin text-kirateal" size={40} />
            <h4 className="text-slate-900 font-black uppercase text-sm tracking-widest mt-2">Guardando Cambios</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Registrando perfil y vinculando bóveda en paralelo con Firestore...
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Perfil Público de Coach</h3>
            <p className="text-sm text-slate-500 mt-1">Personaliza tu espacio profesional en el Ecosistema.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={handleShare}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                copied 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {copied ? <CheckCircle2 size={16} /> : <ExternalLink size={16} />}
              {copied ? '¡Copiado!' : 'Compartir Perfil'}
            </button>
            {formData.photoURL && (
              <div className="w-16 h-16 rounded-full border-2 border-kiragold/20 overflow-hidden shadow-inner shrink-0">
                <img referrerPolicy="no-referrer" src={formData.photoURL} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <ProfileForm 
            formData={formData} 
            setFormData={setFormData} 
            mediaItems={mediaItems} 
            setMediaItems={setMediaItems}
            user={user}
          />
          
          <SocialConnections 
            socialLinks={formData.socialLinks} 
            onChange={(links) => setFormData(prev => ({ ...prev, socialLinks: links }))}
          />

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full px-10 py-4 bg-kirateal text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-kirateal/10 hover:shadow-kirateal/20 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
            >
              {loading ? "Sincronizando..." : success ? <><CheckCircle2 size={18}/> ¡Perfil Guardado!</> : "Guardar Perfil Élite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
