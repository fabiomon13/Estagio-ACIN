import { useState, type ReactNode } from 'react';

type MenuItemImageProps = {
  src: string | null;
  alt?: string;
  className?: string;
  fallback: ReactNode;
  loading?: 'eager' | 'lazy';
};

export function MenuItemImage({ src, alt = '', className, fallback, loading }: MenuItemImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) return fallback;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFailedSrc(src)}
    />
  );
}
