import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Enhanced Service Worker Registration with better PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      console.log('🔧 Registering Service Worker with enhanced PWA support...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('✅ Service Worker registered successfully:', registration.scope);
      
      // Handle service worker updates with better UX
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          console.log('🔄 New service worker found, installing...');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New content available, show update notification
                console.log('🚀 New content available! Refreshing...');
                if (confirm('🚀 New features available! Refresh to update?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              } else {
                // First install
                console.log('🎉 Service worker installed for first time');
                
                // Dispatch PWA ready event after a short delay
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('pwa-ready', {
                    detail: { timestamp: Date.now() }
                  }));
                }, 2000);
              }
            }
          });
        }
      });
      
      // Trigger installation criteria check after SW is ready
      if (registration.ready) {
        registration.ready.then(() => {
          console.log('🎯 Service Worker is ready, triggering PWA installability check...');
          
          // Force a check for PWA installability
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('pwa-check-installability'));
          }, 3000);
        });
      }
      
      // Check for updates more frequently during development
      const isDevelopment = import.meta.env.DEV;
      if (isDevelopment) {
        setInterval(() => {
          registration.update();
        }, 30000); // Every 30 seconds in dev
      } else {
        setInterval(() => {
          registration.update();
        }, 300000); // Every 5 minutes in production
      }
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  });
}

// Request notification permissions for PWA
if ('Notification' in window && 'serviceWorker' in navigator) {
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      console.log('🔔 Notification permission granted');
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
