import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/client';
import * as kitchenService from '../services/kitchenService';
import { useKitchenTicketsFeed } from './useKitchenTicketsFeed';
import type { KitchenTicket } from '../types/kitchen.types';

vi.mock('../services/kitchenService');

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;
  url: string;
  readyState = FakeWebSocket.OPEN;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  close(): void {
    this.closed = true;
    this.readyState = FakeWebSocket.CLOSED;
  }
}

function goVisible() {
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

function makeTicket(orderId: number): KitchenTicket {
  return {
    order_id: orderId,
    table_number: 1,
    guest_number: 1,
    round_number: 1,
    created_at: '2026-07-30T12:00:00Z',
    items: [],
  };
}

async function flushCurrentFetch() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function advanceBy(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('useKitchenTicketsFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000/api');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('fetches on mount and populates tickets, isLoading goes true -> false', async () => {
    vi.mocked(kitchenService.getTickets).mockResolvedValue([makeTicket(1)]);

    const { result } = renderHook(() => useKitchenTicketsFeed(30_000));

    expect(result.current.isLoading).toBe(true);

    await flushCurrentFetch();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.tickets.map((ticket) => ticket.order_id)).toEqual([1]);
  });

  it('opens a WebSocket to the derived ws:// URL on mount', async () => {
    vi.mocked(kitchenService.getTickets).mockResolvedValue([]);

    renderHook(() => useKitchenTicketsFeed(30_000));
    await flushCurrentFetch();

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe('ws://localhost:8000/api/kitchen/ws');
  });

  it('replaces tickets when a WebSocket message arrives', async () => {
    vi.mocked(kitchenService.getTickets).mockResolvedValue([makeTicket(1)]);

    const { result } = renderHook(() => useKitchenTicketsFeed(30_000));
    await flushCurrentFetch();

    act(() => {
      FakeWebSocket.instances[0].onmessage?.({
        data: JSON.stringify({ tickets: [makeTicket(2), makeTicket(3)] }),
      });
    });

    expect(result.current.tickets.map((ticket) => ticket.order_id)).toEqual([2, 3]);
  });

  it('backup-polls again after backupPollIntervalMs', async () => {
    vi.mocked(kitchenService.getTickets)
      .mockResolvedValueOnce([makeTicket(1)])
      .mockResolvedValueOnce([makeTicket(2)]);

    renderHook(() => useKitchenTicketsFeed(30_000));

    await flushCurrentFetch();
    expect(kitchenService.getTickets).toHaveBeenCalledTimes(1);

    await advanceBy(30_000);
    expect(kitchenService.getTickets).toHaveBeenCalledTimes(2);
  });

  it('reconnects with a 1s initial delay after the socket closes', async () => {
    vi.mocked(kitchenService.getTickets).mockResolvedValue([]);

    renderHook(() => useKitchenTicketsFeed(30_000));
    await flushCurrentFetch();
    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => {
      FakeWebSocket.instances[0].onclose?.();
    });

    await advanceBy(999);
    expect(FakeWebSocket.instances).toHaveLength(1); // not yet

    await advanceBy(1);
    expect(FakeWebSocket.instances).toHaveLength(2); // reconnected
  });

  it('doubles the reconnect delay on a second consecutive failure, capped at 30s', async () => {
    vi.mocked(kitchenService.getTickets).mockResolvedValue([]);

    renderHook(() => useKitchenTicketsFeed(30_000));
    await flushCurrentFetch();

    act(() => {
      FakeWebSocket.instances[0].onclose?.();
    });
    await advanceBy(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);

    act(() => {
      FakeWebSocket.instances[1].onclose?.();
    });
    await advanceBy(1999);
    expect(FakeWebSocket.instances).toHaveLength(2); // not yet -- needs 2s this time
    await advanceBy(1);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it('resets the reconnect delay back to 1s after a successful onopen', async () => {
    vi.mocked(kitchenService.getTickets).mockResolvedValue([]);

    renderHook(() => useKitchenTicketsFeed(30_000));
    await flushCurrentFetch();

    act(() => {
      FakeWebSocket.instances[0].onclose?.();
    });
    await advanceBy(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);

    act(() => {
      FakeWebSocket.instances[1].onopen?.();
      FakeWebSocket.instances[1].onclose?.();
    });
    await advanceBy(999);
    expect(FakeWebSocket.instances).toHaveLength(2); // not yet -- back to 1s, not 2s
    await advanceBy(1);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it('force-reconnects a zombie socket when the tab regains visibility', async () => {
    vi.mocked(kitchenService.getTickets).mockResolvedValue([]);

    renderHook(() => useKitchenTicketsFeed(30_000));
    await flushCurrentFetch();
    expect(FakeWebSocket.instances).toHaveLength(1);

    // Simulate a connection that died silently (laptop slept, network
    // switched): readyState is no longer OPEN, but onclose never fired, so
    // the normal backoff/reconnect loop never started.
    FakeWebSocket.instances[0].readyState = FakeWebSocket.CLOSED;

    goVisible();
    await flushCurrentFetch();

    // A fresh connection was opened immediately -- no waiting for onclose,
    // no backoff delay.
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('does not force a reconnect on visibility regain when the socket is genuinely still open', async () => {
    vi.mocked(kitchenService.getTickets).mockResolvedValue([]);

    renderHook(() => useKitchenTicketsFeed(30_000));
    await flushCurrentFetch();
    FakeWebSocket.instances[0].readyState = FakeWebSocket.OPEN;

    goVisible();
    await flushCurrentFetch();

    expect(FakeWebSocket.instances).toHaveLength(1); // no reconnect needed
  });

  it('refetches immediately on visibility regain, as a catch-up safety net', async () => {
    vi.mocked(kitchenService.getTickets).mockResolvedValue([]);

    renderHook(() => useKitchenTicketsFeed(30_000));
    await flushCurrentFetch();
    expect(kitchenService.getTickets).toHaveBeenCalledTimes(1);
    FakeWebSocket.instances[0].readyState = FakeWebSocket.OPEN; // healthy connection

    goVisible();
    await flushCurrentFetch();

    // Still refetches even though the socket itself didn't need reconnecting.
    expect(kitchenService.getTickets).toHaveBeenCalledTimes(2);
  });

  it('discards a stale poll response that resolves after a newer WebSocket message arrived', async () => {
    vi.mocked(kitchenService.getTickets).mockResolvedValueOnce([makeTicket(1)]);

    const { result } = renderHook(() => useKitchenTicketsFeed(30_000));
    await flushCurrentFetch(); // initial mount fetch resolves with ticket 1

    // The next backup poll won't resolve until we say so.
    let resolveSlowPoll!: (tickets: KitchenTicket[]) => void;
    vi.mocked(kitchenService.getTickets).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSlowPoll = resolve;
        }),
    );

    // The 30s backup poll fires and starts (but is still in flight).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    // A real-time WebSocket update lands while that poll is still pending.
    act(() => {
      FakeWebSocket.instances[0].onmessage?.({
        data: JSON.stringify({ tickets: [makeTicket(2)] }),
      });
    });
    expect(result.current.tickets.map((ticket) => ticket.order_id)).toEqual([2]);

    // The slow poll finally resolves -- with data captured BEFORE the WS update.
    await act(async () => {
      resolveSlowPoll([makeTicket(1)]);
      await vi.advanceTimersByTimeAsync(0);
    });

    // The stale response must not overwrite the newer, WS-pushed state.
    expect(result.current.tickets.map((ticket) => ticket.order_id)).toEqual([2]);
  });

  it('keeps the previous tickets and sets error when a backup poll fails', async () => {
    vi.mocked(kitchenService.getTickets)
      .mockResolvedValueOnce([makeTicket(1)])
      .mockRejectedValueOnce(new ApiError(500, 'Server error'));

    const { result } = renderHook(() => useKitchenTicketsFeed(30_000));

    await flushCurrentFetch();
    await advanceBy(30_000);

    expect(result.current.tickets.map((ticket) => ticket.order_id)).toEqual([1]);
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('refetch() triggers an immediate REST fetch outside the interval', async () => {
    vi.mocked(kitchenService.getTickets).mockResolvedValue([makeTicket(1)]);

    const { result } = renderHook(() => useKitchenTicketsFeed(30_000));

    await flushCurrentFetch();
    expect(kitchenService.getTickets).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(kitchenService.getTickets).toHaveBeenCalledTimes(2);
  });

  it('closes the socket and stops reconnecting/polling after unmount', async () => {
    vi.mocked(kitchenService.getTickets).mockResolvedValue([]);

    const { unmount } = renderHook(() => useKitchenTicketsFeed(30_000));
    await flushCurrentFetch();

    const socket = FakeWebSocket.instances[0];
    unmount();

    expect(socket.closed).toBe(true);

    act(() => {
      socket.onclose?.();
    });
    await advanceBy(60_000);

    expect(FakeWebSocket.instances).toHaveLength(1); // no reconnect attempted after unmount
    expect(kitchenService.getTickets).toHaveBeenCalledTimes(1); // no further backup polls either
  });

  it('aborts the in-flight fetch on unmount instead of leaving it running', async () => {
    let capturedSignal: AbortSignal | undefined;
    vi.mocked(kitchenService.getTickets).mockImplementationOnce((signal?: AbortSignal) => {
      capturedSignal = signal;
      return new Promise(() => {}); // never resolves -- only the abort matters
    });

    const { unmount } = renderHook(() => useKitchenTicketsFeed(30_000));

    expect(capturedSignal?.aborted).toBe(false);

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });
});
