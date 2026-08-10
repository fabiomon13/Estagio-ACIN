import { useState, type ReactNode } from 'react';

import { toMediaUrl } from '../../../../services/api/client';

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
  loading = 'lazy',
}: MenuItemImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const resolvedSrc = toMediaUrl(src);

  if (!resolvedSrc || failedSource === resolvedSrc) {
    return fallback;
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      draggable={false}
      loading={loading}
      decoding="async"
      fetchPriority={loading === 'eager' ? 'high' : 'low'}
      onError={() => setFailedSource(resolvedSrc)}
    />
  );
}
