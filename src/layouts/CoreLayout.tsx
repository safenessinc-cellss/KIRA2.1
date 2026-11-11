// src/layouts/CoreLayout.tsx
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AIChat } from '../components/AIChat';
import { ChatWidget } from '../components/ChatWidget'; // ✅ IMPORTAR
import { Loader2 } from 'lucide-react';
import { PushNotificationManager } from '../components/PushNotificationManager';
import { CookieConsent } from '../components/CookieConsent';

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
      <footer className="mt-auto border-t border-slate-200 bg-white px-4 py-5 text-center text-[11px] text-slate-500" aria-label="Información legal y créditos">
        <nav className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-2" aria-label="Enlaces legales">
          <a href="/legal/privacy" className="hover:text-teal-700">Privacidad</a>
          <a href="/legal/cookies" className="hover:text-teal-700">Cookies</a>
          <a href="/legal/terms" className="hover:text-teal-700">Términos</a>
          <a href="/legal/copyright" className="hover:text-teal-700">Derechos de autor</a>
          <a href="/legal/data-rights" className="hover:text-teal-700">Derechos de datos</a>
          <button type="button" onClick={() => window.dispatchEvent(new Event("kira:open-cookie-settings"))} className="hover:text-teal-700">Configurar cookies</button>
        </nav>
        <p>© 2026 SAFENESS.INC · KIRA Coach. Todos los derechos reservados.</p>
        <p className="mt-1">La identificación jurídica del controlador y el canal formal de privacidad deben completarse antes de la publicación definitiva.</p>
      </footer>
      <CookieConsent />
      <AIChat />
      {/* ✅ CHAT WIDGET MONTADO AQUÍ */}
      <ChatWidget />
    </div>
  );
}

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: string[] }) {
  const { user, role, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  
  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
