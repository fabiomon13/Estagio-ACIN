import { useCallback, useEffect, useState } from 'react';
import * as adminPaymentsService from '../services/adminPaymentsService';
import type {
  AdminPaymentHistoryFilters,
  AdminPaymentHistoryItem,
} from '../types/adminPayments.types';

const PAGE_SIZE = 15;

export type UseAdminPaymentHistory = {
  items: AdminPaymentHistoryItem[];
  totalCount: number;
  filters: AdminPaymentHistoryFilters;
  setFilters: (update: (current: AdminPaymentHistoryFilters) => AdminPaymentHistoryFilters) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  isLoading: boolean;
  error: Error | null;
};

export function useAdminPaymentHistory(): UseAdminPaymentHistory {
  const [filters, setFiltersState] = useState<AdminPaymentHistoryFilters>({});
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminPaymentHistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const setFilters = useCallback(
    (update: (current: AdminPaymentHistoryFilters) => AdminPaymentHistoryFilters) => {
      setFiltersState(update);
      setPage(1); // any filter change starts back at page 1
    },
    [],
  );

  useEffect(() => {
    async function loadPaymentHistory() {
      setIsLoading(true);
      try {
        const result = await adminPaymentsService.getPaymentHistory(
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
    loadPaymentHistory();
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
