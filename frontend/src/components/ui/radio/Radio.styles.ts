export const wrapperStyles = [
  'inline-flex items-center gap-2 cursor-pointer',
  'has-disabled:cursor-not-allowed has-disabled:opacity-60',
].join(' ');

export const rootStyles = 'relative inline-flex shrink-0 size-5';

export const circleStyles = [
  'pointer-events-none absolute inset-0 rounded-full',
  'border-2 border-border-strong bg-transparent peer-checked:border-primary',
  'transition-colors duration-200',
  'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-primary',
  'peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
].join(' ');

export const dotStyles = [
  'pointer-events-none absolute inset-0 m-auto size-2 rounded-full bg-primary',
  'scale-0 peer-checked:scale-100',
  'transition-transform duration-200',
].join(' ');

export const labelStyles = 'text-sm text-content';
