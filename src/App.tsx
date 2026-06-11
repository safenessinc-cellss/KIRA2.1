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
// ✅ CAMBIA ESTA LÍNEA SEGÚN TU PROYECTO:
import { db } from './lib/firebase'; // <--- AJUSTA ESTA RUTA

// ... resto del código igual

export function FloatingWhatsAppButton() {
  const [whatsappUrl, setWhatsappUrl] = useState('https://chat.whatsapp.com/GpX9cVM0AOXGV6f56Sam6H');

  useEffect(() => {
    // Escuchar cambios en tiempo real desde Firestore
    const communityRef = doc(db, 'settings', 'community');
    const unsubscribe = onSnapshot(communityRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.links && Array.isArray(data.links)) {
          const waLink = data.links.find((link: any) => link.type === 'whatsapp');
          if (waLink?.url) {
            setWhatsappUrl(waLink.url);
          }
        }
      }
    }, (error) => {
      console.error("Error escuchando cambios del enlace de WhatsApp:", error);
    });

    return () => unsubscribe();
  }, []);

  if (!whatsappUrl) return null;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center group"
      title="Únete a nuestra comunidad de WhatsApp"
    >
      <MessageCircle size={28} className="fill-white/20" />
      <span className="absolute right-full mr-3 bg-slate-900 text-white text-xs font-bold py-1.5 px-3 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        Únete a nuestra Comunidad
      </span>
    </a>
  );
}
