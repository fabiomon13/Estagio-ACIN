import type { ButtonSize, ButtonVariant } from './Button.types';

export const baseStyles = [
  'inline-flex items-center justify-center gap-2',
  'rounded-full font-medium',
  'transition-colors duration-200',
  'focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-primary',
  'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'cursor-pointer',
].join(' ');

export const variantStyles: Record<ButtonVariant, string> = {
  primary: ['bg-primary text-white', 'hover:bg-primary-hover', 'active:bg-primary-active'].join(
    ' ',
  ),

  secondary: [
    'bg-surface-elevated text-content',
    'hover:bg-surface-hover',
    'active:bg-surface',
  ].join(' '),

  outline: [
    'border border-border-strong bg-transparent text-content',
    'hover:bg-surface-raised',
    'active:bg-surface-elevated',
  ].join(' '),

  ghost: [
    'bg-transparent text-content-muted',
    'hover:bg-surface-raised hover:text-content',
    'active:bg-surface-elevated',
  ].join(' '),

  danger: [
    'bg-danger text-white',
    'hover:bg-danger/90',
    'active:bg-danger/80',
    'focus-visible:ring-danger',
  ].join(' '),
};

export const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-8 px-3 py-1.5 text-sm',
  md: 'min-h-10 px-4 py-2 text-sm',
  lg: 'min-h-12 px-6 py-3 text-base',
};
