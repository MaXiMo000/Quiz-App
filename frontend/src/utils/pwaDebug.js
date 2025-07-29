// PWA Debug Utilities
// Add this to browser console to debug PWA installation issues

window.pwaDebug = {
  // Check current PWA status
  checkStatus() {
    console.group('🔍 PWA Debug Status');
    
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const hasPrompt = !!window.pwaManager?.installPrompt;
    const isInstallable = !!window.pwaManager?.isInstallable;
    
    console.log('📱 Display Mode:', window.matchMedia('(display-mode: standalone)').matches ? 'Standalone' : 'Browser');
    console.log('🌐 User Agent:', navigator.userAgent);
    console.log('📦 Service Worker:', 'serviceWorker' in navigator ? 'Supported' : 'Not Supported');
    console.log('🔧 Install Prompt:', hasPrompt ? 'Available' : 'Not Available');
    console.log('✅ Is Installable:', isInstallable ? 'Yes' : 'No');
    console.log('📱 Is Installed:', isStandalone ? 'Yes' : 'No');
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        console.log('🔧 SW Registration:', reg ? 'Active' : 'None');
        if (reg) {
          console.log('📍 SW Scope:', reg.scope);
          console.log('📊 SW State:', reg.active?.state || 'Unknown');
        }
      });
    }
    
    console.groupEnd();
  },

  // Force trigger beforeinstallprompt (for testing)
  triggerInstallPrompt() {
    console.log('🚀 Triggering install prompt...');
    if (window.pwaManager?.installPrompt) {
      window.pwaManager.promptInstall();
    } else {
      console.warn('❌ No install prompt available');
      console.log('💡 Try visiting the site in an incognito window or wait for the browser to detect PWA criteria');
    }
  },

  // Check PWA criteria
  checkCriteria() {
    console.group('📋 PWA Installation Criteria');
    
    // Check manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    console.log('📄 Manifest:', manifestLink ? '✅ Found' : '❌ Missing');
    
    // Check service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        console.log('🔧 Service Worker:', reg ? '✅ Registered' : '❌ Not Registered');
      });
    }
    
    // Check HTTPS
    const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
    console.log('🔒 HTTPS:', isHTTPS ? '✅ Secure' : '❌ Not Secure');
    
    // Check if visited enough times
    console.log('📊 Visit Count: Check your browser for site engagement metrics');
    
    console.groupEnd();
  },

  // Clear PWA data
  clearPWAData() {
    console.log('🧹 Clearing PWA data...');
    
    // Clear localStorage PWA data
    localStorage.removeItem('pwa_installed_at');
    
    // Clear service worker cache
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('quiz-app')) {
            caches.delete(name);
            console.log('🗑️ Cleared cache:', name);
          }
        });
      });
    }
    
    // Unregister service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => {
          reg.unregister();
          console.log('🗑️ Unregistered SW:', reg.scope);
        });
      });
    }
    
    console.log('✅ PWA data cleared. Refresh the page to start fresh.');
  },

  // Get installation instructions
  getInstructions() {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    console.group('📖 Installation Instructions');
    
    if (isIOS) {
      console.log('📱 iOS Safari:');
      console.log('1. Tap the Share button (⬆️)');
      console.log('2. Scroll down and tap "Add to Home Screen"');
      console.log('3. Tap "Add" to confirm');
    } else if (isMobile) {
      console.log('📱 Android Chrome:');
      console.log('1. Tap the menu (⋮) in your browser');
      console.log('2. Select "Add to Home screen" or "Install app"');
      console.log('3. Tap "Add" or "Install" to confirm');
    } else {
      console.log('💻 Desktop Chrome/Edge:');
      console.log('1. Look for the install icon (⬇️) in your address bar');
      console.log('2. Click it and select "Install"');
      console.log('3. Or use browser menu → "Install QuizNest"');
    }
    
    console.groupEnd();
  }
};

// Auto-run status check when loaded
console.log('🔧 PWA Debug utilities loaded. Use window.pwaDebug.checkStatus() to check PWA status');

export default window.pwaDebug;
