// frontend/src/features/client/services/orderApi.ts

import { apiFetch } from '../../../services/api/client';
import { buildClientTablePath, createDeviceHeaders } from './clientRequest';

export type OrderStatusAlias =
  'pending' | 'preparing' | 'ready' | 'served' | 'cancelled' | 'returned';

export type OrderStatus = Readonly<{
  id: number;
  name: string;
  alias: OrderStatusAlias;
}>;

export type OrderMenuItem = Readonly<{
  id: number;
  name: string;
  alias: string;
  photo_url: string | null;
}>;

export type OrderItem = Readonly<{
  id: number;
  item_id: number;
  status_id: number;
  quantity: number;
  notes: string | null;
  unit_price_at_order: string;
  menu_item: OrderMenuItem;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}>;

export type ClientOrder = Readonly<{
  id: number;
  guest_id: number;
  round_number: number;
  client_request_id: string;
  created_at: string;
  items: readonly OrderItem[];
}>;

export type OrderId = ClientOrder['id'];
export type OrderItemId = OrderItem['id'];

export type CreateOrderItemInput = Readonly<{
  itemId: number;
  quantity: number;
  notes?: string | null;
}>;

export type CreateOrderInput = Readonly<{
  clientRequestId: string;
  items: readonly CreateOrderItemInput[];
}>;

export type OrderRequestOptions = Readonly<{
  signal?: AbortSignal;
}>;

// Builds the URL path for the orders endpoint based on the provided table code
function buildOrdersPath(tableCode: string): string {
  return `${buildClientTablePath(tableCode)}/orders`;
}

// Builds the URL path for a specific order item based on the provided table code, order ID, and order item ID
function buildOrderItemPath(tableCode: string, orderId: OrderId, orderItemId: OrderItemId): string {
  return `${buildOrdersPath(tableCode)}/${orderId}/items/${orderItemId}`;
}

// Fetches the list of orders for the specified table code and device token, returning a Promise that resolves to an array of ClientOrder objects
export function getOrders(
  tableCode: string,
  deviceToken: string,
  options: OrderRequestOptions = {},
): Promise<ClientOrder[]> {
  return apiFetch<ClientOrder[]>(buildOrdersPath(tableCode), {
    headers: createDeviceHeaders(deviceToken, {
      includeJson: true,
    }),
    signal: options.signal,
  });
}

// Creates a new order for the specified table code, device token, and order input, returning a Promise that resolves to the created ClientOrder object
export function createOrder(
  tableCode: string,
  deviceToken: string,
  input: CreateOrderInput,
  options: OrderRequestOptions = {},
): Promise<ClientOrder> {
  validateCreateOrderInput(input);
  return apiFetch<ClientOrder>(buildOrdersPath(tableCode), {
    method: 'POST',
    headers: createDeviceHeaders(deviceToken, {
      includeJson: true,
    }),
    signal: options.signal,
    body: JSON.stringify({
      client_request_id: input.clientRequestId,
      items: input.items.map((item) => ({
        item_id: item.itemId,
        quantity: item.quantity,
        notes: item.notes ?? null,
      })),
    }),
  });
}

// Validates the input for creating an order, throwing a TypeError if any validation rules are violated
function validateCreateOrderInput(input: CreateOrderInput): void {
  if (!input.clientRequestId.trim()) {
    throw new TypeError('A client request ID is required.');
  }
  if (input.items.length === 0) {
    throw new TypeError('An order must contain at least one item.');
  }
  for (const item of input.items) {
    if (!Number.isInteger(item.itemId) || item.itemId <= 0) {
      throw new TypeError('Order items must have a valid item ID.');
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new TypeError('Order item quantities must be positive integers.');
    }
  }
}

// Cancels a specific order item for the given table code, order ID, and order item ID, using the provided device token for authentication
export function cancelOrderItem(
  tableCode: string,
  orderId: OrderId,
  orderItemId: OrderItemId,
  deviceToken: string,
  options: OrderRequestOptions = {},
): Promise<OrderItem> {
  return apiFetch<OrderItem>(`${buildOrderItemPath(tableCode, orderId, orderItemId)}/cancel`, {
    method: 'PATCH',
    headers: createDeviceHeaders(deviceToken),
    signal: options.signal,
  });
}
