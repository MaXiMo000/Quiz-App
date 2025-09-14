import { describe, it, expect, vi } from 'vitest'
import {
  generateId,
  debounce,
  throttle,
  classNames,
  getRandomColor,
  formatClassName,
  isValidComponent
} from '../utils/componentUtils'

describe('Component Utility Functions', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId()
    const id2 = generateId()
    const id3 = generateId('test')

    expect(typeof id1).toBe('string')
    expect(id1).not.toBe(id2)
    expect(id3).toMatch(/^test-/)
    expect(id1.length).toBeGreaterThan(5)
  })

  it('should debounce function calls', async () => {
    const mockFn = vi.fn()
    const debouncedFn = debounce(mockFn, 100)

    debouncedFn('arg1')
    debouncedFn('arg2')
    debouncedFn('arg3')

    // Should not be called immediately
    expect(mockFn).not.toHaveBeenCalled()

    // Should be called once after delay
    await new Promise(resolve => setTimeout(resolve, 150))
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('arg3')
  })

  it('should throttle function calls', async () => {
    const mockFn = vi.fn()
    const throttledFn = throttle(mockFn, 100)

    throttledFn('arg1')
    throttledFn('arg2')
    throttledFn('arg3')

    // Should be called immediately
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('arg1')

    // Should be called again after throttle period
    await new Promise(resolve => setTimeout(resolve, 150))
    throttledFn('arg4')
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(mockFn).toHaveBeenCalledWith('arg4')
  })

  it('should combine class names', () => {
    expect(classNames('btn', 'btn-primary')).toBe('btn btn-primary')
    expect(classNames('btn', false && 'btn-disabled', 'btn-active')).toBe('btn btn-active')
    expect(classNames('btn', null, undefined, 'btn-primary')).toBe('btn btn-primary')
    expect(classNames()).toBe('')
  })

  it('should generate random colors', () => {
    const color1 = getRandomColor()
    const color2 = getRandomColor()

    expect(typeof color1).toBe('string')
    expect(color1).toMatch(/^#[0-9A-F]{6}$/i)
    expect(color1).not.toBe(color2) // Very unlikely to be the same
  })

  it('should format BEM class names', () => {
    expect(formatClassName('button')).toBe('button')
    expect(formatClassName('button', { primary: true })).toBe('button button--primary')
    expect(formatClassName('button', { primary: true, disabled: false })).toBe('button button--primary')
    expect(formatClassName('button', { primary: true, disabled: true })).toBe('button button--primary button--disabled')
  })

  it('should validate components', () => {
    const FunctionalComponent = () => 'Test'
    const ClassComponent = class TestComponent {}
    const ObjectComponent = { render: () => 'Test' }

    expect(isValidComponent(FunctionalComponent)).toBe(true)
    expect(isValidComponent(ClassComponent)).toBe(true)
    expect(isValidComponent(ObjectComponent)).toBe(true)
    expect(isValidComponent(null)).toBe(false)
    expect(isValidComponent(undefined)).toBe(false)
    expect(isValidComponent('string')).toBe(false)
    expect(isValidComponent(123)).toBe(false)
  })
})
