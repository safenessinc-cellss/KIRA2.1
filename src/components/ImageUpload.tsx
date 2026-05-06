// src/components/ImageUpload.tsx
import React, { useState, useRef } from 'react';
import { storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { UploadCloud, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  folderPath: string;
  className?: string;
  label?: string;
  accept?: string;
}

export function ImageUpload({ 
  onUploadComplete, 
  folderPath, 
  className, 
  label = "Subir Imagen", 
  accept = "image/*",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert("Por favor selecciona un archivo de imagen válido (JPEG, PNG, GIF, etc.).");
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
        alert("Ocurrió un error al subir la imagen.");
        setIsUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setIsUploading(false);
        onUploadComplete(downloadURL);
      }
    );
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
            <ImageIcon size={16} className="text-kirateal" />
            {label}
          </>
        )}
      </button>
    </div>
  );
}
