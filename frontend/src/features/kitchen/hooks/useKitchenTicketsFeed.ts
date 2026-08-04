import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/client';
import * as kitchenService from '../services/kitchenService';
import type { KitchenTicket } from '../types/kitchen.types';

// Transport layer -- owns *how* data arrives (WebSocket + a REST backup
// poll today). The only file that should need to change for a future
// transport swap.
export type KitchenTicketsFeed = {
  tickets: KitchenTicket[];
  isLoading: boolean;
  error: ApiError | Error | null;
  refetch: () => Promise<void>;
};

const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30_000;

function normalizeError(err: unknown): ApiError | Error {
  return err instanceof Error ? err : new Error(String(err));
}

function getWebSocketUrl(): string {
  const apiBaseUrl = import.meta.env.VITE_API_URL as string;
  return `${apiBaseUrl.replace(/^http/, 'ws')}/kitchen/ws`;
}

export function useKitchenTicketsFeed(backupPollIntervalMs = 30_000): KitchenTicketsFeed {
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
    let isMounted = true;
    let socket: WebSocket | null = null;
    let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;

    function connect() {
      socket = new WebSocket(getWebSocketUrl());

      socket.onopen = () => {
        reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS; // reset backoff after a successful connect
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        const payload = JSON.parse(event.data) as { tickets: KitchenTicket[] };
        setTickets(payload.tickets); // full snapshot, replaces state
      };

      socket.onclose = () => {
        if (!isMounted) return; // don't reconnect after unmount
        reconnectTimeoutId = setTimeout(() => {
          reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS); // exponential backoff, capped
          connect();
        }, reconnectDelayMs);
      };
    }

    connect();

    refetch();
    const intervalId = setInterval(refetch, backupPollIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      if (reconnectTimeoutId !== null) clearTimeout(reconnectTimeoutId);
      socket?.close();
    };
  }, [refetch, backupPollIntervalMs]);

  return { tickets, isLoading, error, refetch };
}
