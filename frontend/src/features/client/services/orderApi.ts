import { apiFetch } from '../../../services/api/client';

export type OrderStatus = {
  id: number;
  name: string;
  alias: string;
};

export type OrderItem = {
  id: number;
  item_id: number;
  status_id: number;
  quantity: number;
  notes: string | null;
  unit_price_at_order: string;
  menu_item: {
    id: number;
    name: string;
    alias: string;
    photo_url: string | null;
  };
  status: OrderStatus;
  created_at: string;
  updated_at: string;
};

export type ClientOrder = {
  id: number;
  guest_id: number;
  round_number: number;
  client_request_id: string;
  created_at: string;
  items: OrderItem[];
};

function deviceHeaders(deviceToken: string): HeadersInit {
  return { 'X-Device-Token': deviceToken };
}

export function getOrders(tableCode: string, deviceToken: string): Promise<ClientOrder[]> {
  return apiFetch<ClientOrder[]>(`/client/tables/${encodeURIComponent(tableCode)}/orders`, {
    headers: deviceHeaders(deviceToken),
  });
}

export function createOrder(
  tableCode: string,
  deviceToken: string,
  items: Array<{ item_id: number; quantity: number; notes: string | null }>,
): Promise<ClientOrder> {
  return apiFetch<ClientOrder>(`/client/tables/${encodeURIComponent(tableCode)}/orders`, {
    method: 'POST',
    headers: {
      ...deviceHeaders(deviceToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_request_id: crypto.randomUUID(),
      items,
    }),
  });
}

export function cancelOrderItem(
  tableCode: string,
  orderId: number,
  itemId: number,
  deviceToken: string,
): Promise<OrderItem> {
  return apiFetch<OrderItem>(
    `/client/tables/${encodeURIComponent(tableCode)}/orders/${orderId}/items/${itemId}/cancel`,
    {
      method: 'PATCH',
      headers: deviceHeaders(deviceToken),
    },
  );
}
