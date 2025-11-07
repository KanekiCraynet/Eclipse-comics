import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for swipe gestures
 * @param {Object} callbacks - Object with onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown
 * @param {Object} options - Options for swipe detection
 * @param {number} options.threshold - Minimum distance for swipe (default: 50)
 * @param {number} options.maxTime - Maximum time for swipe in ms (default: 300)
 * @param {boolean} options.enabled - Whether gestures are enabled
 */
export const useSwipeGestures = (callbacks, options = {}) => {
  const {
    threshold = 50,
    maxTime = 300,
    enabled = true,
  } = options;

  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (!enabled) return;
    touchEndRef.current = null;
    touchStartRef.current = e.touches[0].clientX;
  }, [enabled]);

  const handleTouchMove = useCallback((e) => {
    if (!enabled) return;
    touchEndRef.current = e.touches[0].clientX;
  }, [enabled]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !touchStartRef.current || !touchEndRef.current) return;

    const distance = touchStartRef.current - touchEndRef.current;
    const isLeftSwipe = distance > threshold;
    const isRightSwipe = distance < -threshold;

    if (isLeftSwipe && callbacks.onSwipeLeft) {
      callbacks.onSwipeLeft();
    } else if (isRightSwipe && callbacks.onSwipeRight) {
      callbacks.onSwipeRight();
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [enabled, threshold, callbacks]);

  // Vertical swipe detection
  const handleTouchStartVertical = useCallback((e) => {
    if (!enabled) return;
    touchEndRef.current = null;
    touchStartRef.current = e.touches[0].clientY;
  }, [enabled]);

  const handleTouchMoveVertical = useCallback((e) => {
    if (!enabled) return;
    touchEndRef.current = e.touches[0].clientY;
  }, [enabled]);

  const handleTouchEndVertical = useCallback(() => {
    if (!enabled || !touchStartRef.current || !touchEndRef.current) return;

    const distance = touchStartRef.current - touchEndRef.current;
    const isUpSwipe = distance > threshold;
    const isDownSwipe = distance < -threshold;

    if (isUpSwipe && callbacks.onSwipeUp) {
      callbacks.onSwipeUp();
    } else if (isDownSwipe && callbacks.onSwipeDown) {
      callbacks.onSwipeDown();
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [enabled, threshold, callbacks]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchStartVertical: handleTouchStartVertical,
    onTouchMoveVertical: handleTouchMoveVertical,
    onTouchEndVertical: handleTouchEndVertical,
  };
};

export default useSwipeGestures;

