// Validation utility functions

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
  return passwordRegex.test(password)
}

export const isValidQuizTitle = (title) => {
  if (!title || typeof title !== 'string') return false
  const trimmed = title.trim()
  return trimmed.length >= 3 && trimmed.length <= 100
}

export const isValidQuestion = (question) => {
  if (!question || typeof question !== 'string') return false
  const trimmed = question.trim()
  return trimmed.length >= 10 && trimmed.length <= 500
}

export const isValidAnswer = (answer) => {
  if (!answer || typeof answer !== 'string') return false
  const trimmed = answer.trim()
  return trimmed.length >= 1 && trimmed.length <= 200
}

export const isValidScore = (score) => {
  return typeof score === 'number' && score >= 0 && score <= 100
}

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return ''
  return input.trim().replace(/[<>]/g, '')
}
