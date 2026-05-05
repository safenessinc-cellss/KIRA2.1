import React, { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface LogoProps {
  className?: string;
  size?: number;
  withText?: boolean;
  variant?: 'color' | 'gold' | 'white' | 'luxury' | 'minimalist';
}

export function Logo({ className, size = 40, withText = false, variant = 'color' }: LogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'website'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().logoImage) {
        setLogoUrl(docSnap.data().logoImage);
      }
    });
    return () => unsub();
  }, []);

  let textColor = "text-slate-900";
  let subTextColor = "text-kiragold";

  if (variant === 'white' || variant === 'luxury') {
    textColor = "text-white";
    subTextColor = "text-kiragold";
  } else if (variant === 'minimalist') {
    textColor = "text-kiragold";
    subTextColor = "text-kiragold/80";
  } else {
    textColor = "text-kirateal";
    subTextColor = "text-kiragold";
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative shrink-0 flex items-center justify-center rounded-full overflow-hidden" style={{ width: size, height: size }}>
        <img 
          src={logoUrl || "/assets/kira-logo.png"} 
          alt="Kira Coach Logo" 
          className={cn(
             "w-full h-full object-contain drop-shadow-md",
             variant === 'minimalist' && "sepia hue-rotate-[10deg] saturate-150 brightness-110",
             variant === 'luxury' && "drop-shadow-xl"
          )}
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = 'https://api.dicebear.com/7.x/initials/svg?seed=Kira&backgroundColor=008080';
          }}
        />
      </div>

      {withText && (
        <div className="flex flex-col leading-none">
          <span className={cn(
            "text-xl font-serif font-black tracking-tighter uppercase drop-shadow-sm", 
            textColor
          )}>
            KIRA COACH
          </span>
          <span className={cn(
            "text-[9px] font-sans font-bold tracking-[0.35em] uppercase mt-1", 
            subTextColor
          )}>
            ECOSISTEMA DE BIENESTAR
          </span>
        </div>
      )}
    </div>
  );
}

export function Seal({ className, size = 120 }: { className?: string; size?: number }) {
  // A CSS-based representation of the premium seal described
  return (
     <div className={cn("relative flex items-center justify-center rounded-full drop-shadow-2xl", className)} style={{ width: size, height: size }}>
        {/* Outer Teal Enamel Frame */}
        <div className="absolute inset-0 bg-gradient-to-br from-kirateal to-kirateal-dark rounded-full border-4 border-kiragold/80 shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)]"></div>
        
        {/* Inner Gold Engine Turned / Polished Disc */}
        <div className="absolute inset-2 bg-gradient-to-tr from-kiragold-dark via-kiragold to-white/60 rounded-full border border-kiragold/30 shadow-inner flex flex-col items-center justify-center">
            {/* The minimal K + human figure */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-kirateal opacity-90 flex flex-col items-center justify-center mt-1">
               {/* A simple graphic mimicking the K and human figure */}
               <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4v16" />
                  <path d="M4 12l6-8" />
                  <path d="M4 12l6 8" />
                  <circle cx="18" cy="8" r="2" />
                  <path d="M12 12c1.5 1.5 3 2 6 2" />
               </svg>
            </div>
        </div>

        {/* Circular Text */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full rotate-[0deg]">
           <path id="curve-top" fill="transparent" d="M 15 50 a 35 35 0 1 1 70 0" />
           <text width="100" textAnchor="middle" className="fill-kiragold font-serif font-black tracking-widest" style={{ fontSize: '10px' }}>
             <textPath href="#curve-top" startOffset="50%">KIRA COACH</textPath>
           </text>
        </svg>

        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full rotate-[0deg]">
           <path id="curve-bottom" fill="transparent" d="M 15 50 a 35 35 0 0 0 70 0" />
           <text width="100" textAnchor="middle" className="fill-kiragold font-sans font-bold tracking-[0.2em]" style={{ fontSize: '6px' }}>
             <textPath href="#curve-bottom" startOffset="50%">ECOSISTEMA DE BIENESTAR</textPath>
           </text>
        </svg>
     </div>
  );
}
