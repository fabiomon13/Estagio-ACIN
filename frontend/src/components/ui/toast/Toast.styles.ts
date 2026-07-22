import type { ToastVariant } from './Toast.types';

export const baseStyles = [
  'pointer-events-auto flex w-full items-start gap-3',
  'rounded-lg border p-4 text-sm shadow-lg',
  'motion-reduce:animate-none',
].join(' ');

export const variantStyles: Record<ToastVariant, string> = {
  default: 'bg-surface-elevated border-border text-content',
  success: 'bg-success-soft border-success/30 text-success',
  warning: 'bg-warning-soft border-warning/30 text-warning',
  danger: 'bg-danger-soft border-danger/30 text-danger',
  info: 'bg-info-soft border-info/30 text-info',
};

export const enterStyles = 'animate-toast-in';
export const exitStyles = 'animate-toast-out';

export const contentStyles = 'min-w-0 flex-1 space-y-1';

export const titleStyles = 'font-semibold';

export const descriptionStyles = 'break-words opacity-90';

export const closeButtonStyles = [
  'shrink-0 rounded-md p-1',
  'opacity-70 transition-opacity hover:opacity-100',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current',
].join(' ');
