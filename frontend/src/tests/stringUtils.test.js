import { describe, it, expect } from 'vitest'
import {
  capitalizeFirst,
  capitalizeWords,
  slugify,
  removeHtmlTags,
  truncateWords,
  extractInitials,
  isPalindrome
} from '../utils/stringUtils'

describe('String Utility Functions', () => {
  it('should capitalize first letter', () => {
    expect(capitalizeFirst('hello')).toBe('Hello')
    expect(capitalizeFirst('HELLO')).toBe('Hello')
    expect(capitalizeFirst('hELLO')).toBe('Hello')
    expect(capitalizeFirst('')).toBe('')
    expect(capitalizeFirst(null)).toBe('')
    expect(capitalizeFirst(123)).toBe('')
  })

  it('should capitalize words', () => {
    expect(capitalizeWords('hello world')).toBe('Hello World')
    expect(capitalizeWords('HELLO WORLD')).toBe('Hello World')
    expect(capitalizeWords('hELLO wORLD')).toBe('Hello World')
    expect(capitalizeWords('hello')).toBe('Hello')
    expect(capitalizeWords('')).toBe('')
    expect(capitalizeWords(null)).toBe('')
  })

  it('should create URL-friendly slugs', () => {
    expect(slugify('Hello World')).toBe('hello-world')
    expect(slugify('Hello, World!')).toBe('hello-world')
    expect(slugify('Hello---World')).toBe('hello-world')
    expect(slugify('  Hello World  ')).toBe('hello-world')
    expect(slugify('Hello@#$%World')).toBe('hello-world')
    expect(slugify('')).toBe('')
    expect(slugify(null)).toBe('')
  })

  it('should remove HTML tags', () => {
    expect(removeHtmlTags('<p>Hello World</p>')).toBe('Hello World')
    expect(removeHtmlTags('<div><span>Test</span></div>')).toBe('Test')
    expect(removeHtmlTags('<script>alert("xss")</script>')).toBe('alert("xss")')
    expect(removeHtmlTags('No tags here')).toBe('No tags here')
    expect(removeHtmlTags('')).toBe('')
    expect(removeHtmlTags(null)).toBe('')
  })

  it('should truncate words', () => {
    expect(truncateWords('This is a test', 3)).toBe('This is a...')
    expect(truncateWords('Short text', 5)).toBe('Short text')
    expect(truncateWords('One two three four five six', 4)).toBe('One two three four...')
    expect(truncateWords('', 3)).toBe('')
    expect(truncateWords(null, 3)).toBe('')
  })

  it('should extract initials', () => {
    expect(extractInitials('John Doe')).toBe('JD')
    expect(extractInitials('John Michael Doe')).toBe('JM')
    expect(extractInitials('John')).toBe('J')
    expect(extractInitials('')).toBe('')
    expect(extractInitials(null)).toBe('')
    expect(extractInitials('a b c d e f')).toBe('AB')
  })

  it('should check for palindromes', () => {
    expect(isPalindrome('racecar')).toBe(true)
    expect(isPalindrome('A man a plan a canal Panama')).toBe(true)
    expect(isPalindrome('hello')).toBe(false)
    expect(isPalindrome('RaceCar')).toBe(true)
    expect(isPalindrome('')).toBe(false)
    expect(isPalindrome(null)).toBe(false)
    expect(isPalindrome('12321')).toBe(true)
  })
})
