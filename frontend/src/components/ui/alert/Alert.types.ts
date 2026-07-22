import type { HTMLAttributes, ReactNode } from 'react';

export type AlertVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  title?: string;
  variant?: AlertVariant;
  onClose?: () => void;
};
