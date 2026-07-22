export const wrapperStyles = [
  'inline-flex items-center gap-2 cursor-pointer',
  'has-disabled:cursor-not-allowed has-disabled:opacity-60',
].join(' ');

export const rootStyles = 'relative inline-flex shrink-0 h-6 w-11';

export const trackStyles = [
  'pointer-events-none absolute inset-0 rounded-full',
  'bg-surface-elevated peer-checked:bg-primary',
  'transition-colors duration-200',
  'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-primary',
  'peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
].join(' ');

export const thumbStyles = [
  'pointer-events-none absolute inset-y-0.5 left-0.5 size-5 rounded-full bg-white shadow',
  'transition-transform duration-200 peer-checked:translate-x-5',
].join(' ');

export const labelStyles = 'text-sm text-content';
