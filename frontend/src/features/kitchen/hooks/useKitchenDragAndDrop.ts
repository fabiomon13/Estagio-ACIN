import { useCallback } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import type { KitchenItemStatus, KitchenPatchableStatus } from '../types/kitchen.types';

export type DropColumn = 'new' | 'preparing' | 'ready';

export type KitchenDragPayload =
  | { type: 'item'; orderItemId: number; status: KitchenItemStatus }
  | { type: 'fragment'; orderItemIds: number[]; status: KitchenItemStatus };

const COLUMN_STATUS: Record<DropColumn, KitchenItemStatus> = {
  new: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
};

// Every column a drag starting from a given status can legally end on --
// one hop to the immediate next column, or two hops (Preparing then Ready)
// to skip straight from Pending to Prontos in a single drag.
const VALID_DROP_COLUMNS: Partial<Record<KitchenItemStatus, DropColumn[]>> = {
  Pending: ['preparing', 'ready'],
  Preparing: ['ready'],
};

export function isValidDropColumn(status: KitchenItemStatus, column: DropColumn): boolean {
  return (VALID_DROP_COLUMNS[status] ?? []).includes(column);
}

type OptimisticOverride = { display: KitchenItemStatus; revertTo: KitchenItemStatus };

type UseKitchenDragAndDropOptions = {
  updateStatus: (orderItemId: number, nextStatus: KitchenPatchableStatus) => void;
  updateStatusAsync: (
    orderItemId: number,
    nextStatus: KitchenPatchableStatus,
    optimisticOverride?: OptimisticOverride,
  ) => Promise<boolean>;
};

export function useKitchenDragAndDrop({
  updateStatus,
  updateStatusAsync,
}: UseKitchenDragAndDropOptions): { handleDragEnd: (event: DragEndEvent) => void } {
  const moveItem = useCallback(
    (orderItemId: number, sourceStatus: KitchenItemStatus, targetColumn: DropColumn) => {
      const targetStatus = COLUMN_STATUS[targetColumn];

      if (sourceStatus === 'Pending' && targetStatus === 'Ready') {
        // Backend only allows one-hop transitions -- fake the visual skip
        // with two real, sequential PATCHes. Must be sequential: the
        // backend's conditional update would reject a second call that
        // still sees the item as Pending.
        //
        // The UI jumps straight to "Ready" optimistically instead of
        // visibly resting on "Preparing" in between. If a hop fails, it
        // settles at whatever the backend actually confirmed: back to
        // "Pending" if the first hop never landed, or "Preparing" if only
        // the first hop landed.
        void (async () => {
          const advancedToPreparing = await updateStatusAsync(orderItemId, 'Preparing', {
            display: 'Ready',
            revertTo: 'Pending',
          });
          if (!advancedToPreparing) return;
          await updateStatusAsync(orderItemId, 'Ready', {
            display: 'Ready',
            revertTo: 'Preparing',
          });
        })();
        return;
      }

      updateStatus(orderItemId, targetStatus as KitchenPatchableStatus);
    },
    [updateStatus, updateStatusAsync],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const targetColumn = event.over?.id as DropColumn | undefined;
      if (!targetColumn) return;

      const payload = event.active.data.current as KitchenDragPayload | undefined;
      if (!payload) return;

      if (!isValidDropColumn(payload.status, targetColumn)) return;

      if (payload.type === 'item') {
        moveItem(payload.orderItemId, payload.status, targetColumn);
        return;
      }

      for (const orderItemId of payload.orderItemIds) {
        moveItem(orderItemId, payload.status, targetColumn);
      }
    },
    [moveItem],
  );

  return { handleDragEnd };
}
