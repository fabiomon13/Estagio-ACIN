import type { TicketUrgency } from './TicketCard.types';

export const ticketCardStyles = {
  card: 'flex w-full flex-col rounded-xl bg-surface-raised px-4 py-5',

  border: {
    normal: '',
    warning: 'border-l-6 border-warning/80',
    danger: 'border-l-6 border-danger/80',
  } satisfies Record<TicketUrgency, string>,

  allergenBanner: [
    'mb-3 flex items-center gap-2 rounded-lg border p-2 text-xs font-medium',
    'border-danger/30 bg-danger-soft text-danger',
  ].join(' '),

  stationDot: 'mt-1.5 size-2 shrink-0 rounded-full',

  itemName: 'text-content',

  statusDoneLabel: 'text-success flex gap-2 items-center text-sm',
};
