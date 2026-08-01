import type { KitchenNotificationVariant } from './KitchenNotification.types';

export const baseStyles = [
  'flex w-full items-center gap-3',
  'rounded-lg border-l-4 bg-surface-raised p-4 shadow-md',
].join(' ');

export const variantBorderStyles: Record<KitchenNotificationVariant, string> = {
  info: 'border-info',
  warning: 'border-warning',
  danger: 'border-danger',
};

export const variantIconStyles: Record<KitchenNotificationVariant, string> = {
  info: 'text-info',
  warning: 'text-warning',
  danger: 'text-danger',
};

export const messageStyles = 'flex-1 text-sm text-content';

export const closeButtonStyles = [
  'shrink-0 rounded-md p-1 text-content-subtle',
  'opacity-70 transition-opacity hover:opacity-100',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current',
  'cursor-pointer',
].join(' ');
