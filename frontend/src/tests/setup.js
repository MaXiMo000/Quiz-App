import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
})

// Mock fetch
global.fetch = vi.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Suppress JSDOM errors
const originalError = console.error
console.error = (...args) => {
  const message = args[0] ? String(args[0]) : ''
  if (message.includes('_ownerDocument') ||
      message.includes('DocumentImpl') ||
      message.includes('HTMLBodyElementImpl') ||
      message.includes('_adoptNode') ||
      message.includes('_replaceAll') ||
      message.includes('innerHTML')) {
    return
  }
  originalError(...args)
}

// Global error handlers to suppress JSDOM errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const message = event.message || ''
    if (message.includes('_ownerDocument') ||
        message.includes('DocumentImpl') ||
        message.includes('HTMLBodyElementImpl') ||
        message.includes('_adoptNode') ||
        message.includes('_replaceAll') ||
        message.includes('innerHTML')) {
      event.preventDefault()
      return true
    }
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason ? String(event.reason) : ''
    if (reason.includes('_ownerDocument') ||
        reason.includes('DocumentImpl') ||
        reason.includes('HTMLBodyElementImpl') ||
        reason.includes('_adoptNode') ||
        reason.includes('_replaceAll') ||
        reason.includes('innerHTML')) {
      event.preventDefault()
      return true
    }
  })
}
