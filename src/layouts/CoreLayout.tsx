// src/layouts/CoreLayout.tsx
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AIChat } from '../components/AIChat';
import { ChatWidget } from '../components/ChatWidget'; // ✅ IMPORTAR
import { Loader2 } from 'lucide-react';
import { PushNotificationManager } from '../components/PushNotificationManager';

export function CoreLayout() {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const isPlatformOwner = user?.email?.toLowerCase() === 'safeness.c.a@gmail.com' && user?.emailVerified === true && role === 'admin';
    if (isPlatformOwner && (location.pathname === '/' || location.pathname === '/login')) {
      navigate('/admin', { replace: true });
    }
  }, [user?.email, user?.emailVerified, role, location.pathname, navigate]);

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
      <footer className="mt-auto py-4 text-center text-[10px] text-slate-500 tracking-wide" aria-label="Créditos de desarrollo">
        Creado por <span className="font-semibold text-slate-600">SAFENESS.INC</span>
      </footer>
      <AIChat />
      {/* ✅ CHAT WIDGET MONTADO AQUÍ */}
      <ChatWidget />
    </div>
  );
}

export function ProtectedRoute({ allowedRoles, role: requiredRole }: { allowedRoles?: string[]; role?: string }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const permittedRoles = requiredRole ? [requiredRole] : allowedRoles;
  const roleHome: Record<string, string> = {
    admin: '/admin',
    coach: '/coach',
    hr_admin: '/hr',
    company_admin: '/hr',
    company_member: '/hr',
    alumno: '/dashboard',
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        <span className="sr-only">Verificando permisos…</span>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  if (permittedRoles && (!role || !permittedRoles.includes(role))) {
    return <Navigate to={roleHome[role || ''] || '/'} replace />;
  }

  return <Outlet />;
}
