import React, { useState, useRef } from 'react';
import { storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { UploadCloud, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../hooks/useToast';

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  folderPath: string;
  className?: string;
  label?: string;
  currentImage?: string;
}

const compressImage = (file: File, maxWidth = 800, maxHeight = 600, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => {
        reject(err);
      };
    };
    reader.onerror = (err) => {
      reject(err);
    };
  });
};

export function ImageUpload({ onUploadComplete, folderPath, className, label = "Subir Imagen", currentImage }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success: toastSuccess, warning: toastWarning, error: toastError } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toastError("Por favor selecciona un archivo de imagen válido.");
      return;
    }

    setIsUploading(true);
    setProgress(0);

    let finalFileOrBlob: Blob | File = file;
    let base64Fallback = '';

    try {
      console.log(`[ImageUpload] Compressing image: ${file.name} (${Math.round(file.size / 1024)} KB)`);
      base64Fallback = await compressImage(file);
      
      const response = await fetch(base64Fallback);
      finalFileOrBlob = await response.blob();
      console.log(`[ImageUpload] Compressed successfully to ${Math.round(finalFileOrBlob.size / 1024)} KB`);
    } catch (e) {
      console.warn("[ImageUpload] Compression failed, using original file:", e);
    }

    // Create a unique filename
    const fileExtension = file.name.split('.').pop() || 'png';
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const storageRef = ref(storage, `${folderPath}/${uniqueFileName}`);
    
    console.log(`[ImageUpload] Attempting to upload to Firebase Storage: ${folderPath}/${uniqueFileName}`);
    const uploadTask = uploadBytesResumable(storageRef, finalFileOrBlob);

    let wasTimeout = false;
    const timeoutId = setTimeout(() => {
      wasTimeout = true;
      console.warn("[ImageUpload] Upload timeout reached (4s). Canceling upload to fallback immediately.");
      uploadTask.cancel();
    }, 4000);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(Math.round(prog));
      },
      async (error) => {
        clearTimeout(timeoutId);
        console.warn("[ImageUpload] Storage Upload Failed (e.g. CORS/permissions). Error:", error);
        
        if (base64Fallback) {
          console.log("[ImageUpload] Falling back to compressed base64 data URL...");
          if (wasTimeout) {
            toastWarning("Carga lenta o bloqueada. Usando copia optimizada local.");
          } else {
            toastWarning("Carga a la nube restringida por red o CORS. Guardando imagen en base local.");
          }
          onUploadComplete(base64Fallback);
        } else {
          toastError("Ocurrió un error al procesar la imagen. Verifica los permisos de Firebase.");
        }
        setIsUploading(false);
      },
      async () => {
        clearTimeout(timeoutId);
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("[ImageUpload] Upload to Firebase Storage succeeded:", downloadURL);
          toastSuccess("¡Imagen subida exitosamente a la nube!");
          onUploadComplete(downloadURL);
        } catch (err) {
          console.error("[ImageUpload] Succeeded upload but failed to get URL:", err);
          if (base64Fallback) {
            onUploadComplete(base64Fallback);
          }
        } finally {
          setIsUploading(false);
        }
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
