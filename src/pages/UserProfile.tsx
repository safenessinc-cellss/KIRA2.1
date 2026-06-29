import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User, Image as ImageIcon, Instagram, Linkedin, Twitter, Save, Loader2, Upload, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { ImageUpload } from '../components/ImageUpload';

export function UserProfile() {
  const { user } = useAuth();
  const [photoURL, setPhotoURL] = useState(user?.photoURL || user?.photoUrl || '');
  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || '');
  const [socialLinks, setSocialLinks] = useState({
    instagram: user?.socialLinks?.instagram || '',
    linkedin: user?.socialLinks?.linkedin || '',
    twitter: user?.socialLinks?.twitter || '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when user details load asynchronously
  useEffect(() => {
    if (user) {
      setPhotoURL(user.photoURL || user.photoUrl || '');
      setDisplayName(user.displayName || user.name || '');
      setSocialLinks({
        instagram: user.socialLinks?.instagram || '',
        linkedin: user.socialLinks?.linkedin || '',
        twitter: user.socialLinks?.twitter || '',
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName,
        name: displayName,
        photoURL,
        photoUrl: photoURL,
        socialLinks
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving profile', err);
      let errorMsg = err instanceof Error ? err.message : String(err);
      
      try {
        const parsed = JSON.parse(errorMsg);
        if (parsed && parsed.error) {
          errorMsg = parsed.error;
        }
      } catch (e) {
        // Not JSON
      }

      let userFriendlyError = "Error al guardar el perfil. Por favor, verifica tu conexión.";
      if (errorMsg.includes("permission-denied") || errorMsg.toLowerCase().includes("permission") || errorMsg.toLowerCase().includes("insufficient")) {
        userFriendlyError = "Permiso denegado por las reglas de seguridad. Asegúrate de que la foto de perfil no sea excesivamente grande (límite aproximado de 1MB) o usa un enlace estándar.";
      } else {
        userFriendlyError = errorMsg;
      }
      setError(userFriendlyError);
      
      try {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      } catch (silencedError) {
        // Logged, we keep displaying the user-friendly message
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/20">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-kirateal/10 rounded-xl flex items-center justify-center text-kirateal">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Mi Perfil</h2>
            <p className="text-slate-500 text-sm">Gestiona tu identidad y conexiones en Kira.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* Avatar Section */}
          <div className="flex items-center gap-6 p-6 border border-slate-100 rounded-2xl bg-slate-50/50">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-slate-200 shrink-0 border-4 border-white shadow-md">
              {photoURL ? (
                <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                  <User size={32} />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-bold text-slate-700">Foto de Perfil</label>
              <div className="relative">
                <input 
                  type="url" 
                  value={photoURL} 
                  onChange={(e) => setPhotoURL(e.target.value)} 
                  placeholder="URL de la imagen" 
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-kirateal/20"
                />
                <ImageIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">O ingresa un link directo a tu avatar.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre a mostrar</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-kirateal/20"
                required
              />
            </div>

            <div className="pt-4">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                Conexiones Sociales
              </h3>
              
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Instagram size={16} className="text-pink-500" />
                  </div>
                  <input
                    type="text"
                    placeholder="Usuario de Instagram (Ej: kira_coach)"
                    value={socialLinks.instagram}
                    onChange={(e) => setSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
                    className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-kirateal/20"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Linkedin size={16} className="text-blue-600" />
                  </div>
                  <input
                    type="url"
                    placeholder="URL de LinkedIn"
                    value={socialLinks.linkedin}
                    onChange={(e) => setSocialLinks(prev => ({ ...prev, linkedin: e.target.value }))}
                    className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-kirateal/20"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Twitter size={16} className="text-sky-500" />
                  </div>
                  <input
                    type="text"
                    placeholder="Usuario de Twitter / X"
                    value={socialLinks.twitter}
                    onChange={(e) => setSocialLinks(prev => ({ ...prev, twitter: e.target.value }))}
                    className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-kirateal/20"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            {success ? (
              <span className="text-emerald-500 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-lg flex items-center gap-2">
                ¡Perfil actualizado!
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
