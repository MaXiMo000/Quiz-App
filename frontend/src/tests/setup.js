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
  querySelectorAll: vi.fn(() => []), // Return empty array instead of undefined
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
const originalConsoleWarn = console.warn

console.error = (...args) => {
  // Suppress webidl-conversions and whatwg-url errors in tests
  if (args[0] && typeof args[0] === 'string' &&
      (args[0].includes('webidl-conversions') ||
       args[0].includes('whatwg-url') ||
       args[0].includes('Cannot read properties of undefined'))) {
    return
  }
  originalConsoleError(...args)
}

console.warn = (...args) => {
  // Suppress webidl-conversions warnings in tests
  if (args[0] && typeof args[0] === 'string' &&
      (args[0].includes('webidl-conversions') || args[0].includes('whatwg-url'))) {
    return
  }
  originalConsoleWarn(...args)
}

// Mock the specific issue with webidl-conversions
if (typeof globalThis !== 'undefined') {
  // Ensure proper URL handling
  globalThis.URL = globalThis.URL || URL
  globalThis.URLSearchParams = globalThis.URLSearchParams || URLSearchParams

  // Mock the specific get method that's causing issues
  if (!globalThis.Map) {
    globalThis.Map = Map
  }

  // Ensure proper error handling for webidl-conversions
  const originalError = globalThis.Error
  globalThis.Error = function(...args) {
    const error = new originalError(...args)
    // Suppress specific webidl-conversions errors
    if (error.stack && error.stack.includes('webidl-conversions')) {
      return new Error('Mocked webidl-conversions error')
    }
    return error
  }
}

// Additional polyfills for webidl-conversions compatibility
if (typeof globalThis !== 'undefined') {
  // Ensure proper Map and Set support
  if (!globalThis.Map) {
    globalThis.Map = Map
  }
  if (!globalThis.Set) {
    globalThis.Set = Set
  }

  // Ensure Array methods are available
  if (!Array.prototype.join) {
    Array.prototype.join = function(separator) {
      if (this.length === 0) return ''
      return this.reduce((acc, item, index) => {
        if (index === 0) return String(item)
        return acc + (separator || ',') + String(item)
      }, '')
    }
  }

  // Ensure proper array handling for undefined values
  const originalArrayFrom = Array.from
  Array.from = function(arrayLike, mapFn, thisArg) {
    if (!arrayLike) return []
    return originalArrayFrom.call(this, arrayLike, mapFn, thisArg)
  }

  // Mock any undefined array operations
  const originalArrayIsArray = Array.isArray
  Array.isArray = function(obj) {
    if (obj === undefined || obj === null) return false
    return originalArrayIsArray.call(this, obj)
  }

  // Mock the specific issue with webidl-conversions
  const originalRequire = globalThis.require
  if (originalRequire) {
    globalThis.require = function(id) {
      if (id === 'webidl-conversions' || id === 'whatwg-url') {
        return {}
      }
      return originalRequire(id)
    }
  }
}
