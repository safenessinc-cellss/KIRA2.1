import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/Brand';
import { LogOut, BookOpen, Activity, LayoutDashboard, Users, Palette, BellRing, X, Sparkles, ShoppingCart, Mic, ClipboardCheck, ShieldCheck, Headset, HeartPulse } from 'lucide-react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { NotificationCenter } from '../components/Notifications';
import { ChatWidget } from '../components/Chat';
import { useCart } from '../components/CartProvider';
import { auth, db } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';

export function DashboardLayout({ title }: { title: string }) {
  const { user, logout, role, loading } = useAuth();
  const { cartCount, setIsCartOpen } = useCart();
  const location = useLocation();
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);

  const emailLower = user?.email?.toLowerCase();
  const rawDisplayName = user?.displayName || '';
  const isSafeness = emailLower === 'safeness.c.a@gmail.com' || rawDisplayName.toLowerCase() === 'safeness' || rawDisplayName.toLowerCase() === 'safeness.c.a';
  const displayProfileName = isSafeness ? 'Kira Coach' : (user?.displayName || 'Usuario');
  const displayProfileInitial = isSafeness ? 'K' : (user?.displayName?.charAt(0).toUpperCase() || 'U');

  useEffect(() => {
    if (user?.theme) document.documentElement.setAttribute('data-theme', user.theme);
    else document.documentElement.setAttribute('data-theme', 'teal');
  }, [user?.theme]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), where('read', '==', false), orderBy('createdAt', 'desc'), limit(1));
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
    try { await updateDoc(doc(db, 'users', user.uid), { theme }); }
    catch (error) { console.error('Failed to update theme:', error); }
  };

  const links = {
    admin: [{ to: '/admin', icon: LayoutDashboard, label: 'Administración KIRA', detail: 'Control, seguridad y gestión global' }],
    hr_admin: [{ to: '/hr', icon: Users, label: 'Bienestar corporativo', detail: 'Personas y organización' }],
    company_admin: [{ to: '/hr', icon: Users, label: 'Portal empresarial', detail: 'Organización, licencias e indicadores' }],
    coach: [
      { to: '/coach', icon: Activity, label: 'Gestión académica', detail: 'Resumen, alumnos y actividad' },
      { to: '/coach/courses', icon: BookOpen, label: 'Studio de cursos', detail: 'Cursos, contenidos y programas' },
      { to: '/coach/session', icon: Mic, label: 'Session Intelligence', detail: 'Sesiones, transcripción y análisis' },
      { to: '/coach/homework', icon: ClipboardCheck, label: 'Revisión de tareas', detail: 'Seguimiento y feedback de alumnos' },
      { to: '/coach/crm-audit', icon: ShieldCheck, label: 'Auditoría CRM', detail: 'Trazabilidad y actividad de clientes' },
      { to: '/coach/support', icon: Headset, label: 'Soporte', detail: 'Ayuda y acompañamiento' },
      { to: '/coach/profile', icon: Users, label: 'Perfil profesional', detail: 'Datos y presencia del coach' },
    ],
    alumno: [
      { to: '/dashboard', icon: BookOpen, label: 'Mi aprendizaje', detail: 'Plan de aprendizaje y progreso' },
      { to: '/dashboard/homework', icon: ClipboardCheck, label: 'Mis actividades', detail: 'Entregas y feedback del coach' },
      { to: '/dashboard/check-in', icon: HeartPulse, label: 'Check-in diario', detail: 'Energía y claridad personal' },
      { to: '/dashboard/elite-library', icon: Sparkles, label: 'Biblioteca', detail: 'Recursos y contenidos exclusivos' },
      { to: '/dashboard/journal', icon: Activity, label: 'Diario inteligente', detail: 'Reflexión y seguimiento personal' },
      { to: '/dashboard/community', icon: Users, label: 'Comunidad', detail: 'Conexión y participación' },
      { to: '/dashboard/profile', icon: Palette, label: 'Mi perfil', detail: 'Preferencias y datos personales' },
    ],
  };
  const currentLinks = links[role as keyof typeof links] || links.alumno;
  const isActive = (path: string) => path === '/coach/support'
    ? location.pathname === '/coach' && location.search.includes('tab=support')
    : path === '/coach'
      ? location.pathname === '/coach' && !location.search.includes('tab=courses') && !location.search.includes('tab=support')
      : path === '/coach/courses'
        ? location.pathname === '/coach/courses' || (location.pathname === '/coach' && location.search.includes('tab=courses'))
        : location.pathname === path || (location.pathname.startsWith(path + '/') && path !== '/');

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-slate-50 text-slate-900">
      {(user?.approvalStatus === 'suspended' || user?.approvalStatus === 'pending') && role !== 'admin' && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-white/95 p-6 text-center backdrop-blur-sm">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-600"><Activity size={30} /></div>
          <h2 className="mb-3 text-2xl font-bold text-slate-800">{user?.approvalStatus === 'suspended' ? 'Servicio suspendido' : 'Cuenta en revisión'}</h2>
          <p className="mb-7 max-w-md text-sm leading-relaxed text-slate-500">{user?.approvalStatus === 'suspended' ? 'Tu acceso a la plataforma ha sido pausado. Contacta a soporte o a tu administrador si necesitas ayuda.' : 'Estamos revisando tu solicitud para habilitar el acceso a la comunidad.'}</p>
          <button onClick={logout} className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-800 px-6 py-3 font-bold text-white"><LogOut size={18} /> Cerrar sesión</button>
        </div>
      )}

      <header className="sticky top-0 z-30 flex min-h-[4.25rem] shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link to={role === 'admin' ? '/admin' : role === 'coach' ? '/coach' : (role === 'hr_admin' || role === 'company_admin') ? '/hr' : '/dashboard'} aria-label="Ir al inicio" className="shrink-0"><Logo size={36} /></Link>
          <div className="min-w-0 border-l border-slate-200 pl-3">
            <p className="truncate text-sm font-bold text-slate-800">{title}</p>
            <p className="hidden truncate text-xs text-slate-400 sm:block">Bienvenido, {displayProfileName}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {role === 'coach' && user?.membershipStatus === 'active' && (!user?.membershipExpiresAt || new Date(user.membershipExpiresAt?.toDate ? user.membershipExpiresAt.toDate() : user.membershipExpiresAt).getTime() > Date.now()) && <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">Membresía activa</span>}
          <NotificationCenter />
          <button type="button" onClick={() => setIsCartOpen(true)} aria-label={`Ver carrito, ${cartCount} artículos`} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"><ShoppingCart size={18} />{cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-black text-white">{cartCount}</span>}</button>
          <div className="hidden items-center gap-2 sm:flex">
            {user?.photoURL ? <img src={user.photoURL} alt="Foto de perfil" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{displayProfileInitial}</span>}
            <span className="max-w-36 truncate text-xs font-semibold text-slate-600">{displayProfileName}</span>
          </div>
          <button type="button" onClick={logout} aria-label="Cerrar sesión" className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 sm:w-auto sm:gap-2 sm:px-3"><LogOut size={16} /><span className="hidden text-xs font-bold sm:inline">Salir</span></button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-stretch lg:gap-6 lg:px-8">
        {role !== 'admin' && <section aria-label="Módulos principales" className="w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-[5.25rem] lg:w-64 lg:self-start">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Espacio de trabajo</p><h2 className="mt-1 text-base font-bold text-slate-800">Tus módulos</h2></div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Apariencia</span>
              {[
                { id: 'teal', color: 'bg-[#1B4D5D]' }, { id: 'gold', color: 'bg-[#C5A059]' },
                { id: 'indigo', color: 'bg-indigo-500' }, { id: 'rose', color: 'bg-rose-500' },
              ].map((theme) => <button key={theme.id} type="button" onClick={() => changeTheme(theme.id)} aria-label={`Tema ${theme.id}`} aria-pressed={theme.id === (user?.theme || 'teal')} className={cn('h-5 w-5 rounded-full border border-white shadow-sm ring-offset-2', theme.color, theme.id === (user?.theme || 'teal') && 'ring-2 ring-slate-300')} />)}
            </div>
          </div>
          <nav aria-label="Navegación de módulos" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-col xl:grid-cols-1">
            {currentLinks.map((item) => {
              const active = isActive(item.to);
              return <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} className={cn('group flex min-h-24 min-w-0 flex-col items-start gap-2 rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-4 lg:min-h-16 lg:flex-row lg:items-center lg:gap-3 lg:hover:translate-y-0', active ? 'border-primary/40 bg-primary/[0.06] shadow-sm' : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white')}>
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', active ? 'bg-primary text-white' : 'bg-white text-slate-500 shadow-sm')}><item.icon size={19} /></span>
                <span className="min-w-0"><span className={cn('block truncate text-xs font-bold sm:text-sm', active ? 'text-primary' : 'text-slate-800')}>{item.label}</span><span className="mt-1 hidden text-xs leading-4 text-slate-500 sm:block">{item.detail}</span></span>
              </Link>;
            })}
          </nav>
        </section>}

        <div className="min-w-0 w-full flex-1 lg:w-0 lg:self-stretch">
          {!user?.emailVerified && !loading && <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="text-sm font-medium text-amber-800">Verifica tu correo para asegurar tu cuenta.</div><button onClick={() => auth.currentUser && sendEmailVerification(auth.currentUser)} className="min-h-10 self-start rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 sm:self-auto">Reenviar</button></div>}
          <main className="min-w-0 w-full flex-1"><Outlet /></main>
        </div>

        {toast && <div role="status" className="fixed right-3 top-20 z-[100] w-[calc(100vw-1.5rem)] max-w-sm cursor-pointer sm:right-6" onClick={() => setToast(null)}><div className="flex items-start gap-3 rounded-xl border-l-4 border-primary bg-white p-4 shadow-2xl ring-1 ring-slate-200"><div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary"><BellRing size={20} /></div><div className="min-w-0 flex-1"><h4 className="mb-0.5 text-sm font-bold text-slate-800">{toast.title}</h4><p className="line-clamp-2 text-xs text-slate-500">{toast.message}</p></div><button type="button" aria-label="Descartar notificación" className="shrink-0 text-slate-400 hover:text-slate-600" onClick={(event) => { event.stopPropagation(); setToast(null); }}><X size={14} /></button></div></div>}
        {user && (role === 'alumno' || (role === 'coach' && user.membershipStatus === 'active' && (!user.membershipExpiresAt || new Date(user.membershipExpiresAt?.toDate ? user.membershipExpiresAt.toDate() : user.membershipExpiresAt).getTime() > Date.now()))) && <ChatWidget />}
      </div>
    </div>
  );
}
