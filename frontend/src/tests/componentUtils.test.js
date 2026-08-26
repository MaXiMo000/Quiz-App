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
    expect(classNames('btn', false, 'btn-active')).toBe('btn btn-active')
    expect(classNames('btn', null, undefined, 'btn-primary')).toBe('btn btn-primary')
    expect(classNames()).toBe('')
  })

  it('should generate random colors', () => {
    // `expect(color1).not.toBe(color2)` used to sit here, commented "very
    // unlikely to be the same". The palette holds ten colours, so it is one in
    // ten — measured at 2 failures in 25 runs of this file. CI holds this suite
    // strictly and with no tolerance, so that is one in ten builds failing for
    // a reason unrelated to anything anyone changed, which is how a strict
    // suite gets argued back down to continue-on-error.
    //
    // The contract is "a colour from the palette", so that is what is asserted.
    // Randomness is checked over enough draws to be about the distribution
    // rather than about one coin landing twice.
    const color = getRandomColor()
    expect(typeof color).toBe('string')
    expect(color).toMatch(/^#[0-9A-F]{6}$/i)

    const seen = new Set(Array.from({ length: 200 }, () => getRandomColor()))
    seen.forEach((c) => expect(c).toMatch(/^#[0-9A-F]{6}$/i))
    // 200 draws from ten colours miss one with probability 10 * 0.9^200,
    // which is about 1 in 10^8 — a rate a build can live with.
    expect(seen.size).toBeGreaterThan(1)
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
