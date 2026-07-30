import type { KitchenPatchableStatus, KitchenTicket } from '../../types/kitchen.types';

export type TicketUrgency = 'normal' | 'warning' | 'danger';

export type TicketCardProps = {
  ticket: KitchenTicket;
  onAdvanceStatus: (orderItemId: number, nextStatus: KitchenPatchableStatus) => void;
  urgency: TicketUrgency;
  elapsedMinutes: number;
};
