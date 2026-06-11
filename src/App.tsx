import { BrowserRouter, Routes, Route } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { CoreLayout, ProtectedRoute } from './layouts/CoreLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Dashboard, Journal } from './pages/Dashboard';
import { EliteLibrary } from './pages/EliteLibrary';
import { Community } from './pages/Community';
import { AdminMonitor } from './pages/Admin';
import { CoachDashboard, CoachCourses } from './pages/Coach';
import SessionIntelligence from './pages/SessionIntelligence';
import { HRDashboard } from './pages/HRDashboard';
import { UserProfile } from './pages/UserProfile';
import { Microlearning } from './pages/Microlearning';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FloatingWhatsAppButton } from './components/FloatingWhatsAppButton';
import { doc, onSnapshot } from 'firebase/firestore';
// ✅ CORREGIDO - RUTA CORRECTA
import { db } from './firebase';

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
    <ThemeProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route element={<CoreLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/microlearning" element={<Microlearning />} />
              
              <Route element={<ProtectedRoute allowedRoles={['alumno']} />}>
                <Route element={<DashboardLayout title="Mi Aprendizaje" />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/dashboard/journal" element={<Journal />} />
                  <Route path="/dashboard/elite-library" element={<EliteLibrary />} />
                  <Route path="/dashboard/community" element={<Community />} />
                  <Route path="/dashboard/profile" element={<UserProfile />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['coach']} />}>
                <Route element={<DashboardLayout title="Panel de Coach" />}>
                  <Route path="/coach" element={<CoachDashboard />} />
                  <Route path="/coach/courses" element={<CoachCourses />} />
                  <Route path="/coach/session" element={<SessionIntelligence />} />
                  <Route path="/coach/profile" element={<UserProfile />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route element={<DashboardLayout title="Control total" />}>
                  <Route path="/admin" element={<AdminMonitor />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['hr_admin']} />}>
                <Route element={<DashboardLayout title="Portal Empresa" />}>
                  <Route path="/hr" element={<HRDashboard />} />
                </Route>
              </Route>

            </Route>
          </Routes>
          {/* Botón flotante de WhatsApp - aparece en todas las páginas */}
          <FloatingWhatsAppButton />
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
