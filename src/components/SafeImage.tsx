import { useEffect, useState } from 'react';
import type { ImgHTMLAttributes, SyntheticEvent } from 'react';

const FALLBACK_IMAGE = '/images/image-unavailable.svg';

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
  fallbackSrc?: string;
};

function isUnstableImageSource(source?: string | null): boolean {
  if (!source) return true;
  if (source.startsWith('/') || source.startsWith('data:image/') || source.startsWith('blob:')) return false;
  try {
    const parsed = new URL(source, window.location.origin);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return true;
    const host = parsed.hostname.toLowerCase();
    return host === 'fbcdn.net' || host.endsWith('.fbcdn.net') ||
      host === 'facebook.com' || host.endsWith('.facebook.com');
  } catch {
    return true;
  }
}

/** Avoid expired Facebook CDN links and fall back locally when other image hosts fail. */
export function SafeImage({
  src,
  alt,
  fallbackSrc = FALLBACK_IMAGE,
  onError,
  loading = 'lazy',
  referrerPolicy = 'no-referrer',
  ...props
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const sourceIsUnstable = isUnstableImageSource(src);

  useEffect(() => setFailed(false), [src]);

  const imageSource = !src || sourceIsUnstable || failed ? fallbackSrc : src;
  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    onError?.(event);
    if (imageSource !== fallbackSrc) setFailed(true);
  };

  return (
    <img
      {...props}
      src={imageSource}
      alt={alt}
      loading={loading}
      referrerPolicy={referrerPolicy}
      onError={handleError}
    />
  );
}
