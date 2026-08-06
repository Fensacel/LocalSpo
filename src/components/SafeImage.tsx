import { useState, useEffect } from 'react';
import { User, Music } from 'lucide-react';
import { getImageUrl } from '@/utils';

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallback?: React.ReactNode;
}

export function SafeImage({ src, fallback, alt = '', className = '', ...props }: SafeImageProps) {
  const [error, setError] = useState(false);
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);

  useEffect(() => {
    setError(false);
    let cancelled = false;

    if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
      if (window.electronAPI?.cache?.image) {
        window.electronAPI.cache.image(src).then((res: string | null) => {
          if (!cancelled && res) setCachedUrl(res);
        }).catch(() => {
          if (!cancelled) setCachedUrl(src);
        });
      } else {
        setCachedUrl(src);
      }
    } else {
      setCachedUrl(src ?? null);
    }

    return () => {
      cancelled = true;
    };
  }, [src]);

  const activeSrc = cachedUrl || src;
  if (!activeSrc || error) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }
    return (
      <div className={`flex items-center justify-center bg-[#1A1A1E] text-white/25 border border-white/5 w-full h-full rounded-[inherit] ${className}`}>
        <Music className="w-1/2 h-1/2 max-w-[20px] max-h-[20px]" />
      </div>
    );
  }

  const url = getImageUrl(activeSrc);

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      {...props}
    />
  );
}

interface SafeAvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
  sizeClassName?: string;
  fallbackIcon?: React.ReactNode;
}

export function SafeAvatar({
  src,
  alt = 'Avatar',
  className = '',
  sizeClassName = 'w-full h-full',
  fallbackIcon,
}: SafeAvatarProps) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-[#0070F3] to-purple-700 text-white ${sizeClassName}`}>
        {fallbackIcon || <User className="w-1/2 h-1/2" />}
      </div>
    );
  }

  const url = getImageUrl(src);

  return (
    <img
      src={url}
      alt={alt}
      className={`${sizeClassName} object-cover ${className}`}
      onError={() => setError(true)}
    />
  );
}

interface SafeBannerProps {
  src?: string | null;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
}

export function SafeBanner({
  src,
  alt = 'Banner',
  className = 'w-full h-full object-cover',
  children,
}: SafeBannerProps) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (!src || error) {
    return (
      <div className="w-full h-full bg-gradient-to-r from-blue-950 via-purple-950/80 to-zinc-950 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-radial-gradient from-blue-500/10 via-transparent to-transparent pointer-events-none" />
        {children}
      </div>
    );
  }

  const url = getImageUrl(src);

  return (
    <div className="relative w-full h-full">
      <img
        src={url}
        alt={alt}
        className={className}
        onError={() => setError(true)}
      />
      {children}
    </div>
  );
}
