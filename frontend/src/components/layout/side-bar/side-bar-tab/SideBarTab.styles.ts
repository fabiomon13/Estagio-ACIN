export const baseStyles = [
  'flex w-full flex-row items-center py-2',
  'rounded-xl cursor-pointer',
  'transition-all duration-300',
].join(' ');

export const expandedPaddingStyles = 'px-4';
export const collapsedPaddingStyles = 'px-2.5';

export const expandedGapStyles = 'gap-3';
export const collapsedGapStyles = 'gap-0';

export const labelVisibleStyles = 'max-w-40 opacity-100';
export const labelHiddenStyles = 'max-w-0 opacity-0';
export const labelBaseStyles = 'overflow-hidden whitespace-nowrap transition-all duration-300';

export const inactiveStyles = [
  'text-content-subtle',
  'hover:bg-surface-hover',
  'active:bg-surface',
].join(' ');

export const activeStyles = [
  'bg-primary font-bold text-content',
  'hover:bg-primary-hover',
  'active:bg-primary-active',
].join(' ');
