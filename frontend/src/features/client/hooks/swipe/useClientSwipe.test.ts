// frontend/src/features/client/hooks/swipe/useClientSwipe.test.ts

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useClientSwipe } from './useClientSwipe';
// describe the test suite for client view transitions
describe('useClientSwipe', () => {
  // restore real timers after transition tests
  afterEach(() => vi.useRealTimers());
  it('começa no menu e muda de vista', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useClientSwipe({ transitionDuration: 1 }));
    expect(result.current.activeView).toBe('menu');
    act(() => result.current.changeView('orders'));
    expect(result.current.pendingView).toBe('orders');
    act(() => vi.runAllTimers());
    expect(result.current.activeView).toBe('orders');
  });
  it('ignora uma vista indisponível', () => {
    const { result } = renderHook(() => useClientSwipe());
    act(() => result.current.updateAvailableViews(['menu', 'orders']));
    act(() => result.current.changeView('buffet'));
    expect(result.current.activeView).toBe('menu');
    expect(result.current.pendingView).toBeNull();
  });
});
// frontend/src/features/client/hooks/swipe/useClientSwipe.test.ts

// test case to check the initial view and a scheduled view change
// test case to check if unavailable views are ignored
