// Component utility functions

export const generateId = (prefix = 'id') => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

export const debounce = (func, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

export const throttle = (func, limit) => {
  let inThrottle
  return (...args) => {
    if (!inThrottle) {
      func.apply(null, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export const classNames = (...classes) => {
  return classes.filter(Boolean).join(' ')
}

export const getRandomColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

export const formatClassName = (baseClass, modifiers = {}) => {
  const classes = [baseClass]
  Object.entries(modifiers).forEach(([key, value]) => {
    if (value) {
      classes.push(`${baseClass}--${key}`)
    }
  })
  return classes.join(' ')
}

export const isValidComponent = (component) => {
  return !!(component && (typeof component === 'function' || typeof component === 'object'))
}
