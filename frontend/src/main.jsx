import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// PWA: only register the service worker in production.
// In dev, Vite serves modules from /src/... — the SW cache strategy breaks dynamic imports ("Failed to fetch dynamically imported module").
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    if (import.meta.env.DEV) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      } catch {
        /* ignore */
      }
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                if (confirm('🚀 New features available! Refresh to update?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              } else {
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

      if (registration.ready) {
        registration.ready.then(() => {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('pwa-check-installability'));
          }, 3000);
        });
      }

      setInterval(() => {
        registration.update();
      }, 300000);
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  });
}

if (import.meta.env.PROD && 'Notification' in window && 'serviceWorker' in navigator) {
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
