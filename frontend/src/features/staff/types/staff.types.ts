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
  priority: StaffPriority;
  created_at: string;
};

export type StaffDashboard = {
  summary: StaffDashboardSummary;
  tables: StaffDashboardTable[];
  ready_to_serve: StaffReadyTable[];
  requests: StaffOpenRequest[];
};
