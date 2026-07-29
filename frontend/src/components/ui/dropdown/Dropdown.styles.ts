import type { DropdownSize } from './Dropdown.types';

export const wrapperStyles = 'relative';

export const triggerBaseStyles = [
  'flex w-full items-center gap-2',
  'rounded-lg font-normal',
  'bg-surface-raised text-content',
  'border border-border',
  'transition-colors duration-200',
  'outline-none cursor-pointer',
  'focus:border-primary',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

export const triggerErrorStyles = ['border-danger', 'focus:border-danger'].join(' ');

export const triggerSizeStyles: Record<DropdownSize, string> = {
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-4 text-base',
};

export const leftContentStyles = 'flex shrink-0 items-center text-content-subtle';

export const valueStyles = 'flex-1 truncate text-left';

export const placeholderStyles = 'flex-1 truncate text-left text-content-subtle';

export const chevronStyles = 'shrink-0 text-content-subtle transition-transform duration-200';

export const chevronOpenStyles = 'rotate-180';

export const panelStyles = [
  'absolute z-10 mt-1.5 w-full',
  'max-h-60 overflow-y-auto',
  'rounded-lg border border-border bg-surface-raised',
  'py-1 shadow-lg',
].join(' ');

export const optionBaseStyles = [
  'flex w-full items-center gap-2 px-4 py-2 text-sm',
  'text-left text-content cursor-pointer',
  'transition-colors duration-200',
  'hover:bg-surface-hover',
].join(' ');

export const optionSelectedStyles = 'bg-surface-hover font-medium';

export const optionLabelStyles = 'flex-1 truncate';

export const optionLeftContentStyles = 'flex shrink-0 items-center text-content-subtle';

export const labelStyles = 'mb-1.5 block text-sm font-medium text-content';

export const helperTextStyles = 'mt-1.5 text-sm text-content-muted';

export const errorTextStyles = 'mt-1.5 text-sm text-danger';
