// Service Worker for Quiz App PWA
const CACHE_NAME = 'quiz-app-v1.0.0';
const STATIC_CACHE_NAME = 'quiz-app-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'quiz-app-dynamic-v1.0.0';

// Resources to cache on install
const STATIC_RESOURCES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/src/main.jsx',
    '/src/App.jsx',
    '/src/App.css',
    '/src/index.css',
    // Add key components
    '/src/components/EnhancedDashboard.jsx',
    '/src/components/AIStudyBuddy.jsx',
    '/src/components/RealTimeQuiz.jsx',
    '/src/assets/react.svg',
    '/public/quiz-img.png',
    // Offline fallback page
    '/offline.html'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
    new RegExp('/api/quiz'),
    new RegExp('/api/users/profile'),
    new RegExp('/api/analytics'),
];

// Install event - cache static resources
self.addEventListener('install', event => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('📦 Caching static resources...');
                return cache.addAll(STATIC_RESOURCES);
            })
            .then(() => {
                console.log('✅ Static resources cached successfully');
                return self.skipWaiting(); // Activate immediately
            })
            .catch(error => {
                console.error('❌ Failed to cache static resources:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE_NAME && 
                        cacheName !== DYNAMIC_CACHE_NAME &&
                        cacheName.startsWith('quiz-app-')) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker activated');
            return self.clients.claim(); // Take control of all clients
        })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests and chrome-extension requests
    if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
        return;
    }

    // Handle different types of requests
    if (request.url.includes('/api/')) {
        // API requests - Network First with cache fallback
        event.respondWith(handleApiRequest(request));
    } else if (request.destination === 'image') {
        // Images - Cache First
        event.respondWith(handleImageRequest(request));
    } else {
        // HTML, CSS, JS - Stale While Revalidate
        event.respondWith(handleStaticRequest(request));
    }
});

// Network First strategy for API requests
async function handleApiRequest(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        // If successful, cache the response for offline use
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('🌐 Network failed, trying cache for:', request.url);
        
        // Network failed, try cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline response for specific API endpoints
        if (request.url.includes('/api/quiz')) {
            return new Response(JSON.stringify({
                error: 'Offline',
                message: 'You are currently offline. Some features may not be available.',
                cached: true
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        throw error;
    }
}

// Cache First strategy for images
async function handleImageRequest(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        // Return a fallback image for offline
        return new Response(error, { status: 404 });
    }
}

// Stale While Revalidate for static resources
async function handleStaticRequest(request) {
    const cachedResponse = await caches.match(request);
    
    // Return cached version immediately if available
    if (cachedResponse) {
        // Update cache in background
        fetch(request).then(networkResponse => {
            if (networkResponse.ok) {
                caches.open(STATIC_CACHE_NAME).then(cache => {
                    cache.put(request, networkResponse);
                });
            }
        }).catch(() => {
            // Network failed, but we have cache
        });
        
        return cachedResponse;
    }
    
    // No cache, try network
    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(STATIC_CACHE_NAME);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return caches.match('/offline.html');
        }
        throw error;
    }
}

// Background sync for offline quiz submissions
self.addEventListener('sync', event => {
    console.log('🔄 Background sync triggered:', event.tag);
    
    if (event.tag === 'quiz-submission') {
        event.waitUntil(syncQuizSubmissions());
    } else if (event.tag === 'ai-chat') {
        event.waitUntil(syncAIChatMessages());
    }
});

// Sync quiz submissions when back online
async function syncQuizSubmissions() {
    try {
        const submissions = await getStoredSubmissions();
        
        for (const submission of submissions) {
            try {
                const response = await fetch('/api/quiz/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${submission.token}`
                    },
                    body: JSON.stringify(submission.data)
                });
                
                if (response.ok) {
                    await removeStoredSubmission(submission.id);
                    console.log('✅ Synced quiz submission:', submission.id);
                }
            } catch (error) {
                console.error('❌ Failed to sync submission:', error);
            }
        }
    } catch (error) {
        console.error('❌ Background sync failed:', error);
    }
}

// Sync AI chat messages when back online
async function syncAIChatMessages() {
    try {
        const messages = await getStoredChatMessages();
        
        for (const message of messages) {
            try {
                const response = await fetch('/api/ai-study-buddy/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${message.token}`
                    },
                    body: JSON.stringify(message.data)
                });
                
                if (response.ok) {
                    await removeStoredChatMessage(message.id);
                    console.log('✅ Synced AI chat message:', message.id);
                }
            } catch (error) {
                console.error('❌ Failed to sync chat message:', error);
            }
        }
    } catch (error) {
        console.error('❌ Chat sync failed:', error);
    }
}

// Push notification handling
self.addEventListener('push', event => {
    const options = {
        body: 'You have new quiz challenges waiting!',
        icon: '/quiz-img.png',
        badge: '/quiz-img.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Take Quiz',
                icon: '/quiz-img.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/quiz-img.png'
            }
        ]
    };

    if (event.data) {
        const payload = event.data.json();
        options.body = payload.body || options.body;
        options.title = payload.title || 'Quiz App';
        options.data = payload.data || options.data;
    }

    event.waitUntil(
        self.registration.showNotification('Quiz App', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('🔔 Notification clicked:', event.notification.tag);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            self.clients.openWindow('/enhanced-dashboard')
        );
    } else if (event.action === 'close') {
        // Just close the notification
        return;
    } else {
        // Default action - open app
        event.waitUntil(
            self.clients.openWindow('/')
        );
    }
});

// Message handling between main thread and service worker
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    } else if (event.data && event.data.type === 'CACHE_QUIZ_DATA') {
        // Cache quiz data for offline use
        cacheQuizData(event.data.quizData);
    }
});

// Cache quiz data for offline access
async function cacheQuizData(quizData) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        const response = new Response(JSON.stringify(quizData), {
            headers: { 'Content-Type': 'application/json' }
        });
        await cache.put('/offline-quiz-data', response);
        console.log('✅ Quiz data cached for offline use');
    } catch (error) {
        console.error('❌ Failed to cache quiz data:', error);
    }
}

// Helper functions for IndexedDB operations
async function getStoredSubmissions() {
    // Implement IndexedDB operations for offline storage
    return [];
}

async function removeStoredSubmission(_id) {
    // Implement IndexedDB removal
    return true;
}

async function getStoredChatMessages() {
    // Implement IndexedDB operations for chat messages
    return [];
}

async function removeStoredChatMessage(_id) {
    // Implement IndexedDB removal
    return true;
}

console.log('🚀 Quiz App Service Worker loaded successfully');
