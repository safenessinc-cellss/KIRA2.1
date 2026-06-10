import { useEffect, useRef } from 'react';

export default function ClubPaginasVivas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Aquí va el código HTML/JS que generó tu panel Airtable CMS Hub
    // Lo cargamos dinámicamente para no mezclarlo con React
    
    const script = document.createElement('script');
    // El contenido de tu archivo .html va aquí o se carga desde un archivo aparte
    
    if (containerRef.current) {
      // Inyectar el HTML
      containerRef.current.innerHTML = `<!-- TODO EL HTML DE TU APP AQUÍ -->`;
      
      // Luego ejecutar los scripts
      const scripts = containerRef.current.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        newScript.textContent = oldScript.textContent;
        document.body.appendChild(newScript);
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F1DE]">
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
