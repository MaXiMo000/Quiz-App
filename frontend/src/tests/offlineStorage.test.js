import { vi } from 'vitest'

// Simple offline storage tests
describe('Offline Storage', () => {
  // Mock localStorage
  const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })
    vi.clearAllMocks()
  })

  it('should save data to offline storage', () => {
    const saveToOfflineStorage = (key, data) => {
      try {
        localStorage.setItem(`offline_${key}`, JSON.stringify(data))
        return true
      } catch {
        return false
      }
    }

    const result = saveToOfflineStorage('test-key', { id: 1, name: 'Test' })
    expect(result).toBe(true)
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('offline_test-key', '{"id":1,"name":"Test"}')
  })

  it('should retrieve data from offline storage', () => {
    const getFromOfflineStorage = (key) => {
      try {
        const data = localStorage.getItem(`offline_${key}`)
        return data ? JSON.parse(data) : null
      } catch {
        return null
      }
    }

    mockLocalStorage.getItem.mockReturnValue('{"id":1,"name":"Test"}')
    const result = getFromOfflineStorage('test-key')
    expect(result).toEqual({ id: 1, name: 'Test' })
  })

  it('should clear offline storage', () => {
    const clearOfflineStorage = () => {
      try {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('offline_'))
        keys.forEach(key => localStorage.removeItem(key))
        return true
      } catch {
        return false
      }
    }

    // Mock Object.keys to return some keys
    Object.defineProperty(Object, 'keys', {
      value: vi.fn().mockReturnValue(['offline_key1', 'offline_key2', 'regular_key']),
      writable: true,
    })

    const result = clearOfflineStorage()
    expect(result).toBe(true)
  })
})
