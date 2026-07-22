import type { BadgeSize, BadgeVariant } from './Badge.types';

export const baseStyles = [
  'inline-flex items-center gap-1',
  'rounded-full font-medium whitespace-nowrap',
].join(' ');

export const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-elevated text-content-muted',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
};

export const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};
