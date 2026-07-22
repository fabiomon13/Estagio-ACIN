import type { CheckboxVariant } from './Checkbox.types';

export const wrapperStyles = [
  'inline-flex items-center gap-2 cursor-pointer',
  'has-disabled:cursor-not-allowed has-disabled:opacity-60',
].join(' ');

export const rootStyles = 'relative inline-flex shrink-0 size-5';

export const boxStyles = [
  'pointer-events-none absolute inset-0 rounded-md',
  'border-2 border-border-strong bg-transparent',
  'transition-colors duration-200',
  'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-primary',
  'peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
].join(' ');

export const variantStyles: Record<CheckboxVariant, string> = {
  primary: 'peer-checked:border-primary peer-checked:bg-primary',
  white: 'peer-checked:border-white peer-checked:bg-white',
};

export const iconStyles = [
  'pointer-events-none absolute inset-0 flex items-center justify-center',
  'scale-0 opacity-0 transition-transform duration-200',
  'peer-checked:scale-100 peer-checked:opacity-100',
].join(' ');

export const iconColorStyles: Record<CheckboxVariant, string> = {
  primary: 'text-white',
  white: 'text-background',
};

export const labelStyles = 'text-sm text-content';
