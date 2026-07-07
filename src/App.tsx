// src/App.tsx - VERSIÓN CORREGIDA (Usando rutas reales)

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import React, { useState, useEffect, Suspense } from 'react';
import { CoreLayout, ProtectedRoute } from './layouts/CoreLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { ErrorBoundary } from './components/ErrorBoundary';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { ToastProvider } from './hooks/useToast';
import { Loader2 } from 'lucide-react';
import { PerformanceMonitor } from './components/PerformanceMonitor';

// ============================================================
// PERFORMANCE OPTIMIZATION: Lazy Loading
// ============================================================

// --- Alumnos ---
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Journal = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Journal })));
const EliteLibrary = React.lazy(() => import('./pages/EliteLibrary').then(m => ({ default: m.EliteLibrary })));
const Community = React.lazy(() => import('./pages/Community').then(m => ({ default: m.Community })));

// --- Coaches (RUTAS CORRECTAS) ---
// CoachDashboard está en ./pages/Coach.tsx (NO en ./pages/coach/Coach)
const CoachDashboard = React.lazy(() => import('./pages/Coach').then(m => ({ default: m.CoachDashboard })));

// Para los módulos nuevos, vamos a usar importación directa desde el mismo archivo Coach.tsx
// O crearlos como componentes separados en la carpeta correcta

// --- Admin ---
const AdminMonitor = React.lazy(() => import('./pages/Admin').then(m => ({ default: m.AdminMonitor })));

// --- HR ---
const HRDashboard = React.lazy(() => import('./pages/HRDashboard').then(m => ({ default: m.HRDashboard })));

// --- Perfil y Microlearning ---
const UserProfile = React.lazy(() => import('./pages/UserProfile').then(m => ({ default: m.UserProfile })));
const Microlearning = React.lazy(() => import('./pages/Microlearning').then(m => ({ default: m.Microlearning })));

// ============================================================
// PAGE LOADER
// ============================================================
function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[60vh] py-12">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-kirateal" size={36} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
          Sincronizando Módulos...
        </p>
      </div>
    </div>
  );
}

// ============================================================
// THEME PROVIDER
// ============================================================
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<any>({ primaryColor: '', secondaryColor: '' });

  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = onSnapshot(doc(db, 'settings', 'website'), (docSnap) => {
        if (docSnap.exists()) {
          setTheme(docSnap.data());
        }
      });
    } catch (e) {
      console.warn("Could not load theme", e);
    }
    return () => unsub();
  }, []);

  useEffect(() => {
    if (theme.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', theme.primaryColor);
    }
    if (theme.secondaryColor) {
      document.documentElement.style.setProperty('--color-secondary', theme.secondaryColor);
    }
  }, [theme.primaryColor, theme.secondaryColor]);

  return <>{children}</>;
}

// ============================================================
// COMPONENTES SIMPLIFICADOS PARA LAS ACCIONES DIRECTAS
// (Mientras se crean los archivos completos)
// ============================================================
function CoachCourses() {
  return (
    <div className="p-8 bg-white rounded-2xl border border-slate-200">
      <h1 className="text-2xl font-bold text-slate-900">Studio de Cursos</h1>
      <p className="text-slate-500 mt-2">Gestiona tus programas educativos.</p>
    </div>
  );
}

function CoachSession() {
  return (
    <div className="p-8 bg-white rounded-2xl border border-slate-200">
      <h1 className="text-2xl font-bold text-slate-900">Sesión Inteligente</h1>
      <p className="text-slate-500 mt-2">Transcripción y análisis con IA.</p>
    </div>
  );
}

function CoachHomeworkReview() {
  return (
    <div className="p-8 bg-white rounded-2xl border border-slate-200">
      <h1 className="text-2xl font-bold text-slate-900">Revisión de Tareas</h1>
      <p className="text-slate-500 mt-2">Feedback de módulos.</p>
    </div>
  );
}

function CoachCrmAudit() {
  return (
    <div className="p-8 bg-white rounded-2xl border border-slate-200">
      <h1 className="text-2xl font-bold text-slate-900">AI Audit CRM</h1>
      <p className="text-slate-500 mt-2">Optimización de embudo.</p>
    </div>
  );
}

function CoachCloudSupport() {
  return (
    <div className="p-8 bg-white rounded-2xl border border-slate-200">
      <h1 className="text-2xl font-bold text-slate-900">Cloud Support</h1>
      <p className="text-slate-500 mt-2">Kira Corp Direct.</p>
    </div>
  );
}

// ============================================================
// APP PRINCIPAL
// ============================================================
export default function App() {
  return (
    <ToastProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* RUTAS PÚBLICAS */}
                <Route element={<CoreLayout />}>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/microlearning" element={<Microlearning />} />

                  {/* RUTAS DE ALUMNOS */}
                  <Route element={<ProtectedRoute allowedRoles={['alumno']} />}>
                    <Route element={<DashboardLayout title="Mi Aprendizaje" />}>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/dashboard/journal" element={<Journal />} />
                      <Route path="/dashboard/elite-library" element={<EliteLibrary />} />
                      <Route path="/dashboard/community" element={<Community />} />
                      <Route path="/dashboard/profile" element={<UserProfile />} />
                    </Route>
                  </Route>

                  {/* RUTAS DE COACHES */}
                  <Route element={<ProtectedRoute allowedRoles={['coach', 'admin']} />}>
                    <Route element={<DashboardLayout title="Panel de Coach" />}>
                      <Route path="/coach" element={<CoachDashboard />} />
                      <Route path="/coach/courses" element={<CoachCourses />} />
                      <Route path="/coach/session" element={<CoachSession />} />
                      <Route path="/coach/homework" element={<CoachHomeworkReview />} />
                      <Route path="/coach/crm-audit" element={<CoachCrmAudit />} />
                      <Route path="/coach/support" element={<CoachCloudSupport />} />
                      <Route path="/coach/profile" element={<UserProfile />} />
                    </Route>
                  </Route>

                  {/* RUTAS DE ADMIN */}
                  <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                    <Route element={<DashboardLayout title="Control total" />}>
                      <Route path="/admin" element={<AdminMonitor />} />
                    </Route>
                  </Route>

                  {/* RUTAS DE HR */}
                  <Route element={<ProtectedRoute allowedRoles={['hr_admin']} />}>
                    <Route element={<DashboardLayout title="Portal Empresa" />}>
                      <Route path="/hr" element={<HRDashboard />} />
                    </Route>
                  </Route>
                </Route>
              </Routes>
              <PerformanceMonitor />
            </Suspense>
          </BrowserRouter>
        </ErrorBoundary>
      </ThemeProvider>
    </ToastProvider>
  );
}
