import React, { useState, useRef } from 'react';
import { storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { UploadCloud, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../hooks/useToast';

interface MediaUploadProps {
  onUploadComplete: (url: string) => void;
  folderPath: string;
  className?: string;
  label?: string;
  currentMedia?: string;
  accept?: string;
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

export function MediaUpload({ onUploadComplete, folderPath, className, label = "Subir Archivo", currentMedia, accept = "video/*" }: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success: toastSuccess, warning: toastWarning, error: toastError } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProgress(0);

    let finalFileOrBlob: Blob | File = file;
    let base64Fallback = '';

    // If it's an image, let's compress it and prepare base64Fallback in advance
    if (file.type.startsWith('image/')) {
      try {
        console.log(`[MediaUpload] Compressing image: ${file.name} (${Math.round(file.size / 1024)} KB)`);
        base64Fallback = await compressImage(file);
        
        // Convert compressed base64 back to blob to attempt a smaller upload
        const response = await fetch(base64Fallback);
        finalFileOrBlob = await response.blob();
        console.log(`[MediaUpload] Compressed successfully to ${Math.round(finalFileOrBlob.size / 1024)} KB`);
      } catch (e) {
        console.warn("[MediaUpload] Compression failed, using original file:", e);
      }
    }

    // Create a unique filename
    const fileExtension = file.name.split('.').pop() || 'png';
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const storageRef = ref(storage, `${folderPath}/${uniqueFileName}`);
    
    console.log(`[MediaUpload] Attempting to upload to Firebase Storage: ${folderPath}/${uniqueFileName}`);
    const uploadTask = uploadBytesResumable(storageRef, finalFileOrBlob);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(Math.round(prog));
      },
      async (error) => {
        console.warn("[MediaUpload] Storage Upload Failed (e.g. CORS/permissions). Error:", error);
        
        // Check if we have a base64Fallback (for images)
        if (base64Fallback) {
          console.log("[MediaUpload] Falling back to compressed base64 data URL...");
          toastWarning("Carga a la nube restringida por red o CORS. Guardando imagen en base local.");
          onUploadComplete(base64Fallback);
        } else {
          // If we couldn't compress or it's a video, try to use a basic FileReader fallback
          try {
            const reader = new FileReader();
            reader.onload = (e) => {
              const res = e.target?.result as string;
              if (res) {
                toastWarning("Carga a la nube restringida por red o CORS. Guardando archivo local.");
                onUploadComplete(res);
              } else {
                toastError("Error al procesar el archivo. Revisa tu conexión.");
              }
            };
            reader.readAsDataURL(file);
          } catch (err) {
            toastError("No se pudo procesar el archivo. Revisa los permisos de Firebase.");
          }
        }
        setIsUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("[MediaUpload] Upload to Firebase Storage succeeded:", downloadURL);
          toastSuccess("¡Archivo subido exitosamente a la nube!");
          onUploadComplete(downloadURL);
        } catch (err) {
          console.error("[MediaUpload] Succeeded upload but failed to get URL:", err);
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
      {currentMedia && (
        <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
          {currentMedia.match(/\.(mp4|webm|ogg)$/i) || currentMedia.includes('video') || currentMedia.startsWith('data:video/') ? (
            <video src={currentMedia} controls className="w-full h-full object-cover" />
          ) : (
            <img src={currentMedia} alt="Current" className="w-full h-full object-cover" />
          )}
        </div>
      )}
      
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
