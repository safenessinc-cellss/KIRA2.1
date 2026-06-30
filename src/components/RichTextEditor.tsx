import React, { useState, useRef } from 'react';
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Link2, Eraser, Eye, Edit3 } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTag = (openTag: string, closeTag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = openTag + selectedText + closeTag;

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    onChange(newValue);

    // Refocus and restore selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + openTag.length, start + openTag.length + selectedText.length);
    }, 0);
  };

  const handleClear = () => {
    if (window.confirm('¿Estás seguro de que deseas limpiar todo el formato HTML?')) {
      const clean = value.replace(/<[^>]*>/g, '');
      onChange(clean);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-kirateal/5 focus-within:border-kirateal transition-all shadow-sm">
      {/* Toolbar / Tabs header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 gap-2">
        {/* Formatting Buttons */}
        {activeTab === 'write' ? (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => insertTag('<strong>', '</strong>')}
              className="p-1.5 hover:bg-slate-200 text-slate-600 rounded transition cursor-pointer"
              title="Negrita"
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertTag('<em>', '</em>')}
              className="p-1.5 hover:bg-slate-200 text-slate-600 rounded transition cursor-pointer"
              title="Cursiva"
            >
              <Italic size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertTag('<h2>', '</h2>')}
              className="p-1.5 hover:bg-slate-200 text-slate-600 rounded text-xs font-bold transition cursor-pointer"
              title="Título Grande"
            >
              <Heading2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertTag('<h3>', '</h3>')}
              className="p-1.5 hover:bg-slate-200 text-slate-600 rounded text-xs font-bold transition cursor-pointer"
              title="Título Mediano"
            >
              <Heading3 size={14} />
            </button>
            <div className="h-4 w-px bg-slate-200 mx-1"></div>
            <button
              type="button"
              onClick={() => insertTag('<ul>\n  <li>', '</li>\n</ul>')}
              className="p-1.5 hover:bg-slate-200 text-slate-600 rounded transition cursor-pointer"
              title="Lista Desordenada"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertTag('<ol>\n  <li>', '</li>\n</ol>')}
              className="p-1.5 hover:bg-slate-200 text-slate-600 rounded transition cursor-pointer"
              title="Lista Numerada"
            >
              <ListOrdered size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertTag('<a href="https://" target="_blank" class="text-kirateal hover:underline">', '</a>')}
              className="p-1.5 hover:bg-slate-200 text-slate-600 rounded transition cursor-pointer"
              title="Enlace"
            >
              <Link2 size={14} />
            </button>
            <div className="h-4 w-px bg-slate-200 mx-1"></div>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 hover:bg-red-50 hover:text-red-500 text-slate-500 rounded transition cursor-pointer"
              title="Limpiar Formato"
            >
              <Eraser size={14} />
            </button>
          </div>
        ) : (
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1.5">
            Vista Previa Activa
          </div>
        )}

        {/* Mode Switcher */}
        <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
              activeTab === 'write'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Edit3 size={11} /> Editor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
              activeTab === 'preview'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye size={11} /> Previsualizar
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="relative">
        {activeTab === 'write' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full min-h-[160px] max-h-[400px] p-4 text-xs font-mono text-slate-700 bg-white border-0 focus:ring-0 resize-y outline-none leading-relaxed"
          />
        ) : (
          <div className="p-4 min-h-[160px] max-h-[400px] overflow-y-auto bg-slate-50/50 text-xs text-slate-700 leading-relaxed space-y-2 prose prose-sm max-w-none">
            {value ? (
              <div dangerouslySetInnerHTML={{ __html: value }} />
            ) : (
              <p className="text-slate-400 italic">No hay contenido que mostrar.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
