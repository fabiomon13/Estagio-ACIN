export type AdminPaymentHistoryFilters = {
  tableNumber?: number;
  method?: string;
};

export type AdminPaymentHistoryItem = {
  payment_id: number;
  session_id: number;
  table_number: number;
  guest_count: number;
  waiter_name: string | null;
  amount_paid: string;
  tip_amount: string;
  method: string;
  waste_count: number;
  paid_at: string;
};

export type AdminPaymentHistoryListResult = {
  items: AdminPaymentHistoryItem[];
  total_count: number;
};
