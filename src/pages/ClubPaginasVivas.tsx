export default function ClubPaginasVivas() {
  return (
    <div className="min-h-screen bg-[#F4F1DE] p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-[#E07A5F] mb-4">
          📚 Club de Páginas Vivas
        </h1>
        <p className="text-[#3D405B] mb-6">
          Bienvenido a este espacio de lectura, creación y comunidad.
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#F4F1DE] p-4 rounded-lg">
            <h2 className="font-bold text-[#81B29A]">📖 Ebook interactivo</h2>
            <p className="text-sm mt-2">Próximamente: capítulos para leer</p>
          </div>
          <div className="bg-[#F4F1DE] p-4 rounded-lg">
            <h2 className="font-bold text-[#81B29A]">🎨 Arteterapia</h2>
            <p className="text-sm mt-2">Próximamente: mandalas y reflexiones</p>
          </div>
        </div>
        
        <div className="mt-6 flex gap-3">
          <a href="#" className="bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm">WhatsApp</a>
          <a href="#" className="bg-[#0088cc] text-white px-4 py-2 rounded-lg text-sm">Telegram</a>
          <a href="#" className="bg-[#E4405F] text-white px-4 py-2 rounded-lg text-sm">Instagram</a>
        </div>
      </div>
    </div>
  );
}
