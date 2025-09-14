// Theme utility functions

export const getTheme = () => {
  return localStorage.getItem('theme') || 'light'
}

export const setTheme = (theme) => {
  localStorage.setItem('theme', theme)
}

export const toggleTheme = (currentTheme) => {
  return currentTheme === 'light' ? 'dark' : 'light'
}

export const isValidTheme = (theme) => {
  const validThemes = ['light', 'dark', 'Default', 'Galaxy', 'Forest', 'Sunset', 'Neon']
  return validThemes.includes(theme)
}

export const getSystemTheme = () => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
