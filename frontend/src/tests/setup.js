import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage - but allow individual tests to override
if (!global.localStorage) {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  global.localStorage = localStorageMock
}

// Mock sessionStorage - but allow individual tests to override
if (!global.sessionStorage) {
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  global.sessionStorage = sessionStorageMock
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock URL and URLSearchParams for webidl-conversions compatibility
global.URL = URL
global.URLSearchParams = URLSearchParams

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = vi.fn()
}

// Mock DOM APIs that webidl-conversions might need
global.document = {
  createElement: vi.fn(() => ({
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    hasAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  createTextNode: vi.fn(),
  getElementById: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(),
}

// Mock window properties that might be needed
global.window = {
  ...global.window,
  document: global.document,
  location: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
  },
  navigator: {
    userAgent: 'test',
    platform: 'test',
    language: 'en-US',
  },
}

// Mock specific webidl-conversions issues
const originalConsoleError = console.error
console.error = (...args) => {
  // Suppress webidl-conversions errors in tests
  if (args[0] && typeof args[0] === 'string' && args[0].includes('webidl-conversions')) {
    return
  }
  originalConsoleError(...args)
}
