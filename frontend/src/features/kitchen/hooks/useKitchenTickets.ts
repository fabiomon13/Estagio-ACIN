import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api/client';
import { useToast } from '../../../components/ui/toast/useToast';
import * as kitchenService from '../services/kitchenService';
import type {
  KitchenItemStatus,
  KitchenPatchableStatus,
  KitchenTicket,
} from '../types/kitchen.types';
import { useKitchenTicketsFeed } from './useKitchenTicketsFeed';
import { useKitchenNotifications } from '../components/kitchen-notification/useKitchenNotifications';
import { detectNotificationEvents } from '../utils/detectNotificationEvents';
import type { NotificationDetectionState } from '../utils/detectNotificationEvents';

export type UseKitchenTickets = {
  tickets: KitchenTicket[];
  isLoading: boolean;
  error: ApiError | Error | null;
  updateStatus: (orderItemId: number, nextStatus: KitchenPatchableStatus) => void;
};

function setItemStatus(
  tickets: KitchenTicket[],
  orderItemId: number,
  status: KitchenItemStatus,
): KitchenTicket[] {
  return tickets.map((ticket) => ({
    ...ticket,
    items: ticket.items.map((item) =>
      item.order_item_id === orderItemId ? { ...item, status } : item,
    ),
  }));
}

// Skips the revert if a poll already moved the item past our guess.
function revertItemStatusIfUnchanged(
  tickets: KitchenTicket[],
  orderItemId: number,
  optimisticStatus: KitchenItemStatus,
  previousStatus: KitchenItemStatus,
): KitchenTicket[] {
  return tickets.map((ticket) => ({
    ...ticket,
    items: ticket.items.map((item) =>
      item.order_item_id === orderItemId && item.status === optimisticStatus
        ? { ...item, status: previousStatus }
        : item,
    ),
  }));
}

function buildStatusMap(tickets: KitchenTicket[]): Map<number, KitchenItemStatus> {
  const map = new Map<number, KitchenItemStatus>();

  for (const ticket of tickets) {
    for (const item of ticket.items) {
      map.set(item.order_item_id, item.status);
    }
  }

  return map;
}

// Terminal statuses share a rank -- none should be overwritten by a pending optimistic update.
const STATUS_RANK: Record<KitchenItemStatus, number> = {
  Pending: 0,
  Preparing: 1,
  Ready: 2,
  Served: 3,
  Cancelled: 3,
  Returned: 3,
};

// A poll may return a snapshot older than a pending update -- keep the
// optimistic status unless the feed is already equal or further ahead.
function applyPendingOptimisticStatuses(
  tickets: KitchenTicket[],
  pending: Map<number, KitchenItemStatus>,
): KitchenTicket[] {
  if (pending.size === 0) return tickets;

  return tickets.map((ticket) => ({
    ...ticket,
    items: ticket.items.map((item) => {
      const optimisticStatus = pending.get(item.order_item_id);

      if (optimisticStatus === undefined) return item;

      if (STATUS_RANK[item.status] >= STATUS_RANK[optimisticStatus]) {
        return item;
      }

      return { ...item, status: optimisticStatus };
    }),
  }));
}

export function useKitchenTickets(): UseKitchenTickets {
  const feed = useKitchenTicketsFeed();

  const [tickets, setTickets] = useState<KitchenTicket[]>(feed.tickets);

  // One in-flight update per item at a time.
  const pendingItemIdsRef = useRef(new Set<number>());

  const pendingOptimisticStatusRef = useRef<Map<number, KitchenItemStatus>>(new Map());

  // Previous statuses, to detect newly cancelled items.
  const previousStatusByItemIdRef = useRef<Map<number, KitchenItemStatus>>(new Map());

  const { showToast } = useToast();

  useEffect(() => {
    const previousStatuses = previousStatusByItemIdRef.current;

    for (const ticket of feed.tickets) {
      for (const item of ticket.items) {
        const previousStatus = previousStatuses.get(item.order_item_id);

        // Only a real transition toasts -- not an item already Cancelled on first load.
        if (
          previousStatus !== undefined &&
          previousStatus !== 'Cancelled' &&
          item.status === 'Cancelled'
        ) {
          showToast({
            variant: 'danger',
            title: 'Pedido cancelado',
            description: `${item.menu_item_name} (Mesa ${ticket.table_number})`,
          });
        }
      }
    }

    previousStatusByItemIdRef.current = buildStatusMap(feed.tickets);

    setTickets(applyPendingOptimisticStatuses(feed.tickets, pendingOptimisticStatusRef.current));
  }, [feed.tickets, showToast]);

  const { notify } = useKitchenNotifications();
  const notificationStateRef = useRef<NotificationDetectionState | null>(null);

  useEffect(() => {
    // Skip the transient tickets=[] render before the first fetch resolves --
    // otherwise it "consumes" the isFirstRun guard against an empty
    // seenTicketKeys set, making every ticket in the real first snapshot
    // look new.
    if (feed.isLoading) return;

    const { events, nextState } = detectNotificationEvents(
      feed.tickets,
      notificationStateRef.current,
      new Date(),
    );

    notificationStateRef.current = nextState;
    events.forEach((event) => notify(event));
  }, [feed.tickets, feed.isLoading, notify]);

  const updateStatus = useCallback(
    (orderItemId: number, nextStatus: KitchenPatchableStatus) => {
      // Ignore repeated clicks while this item's request is still pending.
      if (pendingItemIdsRef.current.has(orderItemId)) {
        return;
      }

      const currentItem = tickets
        .flatMap((ticket) => ticket.items)
        .find((item) => item.order_item_id === orderItemId);

      if (!currentItem) return;

      const previousStatus = currentItem.status;

      pendingItemIdsRef.current.add(orderItemId);
      pendingOptimisticStatusRef.current.set(orderItemId, nextStatus);

      setTickets((current) => setItemStatus(current, orderItemId, nextStatus));

      kitchenService
        .updateItemStatus(orderItemId, nextStatus)
        .catch((err: unknown) => {
          setTickets((current) =>
            revertItemStatusIfUnchanged(current, orderItemId, nextStatus, previousStatus),
          );

          if (err instanceof ApiError && err.status === 409) {
            // 409: server state changed before this request landed -- resync now.
            showToast({
              variant: 'danger',
              title: err.detail,
            });

            feed.refetch();
          } else {
            showToast({
              variant: 'danger',
              title: 'Não foi possível atualizar o estado do item.',
            });
          }
        })
        .finally(() => {
          pendingItemIdsRef.current.delete(orderItemId);
          pendingOptimisticStatusRef.current.delete(orderItemId);
        });
    },
    [tickets, feed, showToast],
  );

  return {
    tickets,
    isLoading: feed.isLoading,
    error: feed.error,
    updateStatus,
  };
}
