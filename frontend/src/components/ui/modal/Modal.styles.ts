export const overlayStyles = [
  'fixed inset-0 z-50',
  'flex items-center justify-center',
  'bg-black/60 backdrop-blur-sm p-4',
  'motion-reduce:animate-none',
].join(' ');

export const overlayEnterStyles = 'animate-overlay-in';
export const overlayExitStyles = 'animate-overlay-out';

export const panelStyles = [
  'w-full max-w-sm',
  'max-h-[90vh] overflow-y-auto',
  'rounded-xl border border-border bg-surface-elevated',
  'p-6 shadow-xl',
  'motion-reduce:animate-none',
].join(' ');

export const panelEnterStyles = 'animate-dialog-in';
export const panelExitStyles = 'animate-dialog-out';
