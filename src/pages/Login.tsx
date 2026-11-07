import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/Brand';
import { Chrome, ShieldCheck, Sparkles } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';

export function Login() {
  const { user, role, login } = useAuth();
  const { error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  if (user) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'coach') return <Navigate to="/coach" replace />;
    if (role === 'alumno') return <Navigate to="/dashboard" replace />;
  }

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await login('alumno');
    } catch (err: any) {
      console.error('Google authentication failed:', err);
      const messages: Record<string, string> = {
        'auth/unauthorized-domain': 'Este dominio aún no está autorizado en Firebase Authentication. Contacta al administrador.',
        'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.',
        'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de completar el acceso.',
        'auth/network-request-failed': 'No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.'
      };
      toastError(messages[err?.code] || 'No fue posible iniciar sesión con Google. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.07),transparent_55%)]" />
      </div>

      <section className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.07] p-7 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-10">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-2xl border border-white/10 bg-white/95 p-3 shadow-lg">
            <Logo size={68} variant="luxury" />
          </div>
          <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.32em] text-teal-300">Ecosistema de bienestar</p>
          <h1 className="mt-2 font-serif text-3xl font-black tracking-[0.12em] text-white">KIRA COACH</h1>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-300">
            Tu espacio personal de bienestar, aprendizaje y acompañamiento profesional.
          </p>
        </div>

        <div className="mt-9 rounded-2xl border border-white/10 bg-slate-950/40 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-300/10 text-teal-200"><ShieldCheck size={20}/></span>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Acceso seguro con Google</p>
              <p className="mt-0.5 text-xs text-slate-400">No necesitas crear otra contraseña</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-slate-800 shadow-lg transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-teal-300/30 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            ) : (
              <Chrome size={20} className="text-slate-700" />
            )}
            {loading ? 'Conectando con Google…' : 'Continuar con Google'}
          </button>
          <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
            Al continuar, Google verificará tu identidad. El acceso a los módulos dependerá de tu perfil y de los permisos aprobados.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Sparkles size={13} className="text-amber-300" />
          <span>Un espacio seguro para tu evolución</span>
        </div>
      </section>

      <footer className="absolute bottom-5 left-0 right-0 text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
        Creado por SAFENESS.INC
      </footer>
    </main>
  );
}
