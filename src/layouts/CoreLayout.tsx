import { Navigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AIChat } from '../components/AIChat';
import { Loader2, BookOpen } from 'lucide-react';
import { PushNotificationManager } from '../components/PushNotificationManager';

// Componente de navegación global
function GlobalNav() {
  const { user } = useAuth();
  
  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="font-bold text-xl text-[#E07A5F]">KIRA</span>
            <span className="text-xs text-gray-400">| coach</span>
          </Link>
          
          {/* Enlaces principales */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link 
              to="/club" 
              className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-[#E07A5F] transition px-2 sm:px-3 py-2 rounded-lg hover:bg-[#F4F1DE]"
            >
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">Club de Páginas Vivas</span>
            </Link>
            
            {!user ? (
              <Link 
                to="/login" 
                className="bg-[#E07A5F] text-white px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base hover:bg-[#c55a3e] transition"
              >
                Iniciar Sesión
              </Link>
            ) : (
              <Link 
                to="/dashboard" 
                className="text-gray-600 hover:text-[#E07A5F] transition text-sm sm:text-base"
              >
                Mi Cuenta
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export function CoreLayout() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <PushNotificationManager />
      <GlobalNav />
      <Outlet />
      <AIChat />
    </div>
  );
}

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: string[] }) {
  const { user, role, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  
  if (role !== 'admin' && (user.approvalStatus === 'pending' || user.approvalStatus === 'rejected')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-8 text-center">
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 border border-amber-500/20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
        <h1 className="text-2xl font-serif font-black text-white tracking-widest uppercase mb-4">
          Acceso en Espera
        </h1>
        <p className="max-w-md text-slate-400 leading-relaxed mb-8">
          {user.approvalStatus === 'pending' 
            ? "Tu cuenta está siendo verificada por nuestro equipo de seguridad Élite. Este proceso suele tardar menos de 24 horas."
            : "Tu solicitud de acceso ha sido rechazada. Si crees que esto es un error, por favor contacta a soporte."}
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-8 py-3 bg-white text-slate-900 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-100 transition-all"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
