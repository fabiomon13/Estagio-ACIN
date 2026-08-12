import { useCallback, useEffect, useState } from 'react';
import * as adminSessionsService from '../services/adminSessionsService';
import type {
  AdminSessionHistoryFilters,
  AdminSessionHistoryItem,
} from '../types/adminSessions.types';

const PAGE_SIZE = 15;

export type UseAdminSessionHistory = {
  items: AdminSessionHistoryItem[];
  totalCount: number;
  filters: AdminSessionHistoryFilters;
  setFilters: (update: (current: AdminSessionHistoryFilters) => AdminSessionHistoryFilters) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  isLoading: boolean;
  error: Error | null;
};

export function useAdminSessionHistory(): UseAdminSessionHistory {
  const [filters, setFiltersState] = useState<AdminSessionHistoryFilters>({});
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminSessionHistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const setFilters = useCallback(
    (update: (current: AdminSessionHistoryFilters) => AdminSessionHistoryFilters) => {
      setFiltersState(update);
      setPage(1); // any filter change starts back at page 1
    },
    [],
  );

  useEffect(() => {
    async function loadSessionHistory() {
      setIsLoading(true);
      try {
        const result = await adminSessionsService.getSessionHistory(
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
    loadSessionHistory();
  }, [filters, page]);

  return {
    items,
    totalCount,
    filters,
    setFilters,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    isLoading,
    error,
  };
}
