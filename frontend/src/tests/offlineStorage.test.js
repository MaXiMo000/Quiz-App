import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveToOfflineStorage, getFromOfflineStorage, clearOfflineStorage } from '../utils/offlineStorage'

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
    const result = saveToOfflineStorage('test-key', { id: 1, name: 'Test' })
    expect(result).toBe(true)
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('offline_test-key', '{"id":1,"name":"Test"}')
  })

  it('should retrieve data from offline storage', () => {
    mockLocalStorage.getItem.mockReturnValue('{"id":1,"name":"Test"}')
    const result = getFromOfflineStorage('test-key')
    expect(result).toEqual({ id: 1, name: 'Test' })
  })

  it('should clear offline storage', () => {
    // Mock Object.keys to return some keys
    Object.defineProperty(Object, 'keys', {
      value: vi.fn().mockReturnValue(['offline_key1', 'offline_key2', 'regular_key']),
      writable: true,
    })

    const result = clearOfflineStorage()
    expect(result).toBe(true)
  })
})
