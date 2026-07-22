import type { SearchInputSize } from './SearchInput.types';

export const wrapperStyles = 'relative';

export const baseStyles = [
  'w-full rounded-lg font-normal',
  'bg-surface-raised text-content placeholder:text-content-subtle',
  'border border-border',
  'transition-colors duration-200',
  'outline-none',
  'focus:border-primary',
  'disabled:cursor-not-allowed disabled:opacity-50',
  '[&::-webkit-search-cancel-button]:appearance-none',
].join(' ');

export const sizeStyles: Record<SearchInputSize, string> = {
  md: 'h-10 pl-9 pr-9 text-sm',
  lg: 'h-12 pl-10 pr-10 text-base',
};

export const iconWrapperStyles =
  'pointer-events-none absolute inset-y-0 left-3 flex items-center text-content-subtle';

export const clearButtonStyles = [
  'absolute inset-y-0 right-2.5 flex items-center rounded-md',
  'text-content-subtle transition-colors hover:text-content',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
].join(' ');

export const labelStyles = 'mb-1.5 block text-sm font-medium text-content';
