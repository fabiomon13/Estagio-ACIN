import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/client';
import * as kitchenService from '../services/kitchenService';
import type { KitchenTicket } from '../types/kitchen.types';

// Transport layer -- owns *how* data arrives (polling today). The only file
// that should need to change for a future websocket swap.
export type KitchenTicketsFeed = {
  tickets: KitchenTicket[];
  isLoading: boolean;
  error: ApiError | Error | null;
  refetch: () => Promise<void>;
};

function normalizeError(err: unknown): ApiError | Error {
  return err instanceof Error ? err : new Error(String(err));
}

export function useKitchenTicketsFeed(intervalMs = 10_000): KitchenTicketsFeed {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const latestRequestIdRef = useRef(0);

  const refetch = useCallback(async (): Promise<void> => {
    const requestId = ++latestRequestIdRef.current;

    try {
      const result = await kitchenService.getTickets();
      if (requestId !== latestRequestIdRef.current) return; // superseded, discard
      setTickets(result);
      setError(null);
    } catch (err) {
      if (requestId !== latestRequestIdRef.current) return;
      // Only the first failure replaces `error` -- keeps it stable across repeated polls.
      setError((prev) => (prev === null ? normalizeError(err) : prev));
    } finally {
      if (requestId === latestRequestIdRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const intervalId = setInterval(refetch, intervalMs);
    return () => clearInterval(intervalId);
  }, [refetch, intervalMs]);

  return { tickets, isLoading, error, refetch };
}
