// String utility functions

export const capitalizeFirst = (str) => {
  if (!str || typeof str !== 'string') return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const capitalizeWords = (str) => {
  if (!str || typeof str !== 'string') return ''
  return str.split(' ').map(word => capitalizeFirst(word)).join(' ')
}

export const slugify = (str) => {
  if (!str || typeof str !== 'string') return ''
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '-')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const removeHtmlTags = (str) => {
  if (!str || typeof str !== 'string') return ''
  return str.replace(/<[^>]*>/g, '')
}

export const truncateWords = (str, wordCount) => {
  if (!str || typeof str !== 'string') return ''
  const words = str.split(' ')
  if (words.length <= wordCount) return str
  return words.slice(0, wordCount).join(' ') + '...'
}

export const extractInitials = (name) => {
  if (!name || typeof name !== 'string') return ''
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

export const isPalindrome = (str) => {
  if (!str || typeof str !== 'string') return false
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '')
  return cleaned === cleaned.split('').reverse().join('')
}
