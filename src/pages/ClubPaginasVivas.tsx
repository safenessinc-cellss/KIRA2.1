export default function ClubPaginasVivas() {
  return (
    <div className="min-h-screen bg-[#F4F1DE]">
      {/* Header con mensaje de bienvenida */}
      <div className="bg-[#E07A5F] text-white py-12 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          🎉 Club de Páginas Vivas
        </h1>
        <p className="text-lg opacity-90">
          Un espacio para leer, crear y compartir
        </p>
      </div>

      {/* Pestañas de navegación */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 border-b border-[#81B29A] mb-6">
          {['📖 Leer', '🎨 Crear', '💬 Compartir'].map(tab => (
            <button key={tab} className="px-4 py-2 text-[#3D405B] hover:text-[#E07A5F] border-b-2 border-transparent hover:border-[#E07A5F] transition">
              {tab}
            </button>
          ))}
        </div>

        {/* Sección de lectura: capítulos del ebook */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#E07A5F] mb-4">Capítulos</h2>
          <div className="space-y-4">
            {[
              { title: 'Capítulo 1: Nuestros inicios', content: 'Texto del capítulo 1...' },
              { title: 'Capítulo 2: El poder de la comunidad', content: 'Texto del capítulo 2...' },
              { title: 'Capítulo 3: Crear juntos', content: 'Texto del capítulo 3...' }
            ].map(ch => (
              <div key={ch.title} className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-bold text-[#3D405B]">{ch.title}</h3>
                <p className="text-gray-600 mt-2">{ch.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sección de arteterapia */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#81B29A] mb-4">🎨 Arteterapia</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-bold text-[#3D405B]">Pregunta para reflexionar</h3>
              <p className="text-gray-600 mt-2">¿Qué logro de este año te llena de orgullo?</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-bold text-[#3D405B]">Mandala para descargar</h3>
              <p className="text-gray-600 mt-2">🎨 Haz clic para descargar</p>
              <button className="mt-2 bg-[#F2CC8F] px-4 py-2 rounded text-[#3D405B]">Descargar</button>
            </div>
          </div>
        </div>

        {/* Botones de comunidad */}
        <div>
          <h2 className="text-2xl font-bold text-[#E07A5F] mb-4">🤝 Comunidad</h2>
          <div className="flex gap-4 flex-wrap">
            <a href="#" className="bg-[#25D366] text-white px-6 py-3 rounded-lg">📱 WhatsApp</a>
            <a href="#" className="bg-[#0088cc] text-white px-6 py-3 rounded-lg">💬 Telegram</a>
            <a href="#" className="bg-gradient-to-r from-[#f09433] to-[#bc2a8d] text-white px-6 py-3 rounded-lg">📸 Instagram</a>
          </div>
        </div>
      </div>
    </div>
  );
}
