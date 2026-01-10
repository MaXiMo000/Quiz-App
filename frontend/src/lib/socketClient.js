// src/lib/socketClient.js
import { io } from 'socket.io-client';
import config from '../config/config';

let socket = null;
let quizzesCache = null;
let quizzesPromise = null;
let socketUsers = new Set(); // Track which components are using the socket

/**
 * Returns a singleton socket. If socket already exists and connected, reuse it.
 * token: string (JWT) required for auth
 * options: optional overrides
 */
export function getSocket(token, opts = {}) {
  if (!token) return null;

  // reuse existing alive socket
  if (socket && socket.connected) {
    return socket;
  }

  // cleanup stale socket if any
  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch (e) {
      console.warn('Error cleaning up socket:', e);
    }
    socket = null;
    socketUsers.clear();
  }

  // Use WebSocket with polling fallback for better performance
  const socketOptions = {
    path: '/socket.io/collaborative',
    auth: { token },
    transports: opts.transports || ['websocket', 'polling'], // Try WebSocket first, fallback to polling
    autoConnect: opts.autoConnect ?? true,
    reconnection: opts.reconnection ?? true,
    reconnectionAttempts: opts.reconnectionAttempts ?? 5, // Reduce reconnection attempts
    reconnectionDelay: 1000, // 1 second delay between reconnections
    timeout: 20000, // 20 second timeout
    ...opts
  };

  socket = io(config.BACKEND_URL, socketOptions);

  // Helpful debug hooks (you can remove in production)
  socket.io?.engine?.on?.('upgradeError', (err) => {
    // engine-level upgrade errors
    console.warn('socketClient: engine upgradeError', err);
  });

  socket.on('connect_error', (err) => {
    console.warn('socketClient: connect_error', err && err.message);
  });

  return socket;
}

/**
 * Fetches quizzes with singleton pattern to prevent multiple API calls
 * token: string (JWT) required for auth
 */
export async function getQuizzes(token) {
  if (!token) return [];

  // Return cached quizzes if available
  if (quizzesCache) {
    console.log('🔄 Using cached quizzes:', quizzesCache.length);
    return quizzesCache;
  }

  // Return existing promise if one is in progress
  if (quizzesPromise) {
    console.log('🔄 Waiting for existing quiz fetch...');
    return await quizzesPromise;
  }

  // Create new fetch promise
  quizzesPromise = (async () => {
    try {
      console.log('🔄 Fetching quizzes...');
      const res = await fetch(`${config.BACKEND_URL}/api/quizzes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const quizzes = await res.json();
        console.log('✅ Quizzes loaded:', quizzes.length);
        quizzesCache = quizzes;
        return quizzes;
      } else {
        console.warn('Failed to load quizzes', res.status);
        return [];
      }
    } catch (err) {
      console.error('fetch quizzes error', err);
      return [];
    } finally {
      quizzesPromise = null;
    }
  })();

  return await quizzesPromise;
}

export function clearQuizzesCache() {
  quizzesCache = null;
  quizzesPromise = null;
}

export function registerSocketUser(componentName) {
  socketUsers.add(componentName);
  console.log(`📱 Socket user registered: ${componentName}. Total users: ${socketUsers.size}`);
}

export function unregisterSocketUser(componentName) {
  socketUsers.delete(componentName);
  console.log(`📱 Socket user unregistered: ${componentName}. Total users: ${socketUsers.size}`);

  // If no more users, cleanup socket after a delay
  if (socketUsers.size === 0) {
    setTimeout(() => {
      if (socketUsers.size === 0 && socket) {
        console.log('🧹 No more socket users, cleaning up socket...');
        cleanupSocket();
      }
    }, 5000); // 5 second delay to allow for quick reconnections
  }
}

export function cleanupSocket() {
  if (!socket) return;
  try {
    socket.removeAllListeners();
    socket.disconnect();
  } catch (e) {
    console.warn('Error during socket cleanup:', e);
  }
  socket = null;
  socketUsers.clear();
}
