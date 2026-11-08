import React, { useState } from 'react';
import { useAuth, UserRole } from '../hooks/useAuth';
import { Logo } from '../components/Brand';
import { ArrowRight, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';

export function Login() {
  const { user, role, login } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [requestedRole, setRequestedRole] = useState<UserRole>('alumno');
  const [loading, setLoading] = useState(false);

  if (user) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'coach') return <Navigate to="/coach" replace />;
    if (role === 'hr_admin' || role === 'company_admin' || role === 'company_member') return <Navigate to="/hr" replace />;
    if (role === 'alumno') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await login(requestedRole);
      toastSuccess('Solicitud de acceso con Google completada.');
    } catch (err: any) {
      console.error('Google authentication failed:', err);
      if (err.code === 'auth/unauthorized-domain') {
        toastError('Este dominio todavía no está autorizado en Firebase Authentication. Contacta al administrador de KIRA.');
      } else if (err.code === 'auth/popup-blocked') {
        toastError('El navegador bloqueó la ventana de Google. Permite las ventanas emergentes y vuelve a intentarlo.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        toastError('El inicio de sesión fue cancelado.');
      } else {
        toastError('No se pudo iniciar sesión con Google. Comprueba tu conexión e inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-kiragold/10 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-kirateal-light/15 blur-[100px]" />
      </div>
      <section className="relative z-10 w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl sm:p-9">
        <div className="flex flex-col items-center text-center">
          <Logo size={68} variant="luxury" />
          <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-kiragold">KIRA Coach</p>
          <h1 className="mt-2 text-2xl font-black text-white">Tu espacio de desarrollo</h1>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">Accede de forma segura a tu aprendizaje, coaching y bienestar.</p>
        </div>

        <div className="mt-8">
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Tipo de acceso para nuevas cuentas</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={requestedRole === 'alumno'} onClick={() => setRequestedRole('alumno')} className={`min-h-12 rounded-xl border px-3 text-sm font-bold transition ${requestedRole === 'alumno' ? 'border-kiragold bg-kiragold/10 text-kiragold' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'}`}>Alumno</button>
            <button type="button" aria-pressed={requestedRole === 'coach'} onClick={() => setRequestedRole('coach')} className={`min-h-12 rounded-xl border px-3 text-sm font-bold transition ${requestedRole === 'coach' ? 'border-kiragold bg-kiragold/10 text-kiragold' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'}`}>Coach</button>
          </div>
          <p className="mt-2 text-center text-[11px] leading-5 text-slate-500">Las cuentas nuevas quedan sujetas a aprobación. Los permisos de administración se asignan desde KIRA.</p>
        </div>

        <button type="button" onClick={handleGoogleLogin} disabled={loading} className="mt-7 flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-900 shadow-lg transition hover:bg-slate-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <Loader2 size={19} className="animate-spin" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-sm font-black text-blue-600">G</span>}
          {loading ? 'Conectando con Google…' : 'Continuar con Google'}
          {!loading && <ArrowRight size={17} />}
        </button>

        <div className="mt-6 flex items-start gap-2 rounded-xl border border-slate-700 bg-slate-800/70 p-3 text-xs leading-5 text-slate-400">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-kirateal-light" />
          <p>Google es el único método de acceso disponible en esta pantalla. KIRA nunca te pedirá tu contraseña de Google.</p>
        </div>
        <p className="mt-7 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Creado por SAFENESS.INC · KIRA Coach</p>
      </section>
      <Sparkles className="absolute bottom-6 left-6 text-kiragold/20" size={28} aria-hidden="true" />
    </main>
  );
}
