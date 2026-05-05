import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/Brand';
import { LogOut, BookOpen, Activity, LayoutDashboard, Users, Palette, BellRing, X, Sparkles } from 'lucide-react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { ChatWidget } from '../components/Chat';
import { NotificationCenter } from '../components/Notifications';
import { auth, db } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';

export function DashboardLayout({ title }: { title: string }) {
  const { user, logout, role, loading } = useAuth();
  const location = useLocation();
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (user?.theme) {
      document.documentElement.setAttribute('data-theme', user.theme);
    } else {
      document.documentElement.setAttribute('data-theme', 'teal');
    }
  }, [user?.theme]);

  // Real-time Push Notification Simulation (Toast)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Only show toast if it's very recent (last 10 seconds) to avoid historical toasts
          const isRecent = (new Date().getTime() - data.createdAt.toDate().getTime()) < 10000;
          if (isRecent) {
             setToast({ title: data.title, message: data.message });
             setTimeout(() => setToast(null), 5000);
          }
        }
      });
    });
    return () => unsub();
  }, [user]);

  const changeTheme = async (theme: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { theme });
    } catch (e) {
      console.error('Failed to update theme:', e);
    }
  };

  const links = {
    admin: [
      { to: "/admin", icon: LayoutDashboard, label: "Command Center" },
    ],
    hr_admin: [
      { to: "/hr", icon: Users, label: "Culture & Health" },
    ],
    coach: [
      { to: "/coach", icon: Activity, label: "Gestión Académica" },
      { to: "/coach/courses", icon: BookOpen, label: "Studio de Cursos" },
      { to: "/coach/profile", icon: Users, label: "Perfil Coach" },
    ],
    alumno: [
      { to: "/dashboard", icon: BookOpen, label: "Plan Maestro" },
      { to: "/dashboard/elite-library", icon: Sparkles, label: "Elite Vault" },
      { to: "/dashboard/journal", icon: Activity, label: "Journaling IA" },
      { to: "/dashboard/profile", icon: Users, label: "Perfil Personal" },
    ]
  };

  const currentLinks = links[role as keyof typeof links] || links.alumno;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col py-6">
        <div className="px-6 pb-10 flex items-center gap-2">
          <Logo withText size={40} />
        </div>
        
        <nav className="flex-1 space-y-1">
          {currentLinks.map((l) => {
            const isActive = location.pathname === l.to || (location.pathname.startsWith(l.to + '/') && l.to !== '/');
            return (
              <Link 
                key={l.to} 
                to={l.to}
                className={cn(
                  "flex items-center gap-3 px-6 py-3 text-sm transition-all duration-200 cursor-pointer border-r-[4px]",
                  isActive 
                    ? "bg-primary/10 text-primary border-primary font-bold shadow-[inset_-2px_0_10px_rgba(0,0,0,0.02)]" 
                    : "text-slate-500 border-transparent hover:text-slate-900 hover:bg-slate-50 font-medium"
                )}
              >
                <l.icon size={isActive ? 20 : 18} className={cn("transition-colors", isActive && "text-primary")} />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 mb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Tema Visual</p>
          <div className="flex gap-2">
            {[
              { id: 'teal', color: 'bg-[#1B4D5D]' }, 
              { id: 'gold', color: 'bg-[#C5A059]' }, 
              { id: 'indigo', color: 'bg-indigo-500' }, 
              { id: 'rose', color: 'bg-rose-500' }
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => changeTheme(t.id)}
                className={cn(
                  "w-5 h-5 rounded-full border border-white shadow-sm transition-transform active:scale-95",
                  t.id === (user?.theme || 'teal') ? "scale-125 ring-2 ring-slate-200" : "hover:scale-110",
                  t.color
                )}
                title={t.id}
              />
            ))}
          </div>
        </div>

        <div className="mt-auto px-6 pt-6">
          <div className="flex items-center gap-3 mb-4">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="avatar" 
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full shadow-sm" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="text-sm truncate">
              <p className="font-semibold text-slate-600 truncate">{user?.displayName || 'Usuario'}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-3 py-3 text-sm font-medium text-red-500 hover:text-red-600 transition"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {(user?.approvalStatus === 'suspended' || user?.approvalStatus === 'pending') && role !== 'admin' && (
          <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
             <div className="w-20 h-20 bg-amber-100 rounded-full flex flex-col items-center justify-center text-amber-600 mb-6 drop-shadow-md border border-amber-200">
                {user?.approvalStatus === 'suspended' ? <Activity size={32} /> : <Activity size={32} />}
             </div>
             <h2 className="text-3xl font-serif font-bold text-slate-800 mb-4">
                {user?.approvalStatus === 'suspended' ? 'Servicio Suspendido' : 'Cuenta en Revisión'}
             </h2>
             <p className="max-w-md text-slate-500 text-lg leading-relaxed mb-8">
                {user?.approvalStatus === 'suspended' 
                  ? 'Tu acceso a la plataforma ha sido pausado. Si esto es un error o necesitas regularizar tu situación administrativa, por favor contacta a soporte o a tu administrador.'
                  : 'Nuestros curadores están revisando tu solicitud. Queremos asegurarnos de que toda la comunidad comparta nuestra filosofía de crecimiento conectada y segura.'}
             </p>
             <button 
                onClick={logout}
                className="bg-slate-800 text-white font-bold px-8 py-3 rounded-full hover:bg-black transition-colors flex items-center gap-2 drop-shadow-lg"
             >
                <LogOut size={18} /> Cerrar Sesión
             </button>
          </div>
        )}

        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <div className="font-semibold text-slate-500">Bienvenido, {role === 'admin' ? 'Super Admin' : user?.displayName}</div>
          <div className="flex items-center gap-4">
            <NotificationCenter />
            {role === 'coach' && (
              <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full font-semibold">
                Membresía Activa
              </span>
            )}
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
               <Palette size={16} />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8 flex flex-col gap-6 relative">
          {!user?.emailVerified && !loading && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between mb-2">
              <div className="text-sm text-amber-800 font-medium">Verifica tu correo para asegurar tu cuenta.</div>
              <button 
                onClick={() => auth.currentUser && sendEmailVerification(auth.currentUser)}
                className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg font-bold"
              >
                Reenviar
              </button>
            </div>
          )}
          <Outlet />
          <ChatWidget />

          {/* Real-time Toast Notification */}
          {toast && (
            <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-right-10 fade-in cursor-pointer" onClick={() => setToast(null)}>
              <div className="bg-white border-l-4 border-primary rounded-xl shadow-2xl p-4 flex items-start gap-4 ring-1 ring-slate-200 min-w-[300px] max-w-sm">
                <div className="bg-primary/10 p-2 rounded-lg text-primary shrink-0">
                  <BellRing size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-800 mb-0.5">{toast.title}</h4>
                  <p className="text-[12px] text-slate-500 line-clamp-2">{toast.message}</p>
                </div>
                <button className="text-slate-300 hover:text-slate-500 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
