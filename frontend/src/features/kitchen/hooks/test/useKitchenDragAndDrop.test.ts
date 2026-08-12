import { describe, expect, it, vi } from 'vitest';
import type { DragEndEvent } from '@dnd-kit/core';
import { isValidDropColumn, useKitchenDragAndDrop } from '../useKitchenDragAndDrop';
import { renderHook, waitFor } from '@testing-library/react';

function makeDragEndEvent(payload: unknown, overColumn: string | undefined): DragEndEvent {
  return {
    active: {
      id: 'active',
      data: { current: payload },
      rect: { current: { initial: null, translated: null } },
    },
    over: overColumn
      ? { id: overColumn, rect: {} as never, data: { current: undefined }, disabled: false }
      : null,
    delta: { x: 0, y: 0 },
    collisions: null,
  } as unknown as DragEndEvent;
}

describe('isValidDropColumn', () => {
  it('allows Pending to drop on preparing', () => {
    expect(isValidDropColumn('Pending', 'preparing')).toBe(true);
  });

  it('allows Pending to drop on ready (the skip case)', () => {
    expect(isValidDropColumn('Pending', 'ready')).toBe(true);
  });

  it('does not allow Pending to drop on new (its own column)', () => {
    expect(isValidDropColumn('Pending', 'new')).toBe(false);
  });

  it('allows Preparing to drop on ready only', () => {
    expect(isValidDropColumn('Preparing', 'ready')).toBe(true);
    expect(isValidDropColumn('Preparing', 'new')).toBe(false);
  });

  it('does not allow Ready to drop anywhere', () => {
    expect(isValidDropColumn('Ready', 'new')).toBe(false);
    expect(isValidDropColumn('Ready', 'preparing')).toBe(false);
    expect(isValidDropColumn('Ready', 'ready')).toBe(false);
  });
});

describe('useKitchenDragAndDrop', () => {
  it('calls updateStatus once for a single-item drop onto a valid column', () => {
    const updateStatus = vi.fn();
    const updateStatusAsync = vi.fn();
    const { result } = renderHook(() => useKitchenDragAndDrop({ updateStatus, updateStatusAsync }));

    const event = makeDragEndEvent(
      { type: 'item', orderItemId: 501, status: 'Preparing' },
      'ready',
    );
    result.current.handleDragEnd(event);

    expect(updateStatus).toHaveBeenCalledWith(501, 'Ready');
    expect(updateStatusAsync).not.toHaveBeenCalled();
  });

  it('calls updateStatus once per item for a whole-fragment drop', () => {
    const updateStatus = vi.fn();
    const updateStatusAsync = vi.fn();
    const { result } = renderHook(() => useKitchenDragAndDrop({ updateStatus, updateStatusAsync }));

    const event = makeDragEndEvent(
      { type: 'fragment', orderItemIds: [501, 502, 503], status: 'Pending' },
      'preparing',
    );
    result.current.handleDragEnd(event);

    expect(updateStatus).toHaveBeenCalledTimes(3);
    expect(updateStatus).toHaveBeenCalledWith(501, 'Preparing');
    expect(updateStatus).toHaveBeenCalledWith(502, 'Preparing');
    expect(updateStatus).toHaveBeenCalledWith(503, 'Preparing');
  });

  it('does nothing when dropped outside any column', () => {
    const updateStatus = vi.fn();
    const updateStatusAsync = vi.fn();
    const { result } = renderHook(() => useKitchenDragAndDrop({ updateStatus, updateStatusAsync }));

    const event = makeDragEndEvent(
      { type: 'item', orderItemId: 501, status: 'Pending' },
      undefined,
    );
    result.current.handleDragEnd(event);

    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("does nothing when dropped on an invalid column for the item's status", () => {
    const updateStatus = vi.fn();
    const updateStatusAsync = vi.fn();
    const { result } = renderHook(() => useKitchenDragAndDrop({ updateStatus, updateStatusAsync }));

    const event = makeDragEndEvent({ type: 'item', orderItemId: 501, status: 'Preparing' }, 'new');
    result.current.handleDragEnd(event);

    expect(updateStatus).not.toHaveBeenCalled();
  });

  it('sequences two updateStatusAsync calls when a Pending item is dropped directly on ready', async () => {
    const updateStatus = vi.fn();
    const callOrder: string[] = [];
    const updateStatusAsync = vi.fn(async (_id: number, status: string) => {
      callOrder.push(status);
      return true;
    });
    const { result } = renderHook(() => useKitchenDragAndDrop({ updateStatus, updateStatusAsync }));

    const event = makeDragEndEvent({ type: 'item', orderItemId: 501, status: 'Pending' }, 'ready');
    result.current.handleDragEnd(event);

    await waitFor(() => {
      expect(updateStatusAsync).toHaveBeenCalledTimes(2);
    });

    expect(callOrder).toEqual(['Preparing', 'Ready']);
    expect(updateStatusAsync).toHaveBeenNthCalledWith(1, 501, 'Preparing', {
      display: 'Ready',
      revertTo: 'Pending',
    });
    expect(updateStatusAsync).toHaveBeenNthCalledWith(2, 501, 'Ready', {
      display: 'Ready',
      revertTo: 'Preparing',
    });
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it('does not call updateStatusAsync a second time when the first hop of a skip fails', async () => {
    const updateStatus = vi.fn();
    const updateStatusAsync = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useKitchenDragAndDrop({ updateStatus, updateStatusAsync }));

    const event = makeDragEndEvent({ type: 'item', orderItemId: 501, status: 'Pending' }, 'ready');
    result.current.handleDragEnd(event);

    await waitFor(() => {
      expect(updateStatusAsync).toHaveBeenCalledTimes(1);
    });

    // Give any accidental second call a chance to happen before asserting it didn't.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(updateStatusAsync).toHaveBeenCalledTimes(1);
  });

  it("runs each item's skip sequence independently when a whole Pending fragment is dropped on ready", async () => {
    const updateStatus = vi.fn();
    const updateStatusAsync = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useKitchenDragAndDrop({ updateStatus, updateStatusAsync }));

    const event = makeDragEndEvent(
      { type: 'fragment', orderItemIds: [501, 502], status: 'Pending' },
      'ready',
    );
    result.current.handleDragEnd(event);

    await waitFor(() => {
      expect(updateStatusAsync).toHaveBeenCalledTimes(4); // 2 items x 2 hops each
    });

    expect(updateStatusAsync).toHaveBeenCalledWith(501, 'Preparing', {
      display: 'Ready',
      revertTo: 'Pending',
    });
    expect(updateStatusAsync).toHaveBeenCalledWith(501, 'Ready', {
      display: 'Ready',
      revertTo: 'Preparing',
    });
    expect(updateStatusAsync).toHaveBeenCalledWith(502, 'Preparing', {
      display: 'Ready',
      revertTo: 'Pending',
    });
    expect(updateStatusAsync).toHaveBeenCalledWith(502, 'Ready', {
      display: 'Ready',
      revertTo: 'Preparing',
    });
  });
});
