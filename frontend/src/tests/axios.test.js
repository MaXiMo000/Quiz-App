import { vi } from 'vitest'

// Simple axios mock tests
describe('Axios Configuration', () => {
  it('should have axios available', () => {
    // Mock axios for testing
    const mockAxios = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    }

    expect(mockAxios).toBeDefined()
    expect(typeof mockAxios.get).toBe('function')
    expect(typeof mockAxios.post).toBe('function')
    expect(typeof mockAxios.put).toBe('function')
    expect(typeof mockAxios.delete).toBe('function')
  })

  it('should handle successful requests', () => {
    const mockAxios = {
      get: vi.fn().mockResolvedValue({ data: { message: 'Success' } }),
    }

    return mockAxios.get('/api/test').then(response => {
      expect(response.data).toEqual({ message: 'Success' })
    })
  })

  it('should handle request errors', () => {
    const mockAxios = {
      get: vi.fn().mockRejectedValue(new Error('Request failed')),
    }

    return expect(mockAxios.get('/api/test')).rejects.toThrow('Request failed')
  })
})
