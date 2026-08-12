import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../../services/api/client';
import * as kitchenService from '../../services/kitchenService';
import { useKitchenTickets } from '../useKitchenTickets';
import { useKitchenTicketsFeed } from '../useKitchenTicketsFeed';
import type { KitchenTicket } from '../../types/kitchen.types';

vi.mock('../../services/kitchenService');
vi.mock('../useKitchenTicketsFeed');

const showToastMock = vi.fn();
vi.mock('../../../../components/ui/toast/useToast', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

const notifyMock = vi.fn();
vi.mock('../../components/kitchen-notification/useKitchenNotifications', () => ({
  useKitchenNotifications: () => ({ notify: notifyMock }),
}));

function makeTicket(
  itemStatus: 'Pending' | 'Preparing' | 'Ready' | 'Cancelled' = 'Pending',
): KitchenTicket {
  return {
    order_id: 1,
    table_number: 1,
    guest_number: 1,
    round_number: 1,
    created_at: '2026-07-30T12:00:00Z',
    items: [
      {
        order_item_id: 501,
        menu_item_name: 'Test Dish',
        quantity: 1,
        notes: null,
        tags: [],
        matched_allergens: [],
        station_id: 1,
        station: 'Hot/Wok',
        status: itemStatus,
        created_at: '2026-07-30T12:00:00Z',
      },
    ],
  };
}

function mockFeed(tickets: KitchenTicket[], refetch = vi.fn()) {
  vi.mocked(useKitchenTicketsFeed).mockReturnValue({
    tickets,
    isLoading: false,
    error: null,
    refetch,
  });
}

describe('useKitchenTickets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('updates the item locally before the request resolves', async () => {
    mockFeed([makeTicket('Pending')]);
    let resolveUpdate!: () => void;
    vi.mocked(kitchenService.updateItemStatus).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = () => resolve({} as never);
      }),
    );

    const { result } = renderHook(() => useKitchenTickets());

    act(() => {
      result.current.updateStatus(501, 'Preparing');
    });

    expect(result.current.tickets[0].items[0].status).toBe('Preparing');

    await act(async () => {
      resolveUpdate();
      await Promise.resolve();
    });
  });

  it('does not flicker back when a stale poll (fetched before the click) lands while the mutation is still in flight', async () => {
    let resolveUpdate!: () => void;
    vi.mocked(kitchenService.updateItemStatus).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = () => resolve({} as never);
      }),
    );

    const feedTickets = { current: [makeTicket('Pending')] };
    vi.mocked(useKitchenTicketsFeed).mockImplementation(() => ({
      tickets: feedTickets.current,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }));

    const { result, rerender } = renderHook(() => useKitchenTickets());

    act(() => {
      result.current.updateStatus(501, 'Preparing');
    });
    expect(result.current.tickets[0].items[0].status).toBe('Preparing');

    // A poll that was already in flight before the click resolves with the
    // old (still Pending) snapshot -- must not overwrite the optimistic Preparing.
    feedTickets.current = [makeTicket('Pending')];
    rerender();
    expect(result.current.tickets[0].items[0].status).toBe('Preparing');

    await act(async () => {
      resolveUpdate();
      await Promise.resolve();
    });

    expect(result.current.tickets[0].items[0].status).toBe('Preparing');
  });

  it('keeps the optimistic state on success', async () => {
    mockFeed([makeTicket('Pending')]);
    vi.mocked(kitchenService.updateItemStatus).mockResolvedValue({} as never);

    const { result } = renderHook(() => useKitchenTickets());

    await act(async () => {
      result.current.updateStatus(501, 'Preparing');
      await Promise.resolve();
    });

    expect(result.current.tickets[0].items[0].status).toBe('Preparing');
  });

  it('reverts and calls refetch on a 409 failure', async () => {
    const refetch = vi.fn();
    mockFeed([makeTicket('Pending')], refetch);
    vi.mocked(kitchenService.updateItemStatus).mockRejectedValue(
      new ApiError(409, 'O estado do item mudou entretanto, tenta novamente'),
    );

    const { result } = renderHook(() => useKitchenTickets());

    await act(async () => {
      result.current.updateStatus(501, 'Preparing');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.tickets[0].items[0].status).toBe('Pending');
    expect(refetch).toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'danger' }));
  });

  it('reverts without calling refetch on a non-409 failure', async () => {
    const refetch = vi.fn();
    mockFeed([makeTicket('Pending')], refetch);
    vi.mocked(kitchenService.updateItemStatus).mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useKitchenTickets());

    await act(async () => {
      result.current.updateStatus(501, 'Preparing');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.tickets[0].items[0].status).toBe('Pending');
    expect(refetch).not.toHaveBeenCalled();
  });

  it('does not stomp a status a poll already advanced past the failed optimistic update', async () => {
    let rejectUpdate!: (err: Error) => void;
    vi.mocked(kitchenService.updateItemStatus).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectUpdate = reject;
      }),
    );

    const feedTickets = { current: [makeTicket('Pending')] };
    vi.mocked(useKitchenTicketsFeed).mockImplementation(() => ({
      tickets: feedTickets.current,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }));

    const { result, rerender } = renderHook(() => useKitchenTickets());

    act(() => {
      result.current.updateStatus(501, 'Preparing');
    });
    expect(result.current.tickets[0].items[0].status).toBe('Preparing');

    // A poll lands with fresher data: another chef already advanced this item further.
    feedTickets.current = [makeTicket('Ready')];
    rerender();
    expect(result.current.tickets[0].items[0].status).toBe('Ready');

    // The original (now stale) request finally fails -- must not stomp the fresher status.
    await act(async () => {
      rejectUpdate(new Error('stale'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.tickets[0].items[0].status).toBe('Ready');
  });

  it('ignores a second updateStatus call for the same item while one is pending', async () => {
    mockFeed([makeTicket('Pending')]);
    let resolveUpdate!: () => void;
    vi.mocked(kitchenService.updateItemStatus).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = () => resolve({} as never);
      }),
    );

    const { result } = renderHook(() => useKitchenTickets());

    act(() => {
      result.current.updateStatus(501, 'Preparing');
      result.current.updateStatus(501, 'Preparing');
    });

    expect(kitchenService.updateItemStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate();
      await Promise.resolve();
    });
  });

  it('fires a toast when a poll shows an item that just became Cancelled', () => {
    const feedTickets = { current: [makeTicket('Pending')] };
    vi.mocked(useKitchenTicketsFeed).mockImplementation(() => ({
      tickets: feedTickets.current,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }));

    const { rerender } = renderHook(() => useKitchenTickets());

    feedTickets.current = [makeTicket('Cancelled')];
    rerender();

    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'danger', title: 'Pedido cancelado' }),
    );
  });

  it('does not toast on first mount for an item that is already Cancelled', () => {
    mockFeed([makeTicket('Cancelled')]);

    renderHook(() => useKitchenTickets());

    expect(showToastMock).not.toHaveBeenCalled();
  });

  it('does not re-fire the toast on repeated polls while the item stays Cancelled', () => {
    const feedTickets = { current: [makeTicket('Pending')] };
    vi.mocked(useKitchenTicketsFeed).mockImplementation(() => ({
      tickets: feedTickets.current,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }));

    const { rerender } = renderHook(() => useKitchenTickets());

    feedTickets.current = [makeTicket('Cancelled')];
    rerender();
    expect(showToastMock).toHaveBeenCalledTimes(1);

    feedTickets.current = [makeTicket('Cancelled')]; // new array reference, same status
    rerender();
    expect(showToastMock).toHaveBeenCalledTimes(1);
  });

  it('calls notify with a new-order event when a ticket not seen before appears on a later poll', () => {
    const feedTickets = { current: [makeTicket('Pending')] };
    vi.mocked(useKitchenTicketsFeed).mockImplementation(() => ({
      tickets: feedTickets.current,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }));

    const { rerender } = renderHook(() => useKitchenTickets());

    const secondTicket: KitchenTicket = {
      ...makeTicket('Pending'),
      order_id: 2,
      table_number: 9,
    };
    feedTickets.current = [feedTickets.current[0], secondTicket];
    rerender();

    expect(notifyMock).toHaveBeenCalledWith({
      type: 'new-order',
      message: 'Novo pedido — Mesa 9',
    });
  });

  it('does not call notify for tickets already on the board on first mount', () => {
    mockFeed([makeTicket('Pending')]);

    renderHook(() => useKitchenTickets());

    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('does not fire new-order for tickets already on the board when the initial fetch resolves (loading -> loaded)', () => {
    const feedState = { current: { tickets: [] as KitchenTicket[], isLoading: true } };
    vi.mocked(useKitchenTicketsFeed).mockImplementation(() => ({
      tickets: feedState.current.tickets,
      isLoading: feedState.current.isLoading,
      error: null,
      refetch: vi.fn(),
    }));

    const { rerender } = renderHook(() => useKitchenTickets());

    // Simulates the initial fetch resolving: tickets go from [] to real
    // data, isLoading flips to false -- this used to fire new-order for
    // every ticket already on the board, since the empty first render had
    // already "consumed" the isFirstRun guard against a still-empty set.
    feedState.current = { tickets: [makeTicket('Pending')], isLoading: false };
    rerender();

    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('still fires the cancellation toast independently of the new notify effect', () => {
    const feedTickets = { current: [makeTicket('Pending')] };
    vi.mocked(useKitchenTicketsFeed).mockImplementation(() => ({
      tickets: feedTickets.current,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }));

    const { rerender } = renderHook(() => useKitchenTickets());

    feedTickets.current = [makeTicket('Cancelled')];
    rerender();

    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'danger', title: 'Pedido cancelado' }),
    );
    // The cancellation path uses the old Toast, not the new notify().
    expect(notifyMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('cancel') }),
    );
  });

  it('fires ready-too-long from the passage of time alone, with no new ticket data arriving', () => {
    vi.useFakeTimers();
    try {
      mockFeed([makeTicket('Ready')]);

      renderHook(() => useKitchenTickets());
      expect(notifyMock).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(70_000); // past the 1-minute threshold; feed.tickets never changes
      });

      expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'ready-too-long' }));
    } finally {
      vi.useRealTimers();
    }
  });

  it('updateStatusAsync resolves true on success and keeps the optimistic state', async () => {
    mockFeed([makeTicket('Pending')]);
    vi.mocked(kitchenService.updateItemStatus).mockResolvedValue({} as never);

    const { result } = renderHook(() => useKitchenTickets());

    let resolvedValue: boolean | undefined;
    await act(async () => {
      resolvedValue = await result.current.updateStatusAsync(501, 'Preparing');
    });

    expect(resolvedValue).toBe(true);
    expect(result.current.tickets[0].items[0].status).toBe('Preparing');
  });

  it('updateStatusAsync resolves false, reverts, and toasts on failure', async () => {
    mockFeed([makeTicket('Pending')]);
    vi.mocked(kitchenService.updateItemStatus).mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useKitchenTickets());

    let resolvedValue: boolean | undefined;
    await act(async () => {
      resolvedValue = await result.current.updateStatusAsync(501, 'Preparing');
    });

    expect(resolvedValue).toBe(false);
    expect(result.current.tickets[0].items[0].status).toBe('Pending');
    expect(showToastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'danger' }));
  });

  it('updateStatusAsync resolves false without a network call when the item already has one in flight', async () => {
    mockFeed([makeTicket('Pending')]);
    let resolveUpdate!: () => void;
    vi.mocked(kitchenService.updateItemStatus).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = () => resolve({} as never);
      }),
    );

    const { result } = renderHook(() => useKitchenTickets());

    act(() => {
      result.current.updateStatus(501, 'Preparing');
    });

    let secondCallResolved: boolean | undefined;
    await act(async () => {
      secondCallResolved = await result.current.updateStatusAsync(501, 'Ready');
    });

    expect(secondCallResolved).toBe(false);
    expect(kitchenService.updateItemStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate();
      await Promise.resolve();
    });
  });

  it('updateStatusAsync with an optimistic override displays the override status, not the requested one', async () => {
    mockFeed([makeTicket('Pending')]);
    vi.mocked(kitchenService.updateItemStatus).mockResolvedValue({} as never);

    const { result } = renderHook(() => useKitchenTickets());

    await act(async () => {
      await result.current.updateStatusAsync(501, 'Preparing', {
        display: 'Ready',
        revertTo: 'Pending',
      });
    });

    // Requested status was "Preparing" (what the backend was asked for),
    // but the display override means the UI shows "Ready" the whole time.
    expect(kitchenService.updateItemStatus).toHaveBeenCalledWith(501, 'Preparing');
    expect(result.current.tickets[0].items[0].status).toBe('Ready');
  });

  it('updateStatusAsync with an optimistic override reverts to revertTo (not the pre-call status) on failure', async () => {
    mockFeed([makeTicket('Pending')]);
    vi.mocked(kitchenService.updateItemStatus).mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useKitchenTickets());

    await act(async () => {
      await result.current.updateStatusAsync(501, 'Ready', {
        display: 'Ready',
        revertTo: 'Preparing',
      });
    });

    // Even though the item's status right before this call was "Pending",
    // revertTo says the real backend truth is "Preparing" -- that's where
    // it must settle, not back at "Pending".
    expect(result.current.tickets[0].items[0].status).toBe('Preparing');
  });
});
