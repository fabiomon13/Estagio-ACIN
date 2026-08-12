import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Mocking window.matchMedia to prevent errors in tests that rely on media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  })),
});

// Mocking window.scrollTo to prevent errors in tests that involve scrolling
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mocking window.ResizeObserver to prevent errors in tests that involve resizing
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.body.style.overflow = '';
  document.body.style.overscrollBehavior = '';
});
