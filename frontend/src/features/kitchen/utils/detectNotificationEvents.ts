import type { KitchenTicket } from '../types/kitchen.types';
import type { KitchenNotificationType } from '../types/notification.types';

const READY_TOO_LONG_THRESHOLD_MINUTES = import.meta.env.MODE === 'development' ? 5 : 1;
const READY_TOO_LONG_THRESHOLD_MS = READY_TOO_LONG_THRESHOLD_MINUTES * 60_000;

export type DetectedNotificationEvent = {
  type: KitchenNotificationType;
  message: string;
};

export type NotificationDetectionState = {
  seenTicketKeys: Set<string>;
  readySinceByItemId: Map<number, number>;
  notifiedReadyTooLongItemIds: Set<number>;
};

function ticketKey(ticket: KitchenTicket): string {
  return `${ticket.order_id}:${ticket.round_number}`;
}

export function detectNotificationEvents(
  tickets: KitchenTicket[],
  previousState: NotificationDetectionState | null,
  now: Date,
): { events: DetectedNotificationEvent[]; nextState: NotificationDetectionState } {
  const isFirstRun = previousState === null;

  const seenTicketKeys = new Set(previousState?.seenTicketKeys);
  const readySinceByItemId = new Map(previousState?.readySinceByItemId);
  const notifiedReadyTooLongItemIds = new Set(previousState?.notifiedReadyTooLongItemIds);

  const events: DetectedNotificationEvent[] = [];
  const nowMs = now.getTime();

  for (const ticket of tickets) {
    const key = ticketKey(ticket);

    if (!seenTicketKeys.has(key)) {
      seenTicketKeys.add(key);

      if (!isFirstRun) {
        events.push({
          type: 'new-order',
          message: `Novo pedido — Mesa ${ticket.table_number}`,
        });
      }
    }

    for (const item of ticket.items) {
      if (item.status !== 'Ready') {
        readySinceByItemId.delete(item.order_item_id);
        notifiedReadyTooLongItemIds.delete(item.order_item_id);
        continue;
      }

      if (!readySinceByItemId.has(item.order_item_id)) {
        readySinceByItemId.set(item.order_item_id, nowMs);
      }

      const readySince = readySinceByItemId.get(item.order_item_id) as number;
      const waitedMs = nowMs - readySince;
      const alreadyNotified = notifiedReadyTooLongItemIds.has(item.order_item_id);

      if (waitedMs >= READY_TOO_LONG_THRESHOLD_MS && !alreadyNotified) {
        notifiedReadyTooLongItemIds.add(item.order_item_id);
        events.push({
          type: 'ready-too-long',
          message: `${item.menu_item_name} pronto há mais de ${READY_TOO_LONG_THRESHOLD_MINUTES} min — Mesa ${ticket.table_number}`,
        });
      }
    }
  }

  return {
    events,
    nextState: { seenTicketKeys, readySinceByItemId, notifiedReadyTooLongItemIds },
  };
}
