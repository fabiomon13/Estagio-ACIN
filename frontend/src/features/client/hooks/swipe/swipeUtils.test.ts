// frontend/src/features/client/hooks/swipe/swipeUtils.test.ts

import { describe, expect, it, vi } from 'vitest';
import { clamp, getPrefersReducedMotion, getViewportWidth } from './swipeUtils';
// describe the test suite for pure swipe utility functions
describe('swipeUtils', () => {
  // test case to check numeric clamping at both boundaries
  it('limita valores', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(20, 0, 10)).toBe(10);
  });
  it('obtém uma largura positiva', () => {
    expect(getViewportWidth()).toBeGreaterThan(0);
  });
  it('deteta movimento reduzido', () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(getPrefersReducedMotion()).toBe(true);
    window.matchMedia = original;
  });
});
// frontend/src/features/client/hooks/swipe/swipeUtils.test.ts

// test case to check if viewport width always has a safe positive value
// test case to check reduced-motion preference detection
