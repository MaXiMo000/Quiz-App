// Service Worker for Quiz App PWA - Enhanced Installation Support
const CACHE_NAME = 'quiz-app-v2.1.0';
const STATIC_CACHE_NAME = 'quiz-app-static-v2.1.0';
const DYNAMIC_CACHE_NAME = 'quiz-app-dynamic-v2.1.0';

// Resources to cache on install (all actual frontend routes + dynamic patterns)
const STATIC_RESOURCES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/quiz-img.png',
    '/offline.html',
    // Public routes
    '/login',
    '/register',
    '/google-auth',
    // Protected routes - all main pages for offline access
    '/enhanced-dashboard',
    '/achievements',
    '/themes',
    '/friends',
    '/study-groups',
    '/gamification',
    '/ai-study-buddy',
    '/real-time-quiz',
    '/user/test',
    '/user/report',
    '/written-tests',
    '/leaderboard',
    '/xp-leaderboard',
    '/analytics',
    '/intelligence-dashboard',
    '/premium/quizzes',
    '/contact',
    '/contactUs',
    '/privacy-policy',
    '/terms-and-conditions',
    '/refund-policy',
    '/shipping-policy',
    // Admin pages
    '/admin',
    '/admin/create',
    '/admin/report',
    '/admin/written-tests',
    '/admin/written-test/report',
    '/test-features'
];

// Dynamic route patterns that should also work offline
const DYNAMIC_ROUTE_PATTERNS = [
    new RegExp('^/user/test/[0-9a-fA-F]{24}$'), // /user/test/:id
    new RegExp('^/report/[0-9a-fA-F]{24}$'), // /report/:id
    new RegExp('^/adaptive/[0-9a-fA-F]{24}$'), // /adaptive/:id
    new RegExp('^/admin/quiz/[0-9a-fA-F]{24}$'), // /admin/quiz/:id
    new RegExp('^/admin/written-test/question/[0-9a-fA-F]{24}$'), // /admin/written-test/question/:id
    new RegExp('^/take-written-test/[0-9a-fA-F]{24}$'), // /take-written-test/:id
    new RegExp('^/user/written-test-report/[0-9a-fA-F]{24}$'), // /user/written-test-report/:id
    new RegExp('^/premium/quiz/[0-9a-fA-F]{24}$') // /premium/quiz/:id
];

// API endpoints to cache (based on comprehensive backend routes analysis)
const API_CACHE_PATTERNS = [
    // Core Quiz System
    new RegExp('/api/quizzes'),
    new RegExp('/api/reports'),
    new RegExp('/api/written-tests'),
    new RegExp('/api/written-test-reports'),
    
    // User Management
    new RegExp('/api/users/me'),
    new RegExp('/api/users/[0-9a-fA-F]{24}'), // MongoDB ObjectId pattern
    new RegExp('/api/users/register'),
    new RegExp('/api/users/login'),
    new RegExp('/api/users/google'),
    new RegExp('/api/users/.+/theme'),
    new RegExp('/api/users/update-role'),
    
    // Dashboard & Analytics
    new RegExp('/api/dashboard'),
    new RegExp('/api/analytics'),
    new RegExp('/api/achievements'),
    new RegExp('/api/leaderboard'),
    
    // Gamification System
    new RegExp('/api/gamification/challenges'),
    new RegExp('/api/gamification/tournaments'),
    new RegExp('/api/gamification/quizzes'),
    new RegExp('/api/gamification/.+/history'),
    new RegExp('/api/gamification/.+/completed'),
    new RegExp('/api/gamification/.+/status'),
    
    // Intelligence & AI Features
    new RegExp('/api/intelligence'),
    new RegExp('/api/ai-study-buddy'),
    new RegExp('/api/adaptive'),
    
    // Real-time Features
    new RegExp('/api/real-time-quiz'),
    
    // Social Features
    new RegExp('/api/social'),
    new RegExp('/api/study-groups'),
    
    // System
    new RegExp('/api/debug')
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
        if (request.url.includes('/api/quizzes')) {
            return new Response(JSON.stringify({
                error: 'Offline',
                message: 'You are currently offline. Limited quiz data available.',
                cached: true,
                quizzes: [] // Empty array for graceful handling
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (request.url.includes('/api/users/me')) {
            // Try to get cached user data from localStorage
            try {
                const userData = localStorage.getItem('user');
                if (userData) {
                    const user = JSON.parse(userData);
                    return new Response(JSON.stringify({
                        ...user,
                        offline: true,
                        message: 'Offline mode - using cached user data'
                    }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            } catch {
                // Fallback if localStorage fails
            }
            
            return new Response(JSON.stringify({
                error: 'Offline',
                message: 'User data requires internet connection',
                cached: false
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (request.url.includes('/api/dashboard')) {
            return new Response(JSON.stringify({
                error: 'Offline',
                message: 'Dashboard data will sync when connection is restored.',
                cached: true,
                dashboardData: {
                    totalQuizzes: 0,
                    averageScore: 0,
                    streakDays: 0,
                    achievements: [],
                    weeklyProgress: [],
                    recentActivity: []
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (request.url.includes('/api/reports')) {
            return new Response(JSON.stringify({
                error: 'Offline',
                message: 'Reports will sync when online.',
                cached: true,
                reports: []
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (request.url.includes('/api/achievements')) {
            return new Response(JSON.stringify({
                error: 'Offline',
                message: 'Achievements cached locally.',
                cached: true,
                achievements: []
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (request.url.includes('/api/leaderboard')) {
            return new Response(JSON.stringify({
                error: 'Offline',
                message: 'Leaderboard requires internet connection.',
                cached: true,
                leaderboard: []
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (request.url.includes('/api/gamification')) {
            return new Response(JSON.stringify({
                error: 'Offline',
                message: 'Gamification features cached locally.',
                cached: true,
                challenges: [],
                tournaments: [],
                achievements: []
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (request.url.includes('/api/ai-study-buddy')) {
            return new Response(JSON.stringify({
                error: 'Offline',
                message: 'AI Study Buddy requires internet connection. Please try again when online.',
                cached: true
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (request.url.includes('/api/real-time-quiz')) {
            return new Response(JSON.stringify({
                error: 'Offline',
                message: 'Real-time features require internet connection.',
                cached: true
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (request.url.includes('/api/analytics')) {
            return new Response(JSON.stringify({
                error: 'Offline',
                message: 'Analytics data cached locally.',
                cached: true,
                analytics: {}
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
    } catch {
        // Return a fallback image for offline
        return new Response('', { status: 404 });
    }
}

// Stale While Revalidate for static resources with dynamic route support
async function handleStaticRequest(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Check if it's a dynamic route that should serve the main app
    const isDynamicRoute = DYNAMIC_ROUTE_PATTERNS.some(pattern => pattern.test(pathname));
    
    // For dynamic routes, always try to serve the main app (SPA routing)
    if (isDynamicRoute) {
        const appResponse = await caches.match('/');
        if (appResponse) {
            return appResponse;
        }
    }
    
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
        // For navigation requests (HTML pages), return the main app for SPA routing
        if (request.mode === 'navigate') {
            // Try to return the main app for SPA routing
            const appResponse = await caches.match('/');
            if (appResponse) {
                return appResponse;
            }
            // Fallback to offline page
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

// Helper functions for IndexedDB operations (Enhanced for better offline support)
async function getStoredSubmissions() {
    try {
        // Simple localStorage fallback for now - can be enhanced with IndexedDB
        const stored = localStorage.getItem('offline-quiz-submissions');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Failed to get stored submissions:', error);
        return [];
    }
}

async function removeStoredSubmission(id) {
    try {
        const submissions = await getStoredSubmissions();
        const filtered = submissions.filter(sub => sub.id !== id);
        localStorage.setItem('offline-quiz-submissions', JSON.stringify(filtered));
        return true;
    } catch (error) {
        console.error('Failed to remove stored submission:', error);
        return false;
    }
}

async function getStoredChatMessages() {
    try {
        const stored = localStorage.getItem('offline-chat-messages');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Failed to get stored chat messages:', error);
        return [];
    }
}

async function removeStoredChatMessage(id) {
    try {
        const messages = await getStoredChatMessages();
        const filtered = messages.filter(msg => msg.id !== id);
        localStorage.setItem('offline-chat-messages', JSON.stringify(filtered));
        return true;
    } catch (error) {
        console.error('Failed to remove stored chat message:', error);
        return false;
    }
}

console.log('🚀 Quiz App Service Worker loaded successfully');
