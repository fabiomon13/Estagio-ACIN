import type { InputSize } from './Input.types';

export const baseStyles = [
  'rounded-lg font-normal',
  'bg-surface-raised text-content placeholder:text-content-subtle',
  'border border-border',
  'transition-colors duration-200',
  'outline-none',
  'focus:border-primary',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

export const errorStyles = ['border-danger', 'focus:border-danger'].join(' ');

export const sizeStyles: Record<InputSize, string> = {
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-4 text-base',
};

export const labelStyles = 'mb-1.5 block text-sm font-medium text-content';

export const helperTextStyles = 'mt-1.5 text-sm text-content-muted';

export const errorTextStyles = 'mt-1.5 text-sm text-danger';
