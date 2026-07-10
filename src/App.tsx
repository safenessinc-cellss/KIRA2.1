import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import React, { useState, useEffect, Suspense } from 'react';
import { CoreLayout, ProtectedRoute } from './layouts/CoreLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { ErrorBoundary } from './components/ErrorBoundary';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { ToastProvider } from './hooks/useToast';
import { CartProvider } from './components/CartProvider';
import { Loader2 } from 'lucide-react';
import { PerformanceMonitor } from './components/PerformanceMonitor';

// Performance Optimization: Lazy Loading for Code-Splitting heavy chunks
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Journal = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Journal })));
const EliteLibrary = React.lazy(() => import('./pages/EliteLibrary').then(m => ({ default: m.EliteLibrary })));
const Community = React.lazy(() => import('./pages/Community').then(m => ({ default: m.Community })));
const AdminMonitor = React.lazy(() => import('./pages/Admin').then(m => ({ default: m.AdminMonitor })));
const CoachDashboard = React.lazy(() => import('./pages/Coach').then(m => ({ default: m.CoachDashboard })));
const CoachCourses = React.lazy(() => import('./pages/Coach').then(m => ({ default: m.CoachCourses })));
const CoachHomeworkReview = React.lazy(() => import('./pages/Coach').then(m => ({ default: m.CoachHomeworkReview })));
const CoachCrmAudit = React.lazy(() => import('./pages/Coach').then(m => ({ default: m.CoachCrmAudit })));
const CoachCloudSupport = React.lazy(() => import('./pages/Coach').then(m => ({ default: m.CoachCloudSupport })));
const SessionIntelligence = React.lazy(() => import('./pages/SessionIntelligence'));
const HRDashboard = React.lazy(() => import('./pages/HRDashboard').then(m => ({ default: m.HRDashboard })));
const UserProfile = React.lazy(() => import('./pages/UserProfile').then(m => ({ default: m.UserProfile })));
const Microlearning = React.lazy(() => import('./pages/Microlearning').then(m => ({ default: m.Microlearning })));

// Elegant fallback loading spinner matching KIRA's style guidelines
function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[60vh] py-12">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-kirateal text-primary" size={36} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
          Sincronizando Módulos...
        </p>
      </div>
    </div>
  );
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<any>({ primaryColor: '', secondaryColor: '' });

  useEffect(() => {
    // Only in browser and if db is initialized
    let unsub = () => {};
    try {
      unsub = onSnapshot(doc(db, 'settings', 'website'), (docSnap) => {
        if (docSnap.exists()) {
           setTheme(docSnap.data());
        }
      });
    } catch(e) {
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

export default function App() {
  return (
    <ToastProvider>
      <CartProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route element={<CoreLayout />}>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/microlearning" element={<Microlearning />} />
                    
                    {/* Alumnos */}
                    <Route element={<ProtectedRoute allowedRoles={['alumno']} />}>
                      <Route element={<DashboardLayout title="Mi Aprendizaje" />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/dashboard/journal" element={<Journal />} />
                        <Route path="/dashboard/elite-library" element={<EliteLibrary />} />
                        <Route path="/dashboard/community" element={<Community />} />
                        <Route path="/dashboard/profile" element={<UserProfile />} />
                      </Route>
                    </Route>
      
                    {/* Coaches */}
                    <Route element={<ProtectedRoute allowedRoles={['coach', 'admin']} />}>
                      <Route element={<DashboardLayout title="Panel de Coach" />}>
                        <Route path="/coach" element={<CoachDashboard />} />
                        <Route path="/coach/courses" element={<CoachDashboard />} />
                        <Route path="/coach/session" element={<SessionIntelligence />} />
                        <Route path="/coach/homework" element={<CoachHomeworkReview />} />
                        <Route path="/coach/crm-audit" element={<CoachCrmAudit />} />
                        <Route path="/coach/support" element={<CoachCloudSupport />} />
                        <Route path="/coach/profile" element={<UserProfile />} />
                      </Route>
                    </Route>
      
                    {/* Admins */}
                    <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                      <Route element={<DashboardLayout title="Control total" />}>
                        <Route path="/admin" element={<AdminMonitor />} />
                      </Route>
                    </Route>
      
                    {/* HR B2B */}
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
      </CartProvider>
    </ToastProvider>
  );
}
