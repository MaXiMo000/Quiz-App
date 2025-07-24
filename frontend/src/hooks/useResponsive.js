// Enhanced Responsive Hook for Quiz App
import { useState, useEffect } from 'react';

const useResponsive = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const [deviceType, setDeviceType] = useState('desktop');
  const [orientation, setOrientation] = useState('portrait');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({ width, height });
      
      // Determine device type
      if (width <= 480) {
        setDeviceType('mobile');
      } else if (width <= 768) {
        setDeviceType('tablet');
      } else if (width <= 1024) {
        setDeviceType('laptop');
      } else {
        setDeviceType('desktop');
      }
      
      // Determine orientation
      setOrientation(width > height ? 'landscape' : 'portrait');
    };

    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Handle orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 100); // Small delay for orientation change
    });

    // Initial check
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Responsive breakpoint helpers
  const breakpoints = {
    mobile: screenSize.width <= 480,
    tablet: screenSize.width > 480 && screenSize.width <= 768,
    laptop: screenSize.width > 768 && screenSize.width <= 1024,
    desktop: screenSize.width > 1024,
    sm: screenSize.width >= 640,
    md: screenSize.width >= 768,
    lg: screenSize.width >= 1024,
    xl: screenSize.width >= 1280,
    '2xl': screenSize.width >= 1536,
  };

  // Touch device detection
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return {
    screenSize,
    deviceType,
    orientation,
    breakpoints,
    isTouchDevice,
    // Utility functions
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop' || deviceType === 'laptop',
    isLandscape: orientation === 'landscape',
    isPortrait: orientation === 'portrait',
  };
};

export default useResponsive;
