import { vi } from 'vitest'

// Simple PWA utilities tests
describe('PWA Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should check if online', () => {
    const isOnline = () => navigator.onLine

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    })

    expect(isOnline()).toBe(true)
  })

  it('should check if offline', () => {
    const isOnline = () => navigator.onLine

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
    })

    expect(isOnline()).toBe(false)
  })

  it('should detect PWA mode', () => {
    const isPWA = () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             window.navigator.standalone === true
    }

    // Mock window.matchMedia
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
    })

    expect(isPWA()).toBe(true)
  })

  it('should handle service worker registration', () => {
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js')
          return registration
        } catch (error) {
          return null
        }
      }
      return null
    }

    // Mock navigator.serviceWorker
    const mockRegister = vi.fn().mockResolvedValue({ scope: '/' })
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: mockRegister },
      writable: true,
    })

    return registerServiceWorker().then(result => {
      expect(result).toBeDefined()
      expect(mockRegister).toHaveBeenCalledWith('/sw.js')
    })
  })
})
