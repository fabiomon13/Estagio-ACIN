import { useCallback, useEffect, useRef } from 'react';

import { TRANSITION_FALLBACK_BUFFER } from './swipeUtils';

type UseSwipeTransitionOptions = {
  duration: number;
  prefersReducedMotion: boolean;
};

export function useSwipeTransition({ duration, prefersReducedMotion }: UseSwipeTransitionOptions) {
  const transitionLocked = useRef(false);
  const transitionTimer = useRef<number | null>(null);
  const animationFrames = useRef<number[]>([]);

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

  const scheduleCommit = useCallback(
    (commit: () => void) => {
      if (prefersReducedMotion) {
        commit();
        return;
      }

      if (transitionTimer.current !== null) {
        window.clearTimeout(transitionTimer.current);
      }

      transitionTimer.current = window.setTimeout(commit, duration + TRANSITION_FALLBACK_BUFFER);
    },
    [duration, prefersReducedMotion],
  );

  const scheduleSettlingFrame = useCallback((settle: () => void) => {
    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(settle);
      animationFrames.current.push(secondFrame);
    });

    animationFrames.current.push(firstFrame);
  }, []);

  const isTransitionLocked = useCallback(() => transitionLocked.current, []);
  const lockTransition = useCallback(() => {
    transitionLocked.current = true;
  }, []);
  const unlockTransition = useCallback(() => {
    transitionLocked.current = false;
  }, []);

  useEffect(
    () => () => {
      clearScheduledTransition();
      transitionLocked.current = false;
    },
    [clearScheduledTransition],
  );

  return {
    isTransitionLocked,
    lockTransition,
    unlockTransition,
    clearScheduledTransition,
    scheduleCommit,
    scheduleSettlingFrame,
  };
}
