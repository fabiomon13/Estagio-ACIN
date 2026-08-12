import { apiFetch } from '../../../services/api/client';
import type {
  AdminPaymentHistoryFilters,
  AdminPaymentHistoryListResult,
} from '../types/adminPayments.types';

export function getPaymentHistory(
  filters: AdminPaymentHistoryFilters,
  limit: number,
  offset: number,
): Promise<AdminPaymentHistoryListResult> {
  const params = new URLSearchParams();
  if (filters.tableNumber !== undefined) params.set('table_number', String(filters.tableNumber));
  if (filters.method) params.set('method', filters.method);
  params.set('limit', String(limit));
  params.set('offset', String(offset));

  return apiFetch<AdminPaymentHistoryListResult>(`/staff/payments?${params.toString()}`);
}
