import { useCallback, useEffect, useRef, type PointerEvent } from 'react';

import { AXIS_LOCK_THRESHOLD, releasePointerCapture, type PointerStart } from './swipeUtils';

type UseSwipePointerOptions = {
  activeViewIndex: number;
  availableViewCount: number;
  ignoreSelector: string;
  isTransitionLocked: () => boolean;
  unlockTransition: () => void;
  onDragOffsetChange: (offset: number) => void;
  onDraggingChange: (isDragging: boolean) => void;
  onHorizontalDragStart: () => void;
  onFinish: (distance: number, velocity: number) => void;
  onReset: () => void;
};

export function useSwipePointer({
  activeViewIndex,
  availableViewCount,
  ignoreSelector,
  isTransitionLocked,
  unlockTransition,
  onDragOffsetChange,
  onDraggingChange,
  onHorizontalDragStart,
  onFinish,
  onReset,
}: UseSwipePointerOptions) {
  const pointerStart = useRef<PointerStart | null>(null);
  const dragFrame = useRef<number | null>(null);
  const pendingDragOffset = useRef(0);

  const cancelPendingDrag = useCallback(() => {
    if (dragFrame.current !== null) {
      window.cancelAnimationFrame(dragFrame.current);
      dragFrame.current = null;
    }
  }, []);

  const updateDragOffset = useCallback(
    (offset: number) => {
      pendingDragOffset.current = offset;
      if (dragFrame.current !== null) return;

      dragFrame.current = window.requestAnimationFrame(() => {
        dragFrame.current = null;
        onDragOffsetChange(pendingDragOffset.current);
      });
    },
    [onDragOffsetChange],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!event.isPrimary || isTransitionLocked()) return;

      const target = event.target instanceof Element ? event.target : null;
      const ignored = Boolean(target?.closest(ignoreSelector));

      pointerStart.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        timestamp: performance.now(),
        axis: null,
        ignored,
      };

      if (!ignored) event.currentTarget.setPointerCapture(event.pointerId);
    },
    [ignoreSelector, isTransitionLocked],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const start = pointerStart.current;
      if (!start || start.ignored || start.pointerId !== event.pointerId) return;

      const horizontalDistance = event.clientX - start.x;
      const verticalDistance = event.clientY - start.y;

      if (start.axis === null) {
        if (
          Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) < AXIS_LOCK_THRESHOLD
        ) {
          return;
        }

        start.axis =
          Math.abs(horizontalDistance) > Math.abs(verticalDistance) ? 'horizontal' : 'vertical';

        if (start.axis === 'horizontal') onHorizontalDragStart();
      }

      if (start.axis === 'vertical') return;

      const isOutsideStart = activeViewIndex === 0 && horizontalDistance > 0;
      const isOutsideEnd = activeViewIndex === availableViewCount - 1 && horizontalDistance < 0;

      event.preventDefault();
      onDraggingChange(true);
      updateDragOffset(
        isOutsideStart || isOutsideEnd ? horizontalDistance * 0.15 : horizontalDistance,
      );
    },
    [
      activeViewIndex,
      availableViewCount,
      onDraggingChange,
      onHorizontalDragStart,
      updateDragOffset,
    ],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const start = pointerStart.current;
      cancelPendingDrag();
      pointerStart.current = null;
      onDraggingChange(false);
      releasePointerCapture(event);

      if (
        !start ||
        start.ignored ||
        start.pointerId !== event.pointerId ||
        start.axis !== 'horizontal'
      ) {
        unlockTransition();
        onReset();
        return;
      }

      const distance = event.clientX - start.x;
      const elapsedTime = Math.max(performance.now() - start.timestamp, 1);
      onFinish(distance, distance / elapsedTime);
    },
    [cancelPendingDrag, onDraggingChange, onFinish, onReset, unlockTransition],
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      cancelPendingDrag();
      pointerStart.current = null;
      unlockTransition();
      releasePointerCapture(event);
      onDraggingChange(false);
      onReset();
    },
    [cancelPendingDrag, onDraggingChange, onReset, unlockTransition],
  );

  useEffect(() => cancelPendingDrag, [cancelPendingDrag]);

  return { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel };
}
