// src/layouts/CoreLayout.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AIChat } from '../components/AIChat';
import { ChatWidget } from '../components/ChatWidget';
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
      <footer className="mt-auto py-4 text-center text-[10px] text-slate-500 tracking-wide" aria-label="Créditos de desarrollo">
        Creado por <span className="font-semibold text-slate-600">SAFENESS.INC</span>
      </footer>
      <AIChat />
      <ChatWidget />
    </div>
  );
}

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: string[] }) {
  const { user, role, loading, logout } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;

  // A requested coach role is only a registration request. It never grants
  // access to the coach workspace until an administrator approves the account.
  const coachApprovalRequired = role === 'coach' && user.approvalStatus !== 'approved';
  if (coachApprovalRequired) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <section className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Solicitud de Coach pendiente</h1>
          <p className="mt-2 text-sm text-slate-600">
            Tu cuenta todavía no ha sido aprobada. El portal de Coach estará disponible cuando el equipo de KIRA confirme tu solicitud.
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Cerrar sesión
          </button>
        </section>
      </main>
    );
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
