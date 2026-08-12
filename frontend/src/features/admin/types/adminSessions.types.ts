export type AdminSessionHistoryFilters = {
  onlyActive?: boolean;
};

export type AdminSessionHistoryItem = {
  id: number;
  table_number: number | null;
  is_active: boolean;
  is_approved: boolean;
  guests_count: number;
  waiter_name: string | null;
  start_time: string;
  end_time: string | null;
  has_payment: boolean;
  payment_total: string | null;
  owed_total: string | null;
};

export type AdminSessionHistoryListResult = {
  items: AdminSessionHistoryItem[];
  total_count: number;
};
