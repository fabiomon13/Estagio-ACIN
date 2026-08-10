import type { PointerEvent } from 'react';

export const SWIPE_DISTANCE_THRESHOLD = 60;
export const SWIPE_VELOCITY_THRESHOLD = 0.45;
export const AXIS_LOCK_THRESHOLD = 8;
export const TRANSITION_FALLBACK_BUFFER = 100;

export const DEFAULT_IGNORE_SELECTOR = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[data-swipe-ignore]',
  '.client-category-row',
  '.client-selection-sheet',
].join(', ');

export type SwipeAxis = 'horizontal' | 'vertical' | null;

export type PointerStart = {
  pointerId: number;
  x: number;
  y: number;
  timestamp: number;
  axis: SwipeAxis;
  ignored: boolean;
};

export function getViewportWidth(): number {
  if (typeof window === 'undefined') return 1;

  const documentWidth = document.documentElement.clientWidth;
  const bodyWidth = document.body?.getBoundingClientRect().width ?? 0;

  return Math.max(documentWidth, bodyWidth, 1);
}

export function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function releasePointerCapture(event: PointerEvent<HTMLElement>): void {
  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
