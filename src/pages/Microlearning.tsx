// src/pages/Microlearning.tsx
import React from 'react';

export function Microlearning() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-4">
          Microlearning
        </h1>
        <p className="text-slate-500 text-lg">
          Contenido educativo en formato micro para aprendizaje rápido y efectivo.
        </p>
        <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
          <p className="text-slate-400 text-sm">Módulo en desarrollo...</p>
        </div>
      </div>
    </div>
  );
}