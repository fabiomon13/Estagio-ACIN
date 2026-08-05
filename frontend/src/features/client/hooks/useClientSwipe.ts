// frontend/src/features/client/hooks/useClientSwipe.ts

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react';

import { CLIENT_VIEWS, type ClientView } from '../clientTypes';

const SWIPE_DISTANCE_THRESHOLD = 60;
const SWIPE_VELOCITY_THRESHOLD = 0.45;
const AXIS_LOCK_THRESHOLD = 8;
const DEFAULT_TRANSITION_DURATION = 200;

const DEFAULT_IGNORE_SELECTOR = [
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

type SwipeAxis = 'horizontal' | 'vertical' | null;

type PointerStart = {
  pointerId: number;
  x: number;
  y: number;
  timestamp: number;
  axis: SwipeAxis;
  ignored: boolean;
};

type UseClientSwipeOptions = {
  initialView?: ClientView;
  ignoreSelector?: string;
  transitionDuration?: number;
};

export function useClientSwipe({
  initialView = 'menu',
  ignoreSelector = DEFAULT_IGNORE_SELECTOR,
  transitionDuration = DEFAULT_TRANSITION_DURATION,
}: UseClientSwipeOptions = {}) {
  const [activeView, setActiveView] = useState<ClientView>(initialView);
  const [pendingView, setPendingView] = useState<ClientView | null>(null);
  const [viewDragOffset, setViewDragOffset] = useState(0);
  const [previewTopOffset, setPreviewTopOffset] = useState(0);
  const [isDraggingView, setIsDraggingView] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getPrefersReducedMotion);
  const [availableViews, setAvailableViews] = useState<readonly ClientView[]>(CLIENT_VIEWS);

  const pointerStart = useRef<PointerStart | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const animationFrames = useRef<number[]>([]);
  const transitionLocked = useRef(false);

  const activeViewIndex = availableViews.indexOf(activeView);

  const previousView = activeViewIndex > 0 ? availableViews[activeViewIndex - 1] : null;

  const nextView =
    activeViewIndex < availableViews.length - 1 ? availableViews[activeViewIndex + 1] : null;

  const swipeTargetView = useMemo<ClientView | null>(() => {
    if (pendingView) return pendingView;
    if (viewDragOffset < 0) return nextView;
    if (viewDragOffset > 0) return previousView;

    return null;
  }, [nextView, pendingView, previousView, viewDragOffset]);

  const indicatorPosition = useMemo(() => {
    if (!pendingView) {
      return clamp(activeViewIndex - viewDragOffset / viewportWidth, 0, availableViews.length - 1);
    }

    const pendingIndex = availableViews.indexOf(pendingView);

    const progress = Math.min(Math.abs(viewDragOffset) / viewportWidth, 1);

    return clamp(
      activeViewIndex + (pendingIndex - activeViewIndex) * progress,
      0,
      availableViews.length - 1,
    );
  }, [activeViewIndex, availableViews, pendingView, viewDragOffset, viewportWidth]);

  const updateAvailableViews = useCallback((views: readonly ClientView[]) => {
    setAvailableViews((current) =>
      current.length === views.length && current.every((view, index) => view === views[index])
        ? current
        : [...views],
    );
  }, []);

  const clearScheduledTransition = useCallback(() => {
    if (transitionTimer.current !== null) {
      window.clearTimeout(transitionTimer.current);
      transitionTimer.current = null;
    }

    for (const frame of animationFrames.current) {
      window.cancelAnimationFrame(frame);
    }

    animationFrames.current = [];
  }, []);

  const commitView = useCallback(
    (view: ClientView) => {
      clearScheduledTransition();

      transitionLocked.current = false;

      setActiveView(view);
      setPendingView(null);
      setViewDragOffset(0);
      setPreviewTopOffset(0);
      setIsDraggingView(false);
    },
    [clearScheduledTransition],
  );

  const scheduleCommit = useCallback(
    (view: ClientView) => {
      if (prefersReducedMotion) {
        commitView(view);
        return;
      }

      if (transitionTimer.current !== null) {
        window.clearTimeout(transitionTimer.current);
      }

      transitionTimer.current = window.setTimeout(() => commitView(view), transitionDuration);
    },
    [commitView, prefersReducedMotion, transitionDuration],
  );

  const changeView = useCallback(
    (view: ClientView) => {
      if (view === activeView || transitionLocked.current) {
        return;
      }

      const targetIndex = availableViews.indexOf(view);

      if (targetIndex === -1) return;

      if (prefersReducedMotion) {
        commitView(view);
        return;
      }

      clearScheduledTransition();
      transitionLocked.current = true;
      setPreviewTopOffset(window.scrollY);

      const direction = targetIndex > activeViewIndex ? -1 : 1;

      setPendingView(view);

      // A very small initial offset makes the adjacent
      // preview render before the transition begins.
      setViewDragOffset(direction * 0.01);

      const firstFrame = window.requestAnimationFrame(() => {
        const secondFrame = window.requestAnimationFrame(() => {
          setViewDragOffset(direction * viewportWidth);

          scheduleCommit(view);
        });

        animationFrames.current.push(secondFrame);
      });

      animationFrames.current.push(firstFrame);
    },
    [
      activeView,
      activeViewIndex,
      availableViews,
      clearScheduledTransition,
      commitView,
      prefersReducedMotion,
      scheduleCommit,
      viewportWidth,
    ],
  );

  const finishSwipe = useCallback(
    (horizontalDistance: number, velocity: number) => {
      const targetView = horizontalDistance < 0 ? nextView : previousView;

      const passedDistanceThreshold = Math.abs(horizontalDistance) >= SWIPE_DISTANCE_THRESHOLD;

      const passedVelocityThreshold = Math.abs(velocity) >= SWIPE_VELOCITY_THRESHOLD;

      if (!targetView || (!passedDistanceThreshold && !passedVelocityThreshold)) {
        transitionLocked.current = false;
        setPendingView(null);
        setViewDragOffset(0);

        return;
      }

      transitionLocked.current = true;

      const direction = horizontalDistance < 0 ? -1 : 1;

      if (prefersReducedMotion) {
        commitView(targetView);
        return;
      }

      setPendingView(targetView);
      setViewDragOffset(direction * viewportWidth);

      scheduleCommit(targetView);
    },
    [commitView, nextView, prefersReducedMotion, previousView, scheduleCommit, viewportWidth],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!event.isPrimary || transitionLocked.current) {
        return;
      }

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

      if (!ignored) {
        setPreviewTopOffset(window.scrollY);
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    [ignoreSelector],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const start = pointerStart.current;

      if (!start || start.ignored || start.pointerId !== event.pointerId) {
        return;
      }

      const horizontalDistance = event.clientX - start.x;

      const verticalDistance = event.clientY - start.y;

      if (start.axis === null) {
        const largestDistance = Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance));

        if (largestDistance < AXIS_LOCK_THRESHOLD) {
          return;
        }

        start.axis =
          Math.abs(horizontalDistance) > Math.abs(verticalDistance) ? 'horizontal' : 'vertical';
      }

      if (start.axis === 'vertical') {
        return;
      }

      const isBeforeFirstView = activeViewIndex === 0 && horizontalDistance > 0;

      const isAfterLastView =
        activeViewIndex === availableViews.length - 1 && horizontalDistance < 0;

      event.preventDefault();
      setIsDraggingView(true);

      if (isBeforeFirstView || isAfterLastView) {
        // Add resistance when dragging beyond the
        // first or final view.
        setViewDragOffset(horizontalDistance * 0.15);

        return;
      }

      setViewDragOffset(horizontalDistance);
    },
    [activeViewIndex, availableViews.length],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const start = pointerStart.current;

      pointerStart.current = null;
      setIsDraggingView(false);

      releasePointerCapture(event);

      if (
        !start ||
        start.ignored ||
        start.pointerId !== event.pointerId ||
        start.axis !== 'horizontal'
      ) {
        transitionLocked.current = false;
        setViewDragOffset(0);

        return;
      }

      const horizontalDistance = event.clientX - start.x;

      const elapsedTime = Math.max(performance.now() - start.timestamp, 1);

      const velocity = horizontalDistance / elapsedTime;

      finishSwipe(horizontalDistance, velocity);
    },
    [finishSwipe],
  );

  const handlePointerCancel = useCallback((event: PointerEvent<HTMLElement>) => {
    pointerStart.current = null;
    transitionLocked.current = false;

    releasePointerCapture(event);

    setIsDraggingView(false);
    setPendingView(null);
    setViewDragOffset(0);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function handleMotionPreferenceChange(event: MediaQueryListEvent) {
      setPrefersReducedMotion(event.matches);
    }

    mediaQuery.addEventListener('change', handleMotionPreferenceChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMotionPreferenceChange);
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      setViewportWidth(getViewportWidth());
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [activeView]);

  useEffect(
    () => () => {
      clearScheduledTransition();
      transitionLocked.current = false;
    },
    [clearScheduledTransition],
  );

  return {
    activeView,
    pendingView,
    swipeTargetView,
    viewDragOffset,
    previewTopOffset,
    isDraggingView,
    isTransitioning: pendingView !== null,
    indicatorPosition,
    updateAvailableViews,
    changeView,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}

function getViewportWidth(): number {
  if (typeof window === 'undefined') {
    return 1;
  }

  return Math.max(window.innerWidth, 1);
}

function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function releasePointerCapture(event: PointerEvent<HTMLElement>): void {
  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
