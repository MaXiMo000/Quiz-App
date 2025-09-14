// Simple validation tests
describe('Validation Functions', () => {
  it('should validate email format', () => {
    const validateEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    }

    expect(validateEmail('test@example.com')).toBe(true)
    expect(validateEmail('user.name@domain.co.uk')).toBe(true)
    expect(validateEmail('invalid-email')).toBe(false)
    expect(validateEmail('test@')).toBe(false)
    expect(validateEmail('@example.com')).toBe(false)
  })

  it('should validate password strength', () => {
    const validatePassword = (password) => {
      return password.length >= 8 &&
             /[A-Z]/.test(password) &&
             /[a-z]/.test(password) &&
             /[0-9]/.test(password)
    }

    expect(validatePassword('Password123')).toBe(true)
    expect(validatePassword('password123')).toBe(false) // no uppercase
    expect(validatePassword('PASSWORD123')).toBe(false) // no lowercase
    expect(validatePassword('Password')).toBe(false) // no number
    expect(validatePassword('Pass1')).toBe(false) // too short
  })

  it('should validate username', () => {
    const validateUsername = (username) => {
      return username.length >= 3 &&
             username.length <= 20 &&
             /^[a-zA-Z0-9_]+$/.test(username)
    }

    expect(validateUsername('testuser')).toBe(true)
    expect(validateUsername('test_user')).toBe(true)
    expect(validateUsername('test123')).toBe(true)
    expect(validateUsername('ab')).toBe(false) // too short
    expect(validateUsername('a'.repeat(21))).toBe(false) // too long
    expect(validateUsername('test-user')).toBe(false) // invalid character
  })

  it('should validate quiz data', () => {
    const validateQuiz = (quiz) => {
      return !!(quiz.title &&
             quiz.title.length > 0 &&
             quiz.questions &&
             Array.isArray(quiz.questions) &&
             quiz.questions.length > 0)
    }

    const validQuiz = {
      title: 'Test Quiz',
      questions: [{ question: 'What is 2+2?', options: ['3', '4', '5'], correctAnswer: '4' }]
    }

    const invalidQuiz = {
      title: '',
      questions: []
    }

    expect(validateQuiz(validQuiz)).toBe(true)
    expect(validateQuiz(invalidQuiz)).toBe(false)
  })

  it('should validate score range', () => {
    const validateScore = (score, maxScore) => {
      return score >= 0 && score <= maxScore && Number.isInteger(score)
    }

    expect(validateScore(8, 10)).toBe(true)
    expect(validateScore(0, 10)).toBe(true)
    expect(validateScore(10, 10)).toBe(true)
    expect(validateScore(-1, 10)).toBe(false)
    expect(validateScore(11, 10)).toBe(false)
    expect(validateScore(8.5, 10)).toBe(false) // not integer
  })
})
