import type { KitchenItemStatus, KitchenOrderItem, KitchenTicket } from '../types/kitchen.types';
import { sortTicketsByUrgency } from './getTicketUrgency';

export type TicketColumn = 'new' | 'preparing' | 'ready';

export type TicketFragment = {
  order_id: number;
  table_number: number;
  round_number: number;
  guest_number: number;
  created_at: string;
  items: KitchenOrderItem[];
};

const COLUMN_STATUS: Record<TicketColumn, KitchenItemStatus> = {
  new: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
};

function toFragment(ticket: KitchenTicket, items: KitchenOrderItem[]): TicketFragment {
  return {
    order_id: ticket.order_id,
    table_number: ticket.table_number,
    round_number: ticket.round_number,
    guest_number: ticket.guest_number,
    created_at: ticket.created_at,
    items,
  };
}

export function groupTicketsByColumn(
  tickets: KitchenTicket[],
  now: Date = new Date(),
): Record<TicketColumn, TicketFragment[]> {
  const grouped: Record<TicketColumn, TicketFragment[]> = { new: [], preparing: [], ready: [] };

  for (const ticket of tickets) {
    (Object.keys(COLUMN_STATUS) as TicketColumn[]).forEach((column) => {
      const items = ticket.items.filter((item) => item.status === COLUMN_STATUS[column]);
      if (items.length > 0) {
        grouped[column].push(toFragment(ticket, items));
      }
    });
  }

  return {
    new: sortTicketsByUrgency(grouped.new, now),
    preparing: sortTicketsByUrgency(grouped.preparing, now),
    ready: sortTicketsByUrgency(grouped.ready, now),
  };
}
