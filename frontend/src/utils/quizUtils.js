// Quiz utility functions

export const calculateScore = (answers, correctAnswers) => {
  if (!answers || !correctAnswers) return 0

  let correct = 0
  const total = Math.min(answers.length, correctAnswers.length)

  for (let i = 0; i < total; i++) {
    if (answers[i] === correctAnswers[i]) {
      correct++
    }
  }

  return total > 0 ? Math.round((correct / total) * 100) : 0
}

export const getPerformanceLevel = (score) => {
  if (score >= 90) return 'excellent'
  if (score >= 80) return 'good'
  if (score >= 70) return 'average'
  if (score >= 60) return 'below-average'
  return 'poor'
}

export const formatTimeRemaining = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export const shuffleArray = (array) => {
  if (!Array.isArray(array)) return []
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export const generateQuizId = () => {
  return Math.random().toString(36).substr(2, 9)
}

export const getQuizDifficulty = (questions) => {
  if (!questions || questions.length === 0) return 'easy'

  const avgLength = questions.reduce((sum, q) => sum + q.question.length, 0) / questions.length
  const avgOptions = questions.reduce((sum, q) => sum + (q.options?.length || 0), 0) / questions.length

  if (avgLength > 100 && avgOptions > 4) return 'hard'
  if (avgLength > 50 || avgOptions > 3) return 'medium'
  return 'easy'
}
