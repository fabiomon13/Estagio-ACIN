export type KitchenItemStatus =
  'Pending' | 'Preparing' | 'Ready' | 'Cancelled' | 'Served' | 'Returned';

export type KitchenPatchableStatus = Extract<KitchenItemStatus, 'Preparing' | 'Ready'>;

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

export type KitchenTicket = {
  order_id: number;
  table_number: number;
  guest_number: number;
  round_number: number;
  created_at: string;
  items: KitchenOrderItem[];
};
