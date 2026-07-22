import type { ReactNode } from 'react';

export type ToastVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export type ToastOptions = {
  title?: string;
  description?: ReactNode;
  variant?: ToastVariant;
  duration?: number;
};

export type ToastData = ToastOptions & {
  id: string;
  closing: boolean;
};

export type ToastProps = ToastData & {
  onDismiss: (id: string) => void;
  onExited: (id: string) => void;
};

export type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
};
