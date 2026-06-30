import React, { useState } from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  fallbackSrc = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
  ...props
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Convert typical image formats dynamically to WebP where possible (via CDN parameters if using Unsplash)
  let optimizedSrc = src;
  if (src.includes('unsplash.com') && !src.includes('format=webp')) {
    optimizedSrc = src.replace(/fm=[a-z]+/g, 'fm=webp').replace(/format=[a-z]+/g, 'format=webp');
    if (!optimizedSrc.includes('format=webp')) {
      optimizedSrc += '&format=webp';
    }
  }

  return (
    <div className={`relative overflow-hidden bg-slate-50 ${className}`}>
      {/* Shimmer skeleton loader shown until image is fully loaded */}
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100" />
      )}

      <img
        src={error ? fallbackSrc : optimizedSrc}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`transition-all duration-700 ease-out h-full w-full object-cover ${
          loaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-md'
        }`}
        {...props}
      />
    </div>
  );
}
