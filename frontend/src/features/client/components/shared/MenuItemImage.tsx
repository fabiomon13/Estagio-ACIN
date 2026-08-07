import { useState, type ReactNode } from 'react';

type MenuItemImageProps = {
  src: string | null;
  alt?: string;
  className?: string;
  fallback: ReactNode;
  loading?: 'eager' | 'lazy';
};

export function MenuItemImage({
  src,
  alt = '',
  className,
  fallback,
  loading = 'eager',
}: MenuItemImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (!src || failedSource === src) {
    return fallback;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding="sync"
      onError={() => setFailedSource(src)}
    />
  );
}
