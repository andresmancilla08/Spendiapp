import { useCallback, useEffect, useRef } from 'react';

interface UseInactivityTimerOptions {
  timeoutMs: number;
  onInactive: () => void;
  enabled?: boolean;
}

interface UseInactivityTimerReturn {
  reset: () => void;
}

export function useInactivityTimer({
  timeoutMs,
  onInactive,
  enabled = true,
}: UseInactivityTimerOptions): UseInactivityTimerReturn {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onInactiveRef = useRef(onInactive);

  useEffect(() => {
    onInactiveRef.current = onInactive;
  }, [onInactive]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      onInactiveRef.current();
    }, timeoutMs);
  }, [clearTimer, timeoutMs]);

  const reset = useCallback(() => {
    if (enabled) {
      startTimer();
    }
  }, [enabled, startTimer]);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      return;
    }

    const handleActivity = () => {
      startTimer();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startTimer();
      }
    };

    const activityEvents: string[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'touchmove',
      'touchend',
      'scroll',
      'click',
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    startTimer();

    return () => {
      clearTimer();
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, startTimer, clearTimer]);

  return { reset };
}
