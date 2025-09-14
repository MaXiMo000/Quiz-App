import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getTheme, setTheme, toggleTheme, isValidTheme, getSystemTheme } from '../utils/themeUtils'

describe('Theme Utilities', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()

    // Reset localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    })

    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    })
  })

  it('should get theme from localStorage', () => {
    // Mock localStorage
    const mockGetItem = vi.fn().mockReturnValue('dark')
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: mockGetItem },
      writable: true,
    })
    Object.defineProperty(global, 'localStorage', {
      value: { getItem: mockGetItem },
      writable: true,
    })

    expect(getTheme()).toBe('dark')
  })

  it('should set theme in localStorage', () => {
    // Mock localStorage
    const mockSetItem = vi.fn()
    Object.defineProperty(window, 'localStorage', {
      value: { setItem: mockSetItem },
      writable: true,
    })
    Object.defineProperty(global, 'localStorage', {
      value: { setItem: mockSetItem },
      writable: true,
    })

    setTheme('dark')
    expect(mockSetItem).toHaveBeenCalledWith('theme', 'dark')
  })

  it('should toggle theme', () => {
    expect(toggleTheme('light')).toBe('dark')
    expect(toggleTheme('dark')).toBe('light')
  })

  it('should validate theme', () => {
    expect(isValidTheme('light')).toBe(true)
    expect(isValidTheme('dark')).toBe(true)
    expect(isValidTheme('Default')).toBe(true)
    expect(isValidTheme('Galaxy')).toBe(true)
    expect(isValidTheme('blue')).toBe(false)
  })

  it('should get system theme preference', () => {
    // Mock window.matchMedia with proper setup
    const mockMatchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })

    // Ensure window.matchMedia is properly mocked
    Object.defineProperty(window, 'matchMedia', {
      value: mockMatchMedia,
      writable: true,
    })

    expect(getSystemTheme()).toBe('dark')
  })
})
