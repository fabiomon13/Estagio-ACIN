export type StaffTableState = 'awaiting_approval' | 'active' | 'inactive' | 'payment_requested';

export type StaffRequestType = 'assistance' | 'payment_request' | string;
export type StaffPriority = 'normal' | 'urgent' | string;

export type StaffDashboardSummary = {
  occupied_tables: number;
  guest_count: number;
  open_requests: number;
};

export type StaffDashboardTable = {
  session_id: number | null;
  table_number: number;
  guest_count: number;
  state: StaffTableState;
  started_at: string | null;
  ready_item_count: number;
  total: string;
  waiter_name?: string | null;
  waiter_id?: number | null;
};

export type StaffReadyItem = {
  id: number;
  name: string;
  quantity: number;
};

export type StaffReadyTable = {
  table_number: number;
  items: StaffReadyItem[];
};

export type StaffOpenRequest = {
  id: number;
  table_number: number;
  type: StaffRequestType;
  is_high_priority: boolean;
  created_at: string;
};

export type StaffPreparingItem = {
  id: number;
  name: string;
  quantity: number;
  status: 'preparing';
  preparation_started_at: string;
  estimated_ready_at: string;
};

export type StaffPreparingTable = {
  table_number: number;
  waiter_id: number;
  items: StaffPreparingItem[];
};

export type StaffDashboard = {
  summary: StaffDashboardSummary;
  tables: StaffDashboardTable[];
  ready_to_serve: StaffReadyTable[];
  requests: StaffOpenRequest[];
  preparing_orders: StaffPreparingTable[];
};

export type StaffPaymentMethod = 'cash' | 'card' | 'mb_way';

export type StaffPaymentPayload = {
  method: StaffPaymentMethod;
  tip_amount: number;
  waste_count: number;
};

export type StaffPaymentResponse = {
  session_id: number;
  amount_paid: string;
  method: string;
  tip_amount: string;
  waste_count: number;
  paid_at: string;
};

export type StaffSessionBillGuest = {
  guest_id: number;
  label: string;
  buffet_total: string;
  extras_total: string;
  total: string;
};

export type StaffSessionBill = {
  session_id: number;
  guests: StaffSessionBillGuest[];
  subtotal: string;
  waste_box_count: number;
  waste_total: string;
  tip_amount: string;
  total: string;
  is_paid: boolean;
  paid_at: string | null;
};
