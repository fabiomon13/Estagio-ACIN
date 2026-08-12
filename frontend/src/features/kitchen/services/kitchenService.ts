// This service fires the requests to the kitchen backend endpoints -- no
// component should call apiFetch directly for kitchen data, go through here.

import { apiFetch } from '../../../services/api/client';
import type {
  KitchenOrderItem,
  KitchenPatchableStatus,
  KitchenTicket,
} from '../types/kitchen.types';

// Gets all active kitchen tickets.
export function getTickets(signal?: AbortSignal): Promise<KitchenTicket[]> {
  return apiFetch<KitchenTicket[]>('/kitchen/tickets', { signal });
}

// Updates the status of an order item.
export function updateItemStatus(
  orderItemId: number,
  status: KitchenPatchableStatus,
): Promise<KitchenOrderItem> {
  return apiFetch<KitchenOrderItem>(`/kitchen/order-items/${orderItemId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}
