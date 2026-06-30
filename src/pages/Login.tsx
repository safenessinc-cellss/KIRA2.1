import React, { useState } from 'react';
import { useAuth, UserRole } from '../hooks/useAuth';
import { Logo } from '../components/Brand';
import { LogIn, ArrowRight, Mail, Lock, User, Sparkles } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useToast } from '../hooks/useToast';

export function Login() {
  const { user, role, login, loginWithEmail, signUpWithEmail } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('alumno');
  const [loading, setLoading] = useState(false);

  if (user) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'coach') return <Navigate to="/coach" replace />;
    if (role === 'alumno') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toastError('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(email, password);
      toastSuccess('¡Bienvenido de vuelta!');
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = 'Ocurrió un error al iniciar sesión.';
      if (err.code === 'auth/user-not-found') {
        friendlyMessage = 'Usuario no encontrado.';
      } else if (err.code === 'auth/wrong-password') {
        friendlyMessage = 'Contraseña incorrecta.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Formato de correo electrónico inválido.';
      } else if (err.code === 'auth/too-many-requests') {
        friendlyMessage = 'Demasiados intentos. Intenta más tarde.';
      }
      toastError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      toastError('Por favor completa todos los campos.');
      return;
    }

    if (password.length < 6) {
      toastError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password, name, signupRole);
      toastSuccess('¡Cuenta registrada exitosamente!');
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = 'Error al registrar la cuenta.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'El correo ya está en uso por otra cuenta.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Formato de correo electrónico inválido.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'La contraseña es demasiado débil.';
      }
      toastError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (requestedRole: UserRole) => {
    setLoading(true);
    try {
      await login(requestedRole);
      toastSuccess('Autenticación con Google exitosa.');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        toastError('Dominio no autorizado en Firebase. Por favor usa inicio de sesión con Correo y Contraseña.');
      } else {
        toastError('Error al iniciar sesión con Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-kiragold/10 blur-[120px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-kirateal-light/10 blur-[120px] rounded-full mix-blend-screen"></div>
      </div>

      <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-slate-700 p-8 md:p-10 shadow-2xl relative z-10 flex flex-col items-center">
        <Logo size={70} variant="luxury" />
        
        <h1 className="mt-6 text-2xl font-serif font-black text-white tracking-widest uppercase text-center">
          Kira Coach
        </h1>
        <p className="mt-2 text-slate-400 text-xs leading-relaxed max-w-[280px] text-center">
          Ingresa a tu espacio seguro dentro del ecosistema de bienestar.
        </p>

        {/* Custom Auth Tabs */}
        <div className="w-full mt-8 grid grid-cols-2 bg-slate-900/60 p-1 rounded-xl border border-slate-700/50">
          <button
            onClick={() => { setActiveTab('login'); }}
            className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'login'
                ? 'bg-kiragold text-slate-900 shadow-md shadow-kiragold/15'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setActiveTab('signup'); }}
            className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'signup'
                ? 'bg-kiragold text-slate-900 shadow-md shadow-kiragold/15'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Tab Forms */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="w-full mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Correo Electrónico</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><Mail size={16} /></span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-kiragold/60 focus:ring-1 focus:ring-kiragold/30 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Contraseña</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><Lock size={16} /></span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-kiragold/60 focus:ring-1 focus:ring-kiragold/30 transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 px-6 py-3.5 rounded-xl bg-kiragold text-slate-900 font-bold tracking-widest uppercase text-[11px] shadow-lg shadow-kiragold/15 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-slate-900 border-t-transparent rounded-full" />
                  Ingresando...
                </span>
              ) : (
                <>
                  <LogIn size={14} /> Ingresar con Correo
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="w-full mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Nombre Completo</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><User size={16} /></span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu Nombre"
                  className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-kiragold/60 focus:ring-1 focus:ring-kiragold/30 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Correo Electrónico</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><Mail size={16} /></span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-kiragold/60 focus:ring-1 focus:ring-kiragold/30 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Contraseña</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><Lock size={16} /></span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 caracteres"
                  className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-kiragold/60 focus:ring-1 focus:ring-kiragold/30 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Tipo de Perfil</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSignupRole('alumno')}
                  className={`py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all border ${
                    signupRole === 'alumno'
                      ? 'bg-kirateal/20 text-kirateal-light border-kirateal/50'
                      : 'bg-slate-900/40 text-slate-400 border-slate-700/50 hover:bg-slate-900/60'
                  }`}
                >
                  Alumno (Estudiante)
                </button>
                <button
                  type="button"
                  onClick={() => setSignupRole('coach')}
                  className={`py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all border ${
                    signupRole === 'coach'
                      ? 'bg-kirateal/20 text-kirateal-light border-kirateal/50'
                      : 'bg-slate-900/40 text-slate-400 border-slate-700/50 hover:bg-slate-900/60'
                  }`}
                >
                  Coach (Profesional)
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 px-6 py-3.5 rounded-xl bg-kiragold text-slate-900 font-bold tracking-widest uppercase text-[11px] shadow-lg shadow-kiragold/15 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-slate-900 border-t-transparent rounded-full" />
                  Registrando...
                </span>
              ) : (
                <>
                  <Sparkles size={14} /> Crear Cuenta Gratuita
                </>
              )}
            </button>
          </form>
        )}

        {/* Elegant Divider */}
        <div className="relative w-full flex items-center py-5">
          <div className="flex-grow border-t border-slate-700/60"></div>
          <span className="flex-shrink-0 mx-4 text-slate-500 text-[9px] font-bold uppercase tracking-widest">O continúa con</span>
          <div className="flex-grow border-t border-slate-700/60"></div>
        </div>

        {/* Social Authentication */}
        <div className="w-full space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => handleGoogleLogin('alumno')}
              disabled={loading}
              className="px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/50 text-white font-bold tracking-wider uppercase text-[9px] hover:bg-slate-900 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <LogIn size={12} className="text-kiragold" /> Alumno Google
            </button>
            <button 
              onClick={() => handleGoogleLogin('coach')}
              disabled={loading}
              className="px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/50 text-white font-bold tracking-wider uppercase text-[9px] hover:bg-slate-900 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              Postular Coach <ArrowRight size={12} className="text-kiragold" />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 text-center leading-normal italic px-2">
            Nota: Google Sign-In requiere que el dominio actual esté autorizado en Firebase. Si recibes error de dominio, utiliza el formulario de Correo arriba.
          </p>
        </div>
      </div>
      
      <div className="absolute bottom-6 w-full text-center text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold">
        Avalado por Kira Coach
      </div>
    </div>
  );
}
