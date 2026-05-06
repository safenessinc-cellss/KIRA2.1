import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/Brand';
import { LogIn, ArrowRight } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';

export function Login() {
  const { user, role, login } = useAuth();
  const location = useLocation();

  if (user) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'coach') return <Navigate to="/coach" replace />;
    if (role === 'alumno') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-kiragold/10 blur-[120px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-kirateal-light/10 blur-[120px] rounded-full mix-blend-screen"></div>
      </div>

      <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-slate-700 p-10 shadow-2xl relative z-10 flex flex-col items-center text-center">
        <Logo size={80} variant="luxury" />
        
        <h1 className="mt-8 text-2xl font-serif font-black text-white tracking-widest uppercase">
          Acceso Exclusivo
        </h1>
        <p className="mt-3 text-slate-400 text-sm leading-relaxed max-w-[280px]">
          Ingresa a tu espacio seguro dentro del ecosistema de bienestar.
        </p>

        <div className="w-full mt-10 space-y-4">
          <button 
            onClick={() => login('alumno')}
            className="w-full px-6 py-4 rounded-xl bg-kiragold text-slate-900 font-bold tracking-widest uppercase text-[11px] shadow-lg shadow-kiragold/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            <LogIn size={16} /> Continuar con Google
          </button>
          
          <div className="relative flex items-center py-4">
             <div className="flex-grow border-t border-slate-700"></div>
             <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-bold uppercase tracking-widest">O únete como profesional</span>
             <div className="flex-grow border-t border-slate-700"></div>
          </div>

          <button 
            onClick={() => login('coach')}
            className="w-full px-6 py-4 rounded-xl bg-slate-700/50 text-white font-bold tracking-widest uppercase text-[11px] hover:bg-slate-700 transition-all border border-slate-600 hover:border-slate-500 flex items-center justify-center gap-2"
          >
            Postular como Coach <ArrowRight size={16} />
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-8 w-full text-center text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold">
        Avalado por Kira Coach
      </div>
    </div>
  );
}
