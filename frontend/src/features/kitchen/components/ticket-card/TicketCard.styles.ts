import type { TicketUrgency } from './TicketCard.types';

export const ticketCardStyles = {
  card: 'flex w-full flex-col rounded-3xl bg-surface-raised px-4 py-5',

  border: {
    normal: '',
    warning: 'border-2 border-warning/80',
    danger: 'border-2 border-danger/80',
  } satisfies Record<TicketUrgency, string>,

  allergenBanner: [
    'mb-3 flex items-center gap-2 rounded-lg border p-2 text-xs font-medium',
    'border-danger/30 bg-danger-soft text-danger',
  ].join(' '),

  stationDot: 'mt-1.5 size-2 shrink-0 rounded-full',

  itemName: 'text-content',
  itemNameTerminal: 'text-content-subtle line-through',

  statusDoneLabel: 'text-success flex gap-2 items-center text-sm',

  dismissButton: [
    'rounded-full p-1 text-content-subtle cursor-pointer',
    'transition-colors duration-200',
    'hover:bg-surface-hover hover:text-content',
  ].join(' '),

  dismissTooltip: [
    'pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap',
    'rounded-md bg-surface-elevated px-2 py-1 text-xs text-content shadow-lg',
    'opacity-0 transition-opacity duration-150 group-hover:opacity-100',
  ].join(' '),
};
