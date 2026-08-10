import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type TransitionEvent,
} from 'react';

import { CLIENT_SWIPE_TRANSITION_MS } from '../../clientConfig';
import { CLIENT_VIEWS, type ClientView } from '../../clientTypes';
import {
  clamp,
  DEFAULT_IGNORE_SELECTOR,
  getPrefersReducedMotion,
  getViewportWidth,
  SWIPE_DISTANCE_THRESHOLD,
  SWIPE_VELOCITY_THRESHOLD,
} from './swipeUtils';
import { useSwipePointer } from './useSwipePointer';
import { useSwipeTransition } from './useSwipeTransition';

type UseClientSwipeOptions = {
  initialView?: ClientView;
  ignoreSelector?: string;
  transitionDuration?: number;
};

export function useClientSwipe({
  initialView = 'menu',
  ignoreSelector = DEFAULT_IGNORE_SELECTOR,
  transitionDuration = CLIENT_SWIPE_TRANSITION_MS,
}: UseClientSwipeOptions = {}) {
  const [activeView, setActiveView] = useState<ClientView>(initialView);
  const [pendingView, setPendingView] = useState<ClientView | null>(null);
  const [viewDragOffset, setViewDragOffset] = useState(0);
  const [targetViewTopOffset, setTargetViewTopOffset] = useState(0);
  const [isDraggingView, setIsDraggingView] = useState(false);
  const [isViewSettled, setIsViewSettled] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getPrefersReducedMotion);
  const [availableViews, setAvailableViews] = useState<readonly ClientView[]>(CLIENT_VIEWS);
  const activeViewRef = useRef<ClientView>(initialView);
  const viewScrollPositions = useRef<Record<ClientView, number>>({
    menu: 0,
    buffet: 0,
    orders: 0,
  });

  const {
    isTransitionLocked,
    lockTransition,
    unlockTransition,
    clearScheduledTransition,
    scheduleCommit,
    scheduleSettlingFrame,
  } = useSwipeTransition({ duration: transitionDuration, prefersReducedMotion });

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

  const commitView = useCallback(
    (view: ClientView) => {
      viewScrollPositions.current[activeViewRef.current] = window.scrollY;
      activeViewRef.current = view;
      clearScheduledTransition();
      unlockTransition();
      setActiveView(view);
      setPendingView(null);
      setViewDragOffset(0);
      setTargetViewTopOffset(0);
      setIsDraggingView(false);
      setIsViewSettled(true);
    },
    [clearScheduledTransition, unlockTransition],
  );

  const finishSwipe = useCallback(
    (horizontalDistance: number, velocity: number) => {
      const targetView = horizontalDistance < 0 ? nextView : previousView;
      const passedDistance = Math.abs(horizontalDistance) >= SWIPE_DISTANCE_THRESHOLD;
      const passedVelocity = Math.abs(velocity) >= SWIPE_VELOCITY_THRESHOLD;

      if (!targetView || (!passedDistance && !passedVelocity)) {
        unlockTransition();
        setPendingView(null);
        setViewDragOffset(0);
        return;
      }

      viewScrollPositions.current[targetView] = 0;
      lockTransition();

      if (prefersReducedMotion) {
        commitView(targetView);
        return;
      }

      setPendingView(targetView);
      setViewDragOffset((horizontalDistance < 0 ? -1 : 1) * viewportWidth);
      scheduleCommit(() => commitView(targetView));
    },
    [
      commitView,
      nextView,
      prefersReducedMotion,
      previousView,
      scheduleCommit,
      lockTransition,
      unlockTransition,
      viewportWidth,
    ],
  );

  const resetPointerState = useCallback(() => {
    setPendingView(null);
    setViewDragOffset(0);
  }, []);

  const pointerHandlers = useSwipePointer({
    activeViewIndex,
    availableViewCount: availableViews.length,
    ignoreSelector,
    isTransitionLocked,
    unlockTransition,
    onDragOffsetChange: setViewDragOffset,
    onDraggingChange: setIsDraggingView,
    onHorizontalDragStart: () => {
      setTargetViewTopOffset(window.scrollY);
      setIsViewSettled(false);
    },
    onFinish: finishSwipe,
    onReset: resetPointerState,
  });

  const changeView = useCallback(
    (view: ClientView) => {
      if (isTransitionLocked()) return;

      if (!availableViews.includes(view)) return;

      viewScrollPositions.current[view] = 0;

      if (view === activeView) {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        return;
      }

      lockTransition();
      setIsViewSettled(false);

      if (prefersReducedMotion) {
        commitView(view);
        return;
      }

      const targetIndex = availableViews.indexOf(view);
      const targetOffset = (activeViewIndex - targetIndex) * viewportWidth;

      setTargetViewTopOffset(window.scrollY);
      setPendingView(view);
      setViewDragOffset(0);
      scheduleSettlingFrame(() => {
        setViewDragOffset(targetOffset);
        scheduleCommit(() => commitView(view));
      });
    },
    [
      activeView,
      activeViewIndex,
      availableViews,
      commitView,
      isTransitionLocked,
      lockTransition,
      prefersReducedMotion,
      scheduleCommit,
      scheduleSettlingFrame,
      viewportWidth,
    ],
  );

  const handleViewTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;

      if (pendingView !== null) {
        commitView(pendingView);
        return;
      }

      setIsViewSettled(true);
    },
    [commitView, pendingView],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const handleResize = () => setViewportWidth(getViewportWidth());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useLayoutEffect(() => {
    window.scrollTo({
      top: viewScrollPositions.current[activeView],
      left: 0,
      behavior: 'auto',
    });
  }, [activeView]);

  return {
    activeView,
    pendingView,
    swipeTargetView,
    viewDragOffset,
    viewportWidth,
    targetViewTopOffset,
    isDraggingView,
    isViewSettled,
    isTransitioning: pendingView !== null,
    indicatorPosition,
    updateAvailableViews,
    changeView,
    ...pointerHandlers,
    handleViewTransitionEnd,
  };
}
