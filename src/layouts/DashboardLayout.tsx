import { SafeImage } from '../components/SafeImage';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/Brand';
import {
  LogOut, BookOpen, Activity, LayoutDashboard, Users, Palette, BellRing,
  X, Sparkles, ShoppingCart, Menu
} from 'lucide-react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { NotificationCenter } from '../components/Notifications';
import { useCart } from '../components/CartProvider';
import { auth, db } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';

export function DashboardLayout({ title }: { title: string }) {
  const { user, logout, role, loading } = useAuth();
  const { cartCount, setIsCartOpen } = useCart();
  const location = useLocation();
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const emailLower = user?.email?.toLowerCase();
  const rawDisplayName = user?.displayName || '';
  const isSafeness = emailLower === 'safeness.c.a@gmail.com' || rawDisplayName.toLowerCase() === 'safeness' || rawDisplayName.toLowerCase() === 'safeness.c.a';
  const displayProfileName = isSafeness ? 'Kira Coach' : (user?.displayName || 'Usuario');
  const displayProfileInitial = isSafeness ? 'K' : (user?.displayName?.charAt(0).toUpperCase() || 'U');

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (user?.theme) document.documentElement.setAttribute('data-theme', user.theme);
    else document.documentElement.setAttribute('data-theme', 'teal');
  }, [user?.theme]);

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
        if (change.type !== 'added') return;
        const data = change.doc.data();
        const createdAt = data.createdAt?.toDate?.()?.getTime?.();
        if (createdAt && Date.now() - createdAt < 10000) {
          setToast({ title: data.title || 'Notificación', message: data.message || '' });
          window.setTimeout(() => setToast(null), 5000);
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
    admin: [{ to: '/admin', icon: LayoutDashboard, label: 'Command Center' }],
    hr_admin: [{ to: '/hr', icon: Users, label: 'Culture & Health' }],
    coach: [
      { to: '/coach', icon: Activity, label: 'Gestión Académica' },
      { to: '/coach/courses', icon: BookOpen, label: 'Studio de Cursos' },
      { to: '/coach/profile', icon: Users, label: 'Perfil Coach' },
    ],
    alumno: [
      { to: '/dashboard', icon: BookOpen, label: 'Plan Maestro' },
      { to: '/dashboard/elite-library', icon: Sparkles, label: 'Elite Vault' },
      { to: '/dashboard/journal', icon: Activity, label: 'Journaling IA' },
      { to: '/dashboard/community', icon: Users, label: 'Comunidad Estelar' },
      { to: '/dashboard/profile', icon: Users, label: 'Perfil Personal' },
    ],
  };
  const currentLinks = links[role as keyof typeof links] || links.alumno;

  const navigation = (
    <>
      <nav aria-label="Navegación principal" className="flex-1 space-y-1 overflow-y-auto px-3">
        {currentLinks.map((l) => {
          const isActive = l.to === '/coach'
            ? location.pathname === '/coach' && !location.search.includes('tab=courses')
            : l.to === '/coach/courses'
              ? location.pathname === '/coach/courses' || (location.pathname === '/coach' && location.search.includes('tab=courses'))
              : location.pathname === l.to || (location.pathname.startsWith(l.to + '/') && l.to !== '/');
          return (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileNavOpen(false)}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 font-medium'
              )}
            >
              <l.icon size={19} className="shrink-0" />
              <span className="min-w-0 truncate">{l.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4">
        <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tema visual</p>
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'teal', color: 'bg-[#1B4D5D]' },
            { id: 'gold', color: 'bg-[#C5A059]' },
            { id: 'indigo', color: 'bg-indigo-500' },
            { id: 'rose', color: 'bg-rose-500' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => changeTheme(t.id)}
              aria-label={`Cambiar tema a ${t.id}`}
              aria-pressed={t.id === (user?.theme || 'teal')}
              className={cn(
                'h-6 w-6 rounded-full border border-white shadow-sm transition-transform active:scale-95',
                t.id === (user?.theme || 'teal') ? 'scale-110 ring-2 ring-slate-300' : 'hover:scale-110',
                t.color
              )}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 pt-4">
        <div className="mb-4 flex min-w-0 items-center gap-3">
          {user?.photoURL ? (
            <SafeImage src={user.photoURL} alt="Foto de perfil" referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-full object-cover shadow-sm" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {displayProfileInitial}
            </div>
          )}
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-semibold text-slate-700">{displayProfileName}</p>
            {user?.email && <p className="mt-0.5 truncate text-[11px] text-slate-400" title={user.email}>{user.email}</p>}
          </div>
        </div>
        <button onClick={logout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50">
          <LogOut size={17} /> Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-[100dvh] min-h-0 w-full overflow-hidden bg-slate-50">
      {mobileNavOpen && role !== 'admin' && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] md:hidden"
        />
      )}

      {role !== 'admin' && <aside
        id="kira-primary-navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(19rem,86vw)] flex-col border-r border-slate-200 bg-white py-4 shadow-2xl transition-transform duration-200 md:relative md:z-auto md:w-64 md:shrink-0 md:translate-x-0 md:shadow-none',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 pb-7 pt-2">
          <Logo withText size={38} />
          <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Cerrar navegación" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden">
            <X size={20} />
          </button>
        </div>
        {navigation}
      </aside>}

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {(user?.approvalStatus === 'suspended' || user?.approvalStatus === 'pending') && role !== 'admin' && (
          <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-white/95 p-6 text-center backdrop-blur-sm">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-600">
              <Activity size={30} />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-slate-800 sm:text-3xl">
              {user?.approvalStatus === 'suspended' ? 'Servicio suspendido' : 'Cuenta en revisión'}
            </h2>
            <p className="mb-7 max-w-md text-sm leading-relaxed text-slate-500 sm:text-base">
              {user?.approvalStatus === 'suspended'
                ? 'Tu acceso a la plataforma ha sido pausado. Contacta a soporte o a tu administrador si necesitas ayuda.'
                : 'Estamos revisando tu solicitud para habilitar el acceso a la comunidad.'}
            </p>
            <button onClick={logout} className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-800 px-6 py-3 font-bold text-white transition hover:bg-black">
              <LogOut size={18} /> Cerrar sesión
            </button>
          </div>
        )}

        <header className="z-20 flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 sm:px-5 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir menú de navegación"
              aria-expanded={mobileNavOpen}
              aria-controls="kira-primary-navigation"
              className={cn("h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 md:hidden", role === 'admin' ? 'hidden' : 'inline-flex')}
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{title}</p>
              <p className="hidden truncate text-xs text-slate-400 sm:block">Bienvenido, {displayProfileName}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {role === 'coach' && <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">Membresía activa</span>}
            <NotificationCenter />
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Ver carrito, ${cartCount} artículos`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
              id="header-cart-trigger"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-black text-white">{cartCount}</span>}
            </button>
            <button
              type="button"
              onClick={logout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              id="header-logout-btn"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 transition hover:bg-rose-100 sm:w-auto sm:gap-2 sm:px-3"
            >
              <LogOut size={16} />
              <span className="hidden text-xs font-black uppercase tracking-wide sm:inline">Salir</span>
            </button>
          </div>
        </header>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {!user?.emailVerified && !loading && (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-amber-800">Verifica tu correo para asegurar tu cuenta.</div>
              <button onClick={() => auth.currentUser && sendEmailVerification(auth.currentUser)} className="min-h-10 self-start rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-700 sm:self-auto">
                Reenviar
              </button>
            </div>
          )}
          <div className="min-w-0 w-full flex-1">
            <Outlet />
          </div>

          {toast && (
            <div className="fixed right-3 top-20 z-[100] w-[calc(100vw-1.5rem)] max-w-sm cursor-pointer sm:right-6" onClick={() => setToast(null)}>
              <div className="flex items-start gap-3 rounded-xl border-l-4 border-primary bg-white p-4 shadow-2xl ring-1 ring-slate-200">
                <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary"><BellRing size={20} /></div>
                <div className="min-w-0 flex-1">
                  <h4 className="mb-0.5 text-sm font-bold text-slate-800">{toast.title}</h4>
                  <p className="line-clamp-2 text-xs text-slate-500">{toast.message}</p>
                </div>
                <button type="button" aria-label="Descartar notificación" className="shrink-0 text-slate-400 hover:text-slate-600"><X size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
