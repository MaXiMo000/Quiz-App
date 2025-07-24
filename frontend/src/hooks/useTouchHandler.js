// Enhanced Touch Handler Hook for Better Mobile Interactions
import { useCallback, useRef } from 'react';
import useResponsive from './useResponsive';

const useTouchHandler = () => {
  const { isTouchDevice, isMobile } = useResponsive();
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const longPressTimeoutRef = useRef(null);

  // Swipe detection
  const handleSwipe = useCallback((onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown) => {
    const minSwipeDistance = 50;
    
    return {
      onTouchStart: (e) => {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now(),
        };
      },
      onTouchEnd: (e) => {
        if (!touchStartRef.current) return;
        
        touchEndRef.current = {
          x: e.changedTouches[0].clientX,
          y: e.changedTouches[0].clientY,
          time: Date.now(),
        };
        
        const deltaX = touchEndRef.current.x - touchStartRef.current.x;
        const deltaY = touchEndRef.current.y - touchStartRef.current.y;
        const deltaTime = touchEndRef.current.time - touchStartRef.current.time;
        
        // Prevent accidental swipes (too slow)
        if (deltaTime > 500) return;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          if (Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0 && onSwipeRight) {
              onSwipeRight();
            } else if (deltaX < 0 && onSwipeLeft) {
              onSwipeLeft();
            }
          }
        } else {
          // Vertical swipe
          if (Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0 && onSwipeDown) {
              onSwipeDown();
            } else if (deltaY < 0 && onSwipeUp) {
              onSwipeUp();
            }
          }
        }
        
        touchStartRef.current = null;
        touchEndRef.current = null;
      },
    };
  }, []);

  // Long press detection
  const handleLongPress = useCallback((onLongPress, delay = 500) => {
    return {
      onTouchStart: (e) => {
        longPressTimeoutRef.current = setTimeout(() => {
          if (onLongPress) {
            onLongPress(e);
          }
        }, delay);
      },
      onTouchEnd: () => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = null;
        }
      },
      onTouchMove: () => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = null;
        }
      },
    };
  }, []);

  // Enhanced click handler for touch devices
  const handleTap = useCallback((onClick, onDoubleClick) => {
    let lastTap = 0;
    
    return {
      onClick: (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 500 && tapLength > 0) {
          // Double tap
          if (onDoubleClick) {
            onDoubleClick(e);
          }
        } else {
          // Single tap
          if (onClick) {
            onClick(e);
          }
        }
        
        lastTap = currentTime;
      },
    };
  }, []);

  // Haptic feedback (if supported)
  const vibrate = useCallback((pattern = [10]) => {
    if (isTouchDevice && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, [isTouchDevice]);

  return {
    isTouchDevice,
    isMobile,
    handleSwipe,
    handleLongPress,
    handleTap,
    vibrate,
  };
};

export default useTouchHandler;
