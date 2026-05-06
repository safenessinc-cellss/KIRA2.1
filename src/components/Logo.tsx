import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  textClassName?: string;
}

export function Logo({ className = '', size = 'md', withText = false, textClassName = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-auto',
    md: 'h-10 w-auto',
    lg: 'h-14 w-auto',
    xl: 'h-20 w-auto'
  };

  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`${sizeClasses[size]} bg-gradient-to-br from-kirateal to-indigo-600 rounded-xl flex items-center justify-center shadow-lg`}>
          <span className="text-white font-black text-2xl">K</span>
        </div>
        {withText && (
          <span className={`font-black text-slate-800 tracking-tight ${textClassName}`}>
            KIRA.COACH
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/images/11.png"
        alt="KIRA Coach"
        className={`${sizeClasses[size]} object-contain drop-shadow-md`}
        onError={() => setHasError(true)}
      />
      {withText && (
        <span className={`font-black text-slate-800 tracking-tight ${textClassName}`}>
          KIRA.COACH
        </span>
      )}
    </div>
  );
}
