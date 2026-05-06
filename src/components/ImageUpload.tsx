import React, { useState, useRef } from 'react';
import { storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { UploadCloud, Loader2, FileText, Music, PlayCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  folderPath: string;
  className?: string;
  label?: string;
  accept?: string;
  fileType?: 'image' | 'pdf' | 'audio' | 'video' | 'any';
}

export function FileUpload({ 
  onUploadComplete, 
  folderPath, 
  className, 
  label = "Subir Archivo", 
  accept = "*/*",
  fileType = 'any'
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Optional validation based on fileType
    if (fileType === 'pdf' && file.type !== 'application/pdf') {
      alert("Por favor selecciona un archivo PDF válido.");
      return;
    }
    if (fileType === 'audio' && !file.type.startsWith('audio/')) {
      alert("Por favor selecciona un archivo de audio válido.");
      return;
    }

    setIsUploading(true);
    setProgress(0);

    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const storageRef = ref(storage, `${folderPath}/${uniqueFileName}`);
    
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(Math.round(prog));
      },
      (error) => {
        console.error("Upload Error:", error);
        alert("Ocurrió un error al subir el archivo.");
        setIsUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setIsUploading(false);
        onUploadComplete(downloadURL);
      }
    );
  };

  const getIcon = () => {
    if (fileType === 'pdf') return <FileText size={16} className="text-rose-500" />;
    if (fileType === 'audio') return <Music size={16} className="text-cyan-500" />;
    if (fileType === 'video') return <PlayCircle size={16} className="text-indigo-500" />;
    return <UploadCloud size={16} className="text-kirateal" />;
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <input 
        type="file" 
        accept={accept} 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={cn(
          "flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm transition-all hover:bg-white hover:shadow-lg disabled:opacity-50 border-dashed",
          className
        )}
      >
        {isUploading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {progress}%
          </>
        ) : (
          <>
            {getIcon()}
            {label}
          </>
        )}
      </button>
    </div>
  );
}
