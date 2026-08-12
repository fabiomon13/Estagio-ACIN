import { apiFetch } from '../../../services/api/client';
import type {
  AdminSessionHistoryFilters,
  AdminSessionHistoryListResult,
} from '../types/adminSessions.types';

export function getSessionHistory(
  filters: AdminSessionHistoryFilters,
  limit: number,
  offset: number,
): Promise<AdminSessionHistoryListResult> {
  const params = new URLSearchParams();
  params.set('only_active', String(filters.onlyActive ?? false));
  params.set('limit', String(limit));
  params.set('offset', String(offset));

  return apiFetch<AdminSessionHistoryListResult>(`/staff/sessions?${params.toString()}`);
}
