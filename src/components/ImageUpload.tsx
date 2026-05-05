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
  currentImage?: string;
}

export function ImageUpload({ onUploadComplete, folderPath, className, label = "Subir Imagen", currentImage }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Por favor selecciona un archivo de imagen válido.");
      return;
    }

    setIsUploading(true);
    setProgress(0);

    // Create a unique filename
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
        alert("Ocurrió un error al subir la imagen. Verifica los permisos de Firebase Storage.");
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
      {currentImage && (
        <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
           <img src={currentImage} alt="Current" className="w-full h-full object-cover" />
        </div>
      )}
      
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={cn(
          "flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50",
          className
        )}
      >
        {isUploading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Subiendo... {progress}%
          </>
        ) : (
          <>
            <UploadCloud size={16} className="text-kirateal" />
            {label}
          </>
        )}
      </button>
    </div>
  );
}
