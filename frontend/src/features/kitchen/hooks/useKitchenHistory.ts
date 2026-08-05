import { useCallback, useEffect, useState } from 'react';
import * as kitchenHistoryService from '../services/kitchenHistoryService';
import type {
  KitchenHistoryFilterOptions,
  KitchenHistoryFilters,
  KitchenHistoryItem,
  KitchenHistorySummary,
} from '../types/kitchenHistory.types';

const PAGE_SIZE = 15;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultFilters(): KitchenHistoryFilters {
  return { dateFrom: todayIsoDate() };
}

export type UseKitchenHistory = {
  items: KitchenHistoryItem[];
  totalCount: number;
  summary: KitchenHistorySummary;
  filterOptions: KitchenHistoryFilterOptions;
  filters: KitchenHistoryFilters;
  setFilters: (update: (current: KitchenHistoryFilters) => KitchenHistoryFilters) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  isLoading: boolean;
  error: Error | null;
};

export function useKitchenHistory(): UseKitchenHistory {
  const [filters, setFiltersState] = useState<KitchenHistoryFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<KitchenHistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<KitchenHistorySummary>({
    counts: {},
    busiest_station: null,
    peak_hour: null,
  });
  const [filterOptions, setFilterOptions] = useState<KitchenHistoryFilterOptions>({
    items: [],
    stations: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const setFilters = useCallback(
    (update: (current: KitchenHistoryFilters) => KitchenHistoryFilters) => {
      setFiltersState(update);
      setPage(1); // any filter change starts back at page 1
    },
    [],
  );

  // Filter options: fetched once, on mount.
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const options = await kitchenHistoryService.getHistoryFilterOptions();
        setFilterOptions(options);
      } catch (err: unknown) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    }
    loadFilterOptions();
  }, []);

  // Summary: refetches when filters change, but NOT on a page-only change.
  useEffect(() => {
    async function loadSummary() {
      try {
        const result = await kitchenHistoryService.getHistorySummary(filters);
        setSummary(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    }
    loadSummary();
  }, [filters]);

  // List: refetches when filters OR page change.
  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      try {
        const result = await kitchenHistoryService.getHistory(
          filters,
          PAGE_SIZE,
          (page - 1) * PAGE_SIZE,
        );
        setItems(result.items);
        setTotalCount(result.total_count);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, [filters, page]);

  return {
    items,
    totalCount,
    summary,
    filterOptions,
    filters,
    setFilters,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    isLoading,
    error,
  };
}
