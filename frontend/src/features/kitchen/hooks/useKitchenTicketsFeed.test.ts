import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/client';
import * as kitchenService from '../services/kitchenService';
import { useKitchenTicketsFeed } from './useKitchenTicketsFeed';
import type { KitchenTicket } from '../types/kitchen.types';

vi.mock('../services/kitchenService');

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

// Flushes the microtask chain of the currently in-flight fetch without
// advancing virtual time far enough to trigger the next scheduled poll.
async function flushCurrentFetch() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function advancePastNextPoll(intervalMs: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
  });
}

describe('useKitchenTicketsFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('fetches on mount and populates tickets, isLoading goes true -> false', async () => {
    vi.mocked(kitchenService.getTickets).mockResolvedValue([makeTicket(1)]);

    const { result } = renderHook(() => useKitchenTicketsFeed(10_000));

    expect(result.current.isLoading).toBe(true);

    await flushCurrentFetch();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.tickets.map((ticket) => ticket.order_id)).toEqual([1]);
  });

  it('polls again after intervalMs', async () => {
    vi.mocked(kitchenService.getTickets)
      .mockResolvedValueOnce([makeTicket(1)])
      .mockResolvedValueOnce([makeTicket(2)]);

    renderHook(() => useKitchenTicketsFeed(10_000));

    await flushCurrentFetch();
    expect(kitchenService.getTickets).toHaveBeenCalledTimes(1);

    await advancePastNextPoll(10_000);
    expect(kitchenService.getTickets).toHaveBeenCalledTimes(2);
  });

  it('isLoading never becomes true again after the initial load', async () => {
    vi.mocked(kitchenService.getTickets).mockResolvedValue([]);

    const { result } = renderHook(() => useKitchenTicketsFeed(10_000));

    await flushCurrentFetch();
    expect(result.current.isLoading).toBe(false);

    await advancePastNextPoll(10_000);
    expect(result.current.isLoading).toBe(false);
  });

  it('keeps the previous tickets and sets error when a fetch fails', async () => {
    vi.mocked(kitchenService.getTickets)
      .mockResolvedValueOnce([makeTicket(1)])
      .mockRejectedValueOnce(new ApiError(500, 'Server error'));

    const { result } = renderHook(() => useKitchenTicketsFeed(10_000));

    await flushCurrentFetch();
    await advancePastNextPoll(10_000);

    expect(result.current.tickets.map((ticket) => ticket.order_id)).toEqual([1]);
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('does not replace the error object on consecutive failed polls', async () => {
    vi.mocked(kitchenService.getTickets).mockRejectedValue(new ApiError(500, 'Server error'));

    const { result } = renderHook(() => useKitchenTicketsFeed(10_000));

    await flushCurrentFetch();
    const firstError = result.current.error;
    expect(firstError).not.toBeNull();

    await advancePastNextPoll(10_000);

    expect(result.current.error).toBe(firstError);
  });

  it('clears the error after a successful poll following a failure', async () => {
    vi.mocked(kitchenService.getTickets)
      .mockRejectedValueOnce(new ApiError(500, 'Server error'))
      .mockResolvedValueOnce([makeTicket(1)]);

    const { result } = renderHook(() => useKitchenTicketsFeed(10_000));

    await flushCurrentFetch();
    expect(result.current.error).not.toBeNull();

    await advancePastNextPoll(10_000);

    expect(result.current.error).toBeNull();
  });

  it('produces a new error transition after a failure that follows a recovery', async () => {
    vi.mocked(kitchenService.getTickets)
      .mockRejectedValueOnce(new ApiError(500, 'First error'))
      .mockResolvedValueOnce([makeTicket(1)])
      .mockRejectedValueOnce(new ApiError(500, 'Second error'));

    const { result } = renderHook(() => useKitchenTicketsFeed(10_000));

    await flushCurrentFetch();
    const firstError = result.current.error;

    await advancePastNextPoll(10_000);
    expect(result.current.error).toBeNull();

    await advancePastNextPoll(10_000);

    expect(result.current.error).not.toBeNull();
    expect(result.current.error).not.toBe(firstError);
  });

  it('refetch() triggers an immediate fetch outside the interval and resolves once settled', async () => {
    vi.mocked(kitchenService.getTickets).mockResolvedValue([makeTicket(1)]);

    const { result } = renderHook(() => useKitchenTicketsFeed(10_000));

    await flushCurrentFetch();
    expect(kitchenService.getTickets).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(kitchenService.getTickets).toHaveBeenCalledTimes(2);
  });

  it('discards an older response that resolves after a newer one', async () => {
    let resolveFirst!: (tickets: KitchenTicket[]) => void;
    const firstCall = new Promise<KitchenTicket[]>((resolve) => {
      resolveFirst = resolve;
    });

    vi.mocked(kitchenService.getTickets)
      .mockImplementationOnce(() => firstCall)
      .mockResolvedValueOnce([makeTicket(2)]);

    const { result } = renderHook(() => useKitchenTicketsFeed(10_000));

    // Initial fetch (older, still pending) started on mount.
    await act(async () => {
      await Promise.resolve();
    });

    // Manual refetch (newer) resolves first.
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.tickets.map((ticket) => ticket.order_id)).toEqual([2]);

    // The older, first request finally resolves late -- must not overwrite.
    await act(async () => {
      resolveFirst([makeTicket(1)]);
      await Promise.resolve();
    });

    expect(result.current.tickets.map((ticket) => ticket.order_id)).toEqual([2]);
  });

  it('does not fetch again after unmount', async () => {
    vi.mocked(kitchenService.getTickets).mockResolvedValue([]);

    const { unmount } = renderHook(() => useKitchenTicketsFeed(10_000));

    await flushCurrentFetch();
    expect(kitchenService.getTickets).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(kitchenService.getTickets).toHaveBeenCalledTimes(1);
  });
});
