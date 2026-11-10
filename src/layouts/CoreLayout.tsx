// src/layouts/CoreLayout.tsx
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AIChat } from '../components/AIChat';
import { ChatWidget } from '../components/ChatWidget'; // ✅ IMPORTAR
import { Loader2 } from 'lucide-react';
import { PushNotificationManager } from '../components/PushNotificationManager';


function DemoModeNotice() {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    let active = true;
    fetch('/api/health', { headers: { Accept: 'application/json' } })
      .then(response => response.ok ? response.json() : null)
      .then(payload => { if (active && payload && (payload.mode === 'demo' || payload.readOnly === true)) setDemo(true); })
      .catch(() => { /* Health status unavailable: do not infer demo mode. */ });
    return () => { active = false; };
  }, []);
  if (!demo) return null;
  return <div role="status" className="sticky top-0 z-[80] flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-900"><span className="inline-flex h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />MODO DEMOSTRACIÓN · Interfaz disponible; las operaciones reales, pagos y emisión de certificados están desactivados.</div>;
}

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
      <DemoModeNotice />
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

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: string[] }) {
  const { user, role, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  
  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
