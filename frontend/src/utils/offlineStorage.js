// Offline storage utility functions

export const saveToOfflineStorage = (key, data) => {
  try {
    localStorage.setItem(`offline_${key}`, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export const getFromOfflineStorage = (key) => {
  try {
    const data = localStorage.getItem(`offline_${key}`)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export const clearOfflineStorage = () => {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('offline_'))
    keys.forEach(key => localStorage.removeItem(key))
    return true
  } catch {
    return false
  }
}
