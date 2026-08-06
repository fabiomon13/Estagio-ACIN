// Frontend-defined, but the values must match backend/app/models/order_item_status.py's names exactly.
export type KitchenItemStatus =
  'Pending' | 'Preparing' | 'Ready' | 'Cancelled' | 'Served' | 'Returned';

// Frontend-only restriction, mirroring the backend's KitchenStatusUpdateRequest
// (Literal["Preparing", "Ready"])
export type KitchenPatchableStatus = Extract<KitchenItemStatus, 'Preparing' | 'Ready'>;

// From the backend: matches KitchenOrderItemOut in kitchen/schemas.py.
export type KitchenOrderItem = {
  order_item_id: number;
  menu_item_name: string;
  quantity: number;
  notes: string | null;
  tags: string[];
  station_id: number;
  station: string;
  status: KitchenItemStatus;
  created_at: string;
};

// From the backend: matches KitchenTicketOut in kitchen/schemas.py.
export type KitchenTicket = {
  order_id: number;
  table_number: number;
  guest_number: number;
  round_number: number;
  created_at: string;
  items: KitchenOrderItem[];
};
