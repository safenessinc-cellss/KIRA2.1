import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { FaWhatsapp } from 'react-icons/fa';

export function FloatingWhatsAppButton() {
  const [whatsappUrl, setWhatsappUrl] = useState('https://chat.whatsapp.com/GpX9cVM0AOXGV6f56Sam6H');

  useEffect(() => {
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
    });
    return () => unsubscribe();
  }, []);

  if (!whatsappUrl) return null;

  // Función para manejar el clic y forzar apertura externa
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center group cursor-pointer"
      title="Únete a nuestra comunidad de WhatsApp"
    >
      <FaWhatsapp size={28} />
      <span className="absolute right-full mr-3 bg-slate-900 text-white text-xs font-bold py-1.5 px-3 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        Únete a nuestra Comunidad
      </span>
    </button>
  );
}
