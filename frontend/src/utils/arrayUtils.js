// Array utility functions

export const removeDuplicates = (array) => {
  if (!Array.isArray(array)) return []
  return [...new Set(array)]
}

export const groupBy = (array, key) => {
  if (!Array.isArray(array)) return {}
  return array.reduce((groups, item) => {
    const group = item[key]
    groups[group] = groups[group] || []
    groups[group].push(item)
    return groups
  }, {})
}

export const sortBy = (array, key, direction = 'asc') => {
  if (!Array.isArray(array)) return []
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]

    if (direction === 'desc') {
      return bVal > aVal ? 1 : bVal < aVal ? -1 : 0
    }
    return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
  })
}

export const chunk = (array, size) => {
  if (!Array.isArray(array) || size <= 0) return []
  const chunks = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export const flatten = (array) => {
  if (!Array.isArray(array)) return []
  return array.reduce((flat, item) => {
    return flat.concat(Array.isArray(item) ? flatten(item) : item)
  }, [])
}

export const findMax = (array, key) => {
  if (!Array.isArray(array) || array.length === 0) return null
  return array.reduce((max, item) => {
    const value = key ? item[key] : item
    const maxValue = key ? max[key] : max
    return value > maxValue ? item : max
  })
}

export const findMin = (array, key) => {
  if (!Array.isArray(array) || array.length === 0) return null
  return array.reduce((min, item) => {
    const value = key ? item[key] : item
    const minValue = key ? min[key] : min
    return value < minValue ? item : min
  })
}
