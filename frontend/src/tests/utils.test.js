// Simple utility function tests
const formatScore = (score, total) => {
  if (total === 0) return '0%'
  return `${Math.round((score / total) * 100)}%`
}

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

describe('Utility Functions', () => {
  describe('formatScore', () => {
    it('should format score correctly', () => {
      expect(formatScore(8, 10)).toBe('80%')
      expect(formatScore(5, 10)).toBe('50%')
      expect(formatScore(0, 10)).toBe('0%')
    })

    it('should handle zero total', () => {
      expect(formatScore(5, 0)).toBe('0%')
    })
  })

  describe('formatTime', () => {
    it('should format time correctly', () => {
      expect(formatTime(65)).toBe('1:05')
      expect(formatTime(125)).toBe('2:05')
      expect(formatTime(30)).toBe('0:30')
    })
  })

  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.co.uk')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
    })
  })
})
