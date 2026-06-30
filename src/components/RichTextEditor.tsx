import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Link2, Eraser } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder = "Escribe aquí...", className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync value from prop to editor (only if it differs from current innerHTML to prevent cursor jumping)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, arg: string = '') => {
    document.execCommand(command, false, arg);
    handleInput();
  };

  return (
    <div className={`border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 bg-slate-50 border-b border-slate-200/60 p-2 text-slate-600 select-none">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-all"
          title="Negrita"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-all"
          title="Cursiva"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-all"
          title="Subrayado"
        >
          <Underline size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('strikeThrough')}
          className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-all"
          title="Tachado"
        >
          <Strikethrough size={16} />
        </button>

        <div className="w-[1px] h-4 bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h1>')}
          className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-all"
          title="Título Grande"
        >
          <Heading1 size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h2>')}
          className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-all"
          title="Título Mediano"
        >
          <Heading2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h3>')}
          className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-all"
          title="Título Pequeño"
        >
          <Heading3 size={16} />
        </button>

        <div className="w-[1px] h-4 bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-all"
          title="Lista Numerada"
        >
          <ListOrdered size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-all"
          title="Lista con Viñetas"
        >
          <List size={16} />
        </button>

        <div className="w-[1px] h-4 bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={() => {
            const url = prompt('Ingresa la URL del enlace:');
            if (url) {
              const formattedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
              execCommand('createLink', formattedUrl);
            }
          }}
          className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-all"
          title="Insertar Enlace"
        >
          <Link2 size={16} />
        </button>

        <button
          type="button"
          onClick={() => execCommand('removeFormat')}
          className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-all ml-auto"
          title="Limpiar Formato"
        >
          <Eraser size={16} />
        </button>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-4 min-h-[160px] max-h-[400px] overflow-y-auto focus:outline-none prose max-w-none text-sm text-slate-800 outline-none select-text empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none empty:before:italic"
        data-placeholder={placeholder}
      />
    </div>
  );
}
