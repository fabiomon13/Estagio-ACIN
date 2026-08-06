import { apiFetch } from '../../../services/api/client';
import type {
  KitchenHistoryFilterOptions,
  KitchenHistoryFilters,
  KitchenHistoryListResult,
  KitchenHistorySummary,
} from '../types/kitchenHistory.types';

function buildQueryString(
  filters: KitchenHistoryFilters,
  extra: Record<string, number | undefined> = {},
): string {
  const params = new URLSearchParams();
  params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  if (filters.status) params.set('status', filters.status);
  if (filters.tableNumber !== undefined) params.set('table_number', String(filters.tableNumber));
  if (filters.itemId !== undefined) params.set('item_id', String(filters.itemId));
  if (filters.stationId !== undefined) params.set('station_id', String(filters.stationId));
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}

export function getHistory(
  filters: KitchenHistoryFilters,
  limit: number,
  offset: number,
): Promise<KitchenHistoryListResult> {
  const query = buildQueryString(filters, { limit, offset });
  return apiFetch<KitchenHistoryListResult>(`/kitchen/history?${query}`);
}

export function getHistorySummary(filters: KitchenHistoryFilters): Promise<KitchenHistorySummary> {
  const query = buildQueryString(filters);
  return apiFetch<KitchenHistorySummary>(`/kitchen/history/summary?${query}`);
}

export function getHistoryFilterOptions(): Promise<KitchenHistoryFilterOptions> {
  return apiFetch<KitchenHistoryFilterOptions>('/kitchen/history/filters');
}
