import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, buildWebSocketUrl } from '../../../services/api/client';
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
  return buildWebSocketUrl('/kitchen/ws');
}

export function useKitchenTicketsFeed(backupPollIntervalMs = 30_000): KitchenTicketsFeed {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const latestRequestIdRef = useRef(0);
  // Bumped on every applied snapshot (WS or poll) -- lets a poll detect a newer WS push and discard itself.
  const updateSeqRef = useRef(0);
  // The in-flight fetch's controller, aborted on unmount so it doesn't keep running for nothing.
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    const requestId = ++latestRequestIdRef.current;
    const seqAtStart = updateSeqRef.current;
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    try {
      const result = await kitchenService.getTickets(controller.signal);
      if (requestId !== latestRequestIdRef.current) return; // superseded by a newer poll, discard
      if (updateSeqRef.current !== seqAtStart) return; // a newer update already landed, discard
      updateSeqRef.current += 1;
      setTickets(result);
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // cancelled on unmount, not a real failure
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
        if (!isMounted) return; // a message already queued before close() can still fire
        const payload = JSON.parse(event.data) as { tickets: KitchenTicket[] };
        updateSeqRef.current += 1; // always wins over any poll already in flight
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
    const intervalId = setInterval(() => {
      if (document.visibilityState !== 'hidden') void refetch();
    }, backupPollIntervalMs);

    // A connection can die silently (laptop sleep, network switch) without firing `onclose`,
    // so catch up when the tab is visible again: force a reconnect if the socket isn't OPEN, and refetch either way.
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return;

      if (socket && socket.readyState !== WebSocket.OPEN) {
        if (reconnectTimeoutId !== null) {
          clearTimeout(reconnectTimeoutId);
          reconnectTimeoutId = null;
        }
        socket.onclose = null; // deliberately discarded, not a failure to back off from
        socket.close();
        reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS; // a fresh attempt, not a repeated failure
        connect();
      }

      refetch();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      if (reconnectTimeoutId !== null) clearTimeout(reconnectTimeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket?.close();
      activeAbortControllerRef.current?.abort();
    };
  }, [refetch, backupPollIntervalMs]);

  return { tickets, isLoading, error, refetch };
}
