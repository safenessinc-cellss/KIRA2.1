import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AIChat } from '../components/AIChat';
import { Loader2 } from 'lucide-react';
import { PushNotificationManager } from '../components/PushNotificationManager';

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
  return <Outlet />;
}
