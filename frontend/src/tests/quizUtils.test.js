import { describe, it, expect } from 'vitest'
import {
  calculateScore,
  getPerformanceLevel,
  formatTimeRemaining,
  shuffleArray,
  generateQuizId,
  getQuizDifficulty
} from '../utils/quizUtils'

describe('Quiz Utility Functions', () => {
  it('should calculate quiz scores correctly', () => {
    const answers = ['A', 'B', 'C', 'D']
    const correctAnswers = ['A', 'B', 'C', 'D']
    expect(calculateScore(answers, correctAnswers)).toBe(100)

    const partialAnswers = ['A', 'B', 'C', 'A']
    expect(calculateScore(partialAnswers, correctAnswers)).toBe(75)

    const wrongAnswers = ['B', 'A', 'D', 'C']
    expect(calculateScore(wrongAnswers, correctAnswers)).toBe(0)

    expect(calculateScore([], [])).toBe(0)
    expect(calculateScore(null, null)).toBe(0)
    expect(calculateScore(undefined, undefined)).toBe(0)
  })

  it('should determine performance levels', () => {
    expect(getPerformanceLevel(95)).toBe('excellent')
    expect(getPerformanceLevel(85)).toBe('good')
    expect(getPerformanceLevel(75)).toBe('average')
    expect(getPerformanceLevel(65)).toBe('below-average')
    expect(getPerformanceLevel(45)).toBe('poor')
  })

  it('should format time remaining', () => {
    expect(formatTimeRemaining(65)).toBe('1:05')
    expect(formatTimeRemaining(3665)).toBe('1:01:05')
    expect(formatTimeRemaining(30)).toBe('0:30')
    expect(formatTimeRemaining(0)).toBe('0:00')
    expect(formatTimeRemaining(3600)).toBe('1:00:00')
  })

  it('should shuffle arrays', () => {
    const original = [1, 2, 3, 4, 5]
    const shuffled = shuffleArray(original)

    // Should have same length
    expect(shuffled).toHaveLength(original.length)

    // Should contain same elements
    expect(shuffled.sort()).toEqual(original.sort())

    // Should not be the same reference
    expect(shuffled).not.toBe(original)
  })

  it('should generate quiz IDs', () => {
    const id1 = generateQuizId()
    const id2 = generateQuizId()

    expect(typeof id1).toBe('string')
    expect(id1.length).toBe(9)
    expect(id1).not.toBe(id2)
  })

  it('should determine quiz difficulty', () => {
    const easyQuestions = [
      { question: 'What is 2+2?', options: ['3', '4', '5'] },
      { question: 'What color is the sky?', options: ['Red', 'Blue'] }
    ]
    expect(getQuizDifficulty(easyQuestions)).toBe('easy')

    const mediumQuestions = [
      { question: 'What is the capital of France and why is it important?', options: ['Paris', 'London', 'Berlin', 'Madrid'] },
      { question: 'Explain photosynthesis in plants', options: ['Process A', 'Process B', 'Process C'] }
    ]
    expect(getQuizDifficulty(mediumQuestions)).toBe('medium')

    const hardQuestions = [
      { question: 'Explain the complex relationship between quantum mechanics and general relativity in the context of black hole formation and the information paradox that arises when considering the thermodynamic properties of event horizons', options: ['Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5'] }
    ]
    expect(getQuizDifficulty(hardQuestions)).toBe('hard')

    expect(getQuizDifficulty([])).toBe('easy')
    expect(getQuizDifficulty(null)).toBe('easy')
    expect(getQuizDifficulty(undefined)).toBe('easy')
  })
})
