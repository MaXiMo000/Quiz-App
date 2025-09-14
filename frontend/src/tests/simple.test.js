// Simple test file that works
describe('Simple Tests', () => {
  it('should pass basic math test', () => {
    expect(2 + 2).toBe(4)
  })

  it('should pass string test', () => {
    expect('hello').toBe('hello')
  })

  it('should pass array test', () => {
    const arr = [1, 2, 3]
    expect(arr).toHaveLength(3)
    expect(arr).toContain(2)
  })

  it('should pass object test', () => {
    const obj = { name: 'test', value: 42 }
    expect(obj).toHaveProperty('name')
    expect(obj.name).toBe('test')
  })

  it('should pass boolean test', () => {
    expect(true).toBe(true)
    expect(false).toBe(false)
  })
})
