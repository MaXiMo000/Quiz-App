import { describe, it, expect } from 'vitest'
import {
  isValidEmail,
  isValidPassword,
  isValidQuizTitle,
  isValidQuestion,
  isValidAnswer,
  isValidScore,
  sanitizeInput
} from '../utils/validation'

describe('Validation Functions', () => {
  it('should validate email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
    expect(isValidEmail('invalid-email')).toBe(false)
    expect(isValidEmail('@domain.com')).toBe(false)
    expect(isValidEmail('test@')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })

  it('should validate passwords', () => {
    expect(isValidPassword('Password123')).toBe(true)
    expect(isValidPassword('MySecure1')).toBe(true)
    expect(isValidPassword('weak')).toBe(false)
    expect(isValidPassword('password')).toBe(false)
    expect(isValidPassword('PASSWORD')).toBe(false)
    expect(isValidPassword('12345678')).toBe(false)
    expect(isValidPassword('')).toBe(false)
  })

  it('should validate quiz titles', () => {
    expect(isValidQuizTitle('My Quiz')).toBe(true)
    expect(isValidQuizTitle('A'.repeat(50))).toBe(true)
    expect(isValidQuizTitle('A'.repeat(100))).toBe(true)
    expect(isValidQuizTitle('AB')).toBe(false)
    expect(isValidQuizTitle('A'.repeat(101))).toBe(false)
    expect(isValidQuizTitle('')).toBe(false)
    expect(isValidQuizTitle('   ')).toBe(false)
  })

  it('should validate questions', () => {
    expect(isValidQuestion('What is the capital of France?')).toBe(true)
    expect(isValidQuestion('A'.repeat(50))).toBe(true)
    expect(isValidQuestion('A'.repeat(500))).toBe(true)
    expect(isValidQuestion('Short')).toBe(false)
    expect(isValidQuestion('A'.repeat(501))).toBe(false)
    expect(isValidQuestion('')).toBe(false)
    expect(isValidQuestion('   ')).toBe(false)
  })

  it('should validate answers', () => {
    expect(isValidAnswer('Paris')).toBe(true)
    expect(isValidAnswer('A'.repeat(50))).toBe(true)
    expect(isValidAnswer('A'.repeat(200))).toBe(true)
    expect(isValidAnswer('')).toBe(false)
    expect(isValidAnswer('   ')).toBe(false)
    expect(isValidAnswer('A'.repeat(201))).toBe(false)
  })

  it('should validate scores', () => {
    expect(isValidScore(85)).toBe(true)
    expect(isValidScore(0)).toBe(true)
    expect(isValidScore(100)).toBe(true)
    expect(isValidScore(-1)).toBe(false)
    expect(isValidScore(101)).toBe(false)
    expect(isValidScore('85')).toBe(false)
    expect(isValidScore(null)).toBe(false)
  })

  it('should sanitize input', () => {
    expect(sanitizeInput('Hello World')).toBe('Hello World')
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script')
    expect(sanitizeInput('  spaced  ')).toBe('spaced')
    expect(sanitizeInput(123)).toBe('')
    expect(sanitizeInput(null)).toBe('')
    expect(sanitizeInput(undefined)).toBe('')
  })
})
