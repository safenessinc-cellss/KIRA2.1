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
<div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4">
  <div className="w-full max-w-md">
    
    {/* LOGO - Arriba del formulario */}
    <div className="text-center mb-8">
      <div className="flex justify-center mb-4">
        <img 
          src="/images/11.png" 
          alt="KIRA Coach" 
          className="h-20 w-auto object-contain drop-shadow-xl"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = 'w-20 h-20 bg-gradient-to-br from-kirateal to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl mx-auto';
            fallback.innerHTML = '<span class="text-white font-black text-3xl">K</span>';
            img.parentElement?.appendChild(fallback);
          }}
        />
      </div>
      <h2 className="text-3xl font-black text-slate-800 tracking-tight">Bienvenido de vuelta</h2>
      <p className="text-slate-500 text-sm mt-2">Inicia sesión para acceder a tu Command Center</p>
    </div>
    
    {/* Tu formulario de login aquí */}
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
      {/* ... campos de email, contraseña, botón ... */}
    </div>
  </div>
</div>
  );
}
