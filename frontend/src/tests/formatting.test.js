// Simple formatting tests
describe('Formatting Functions', () => {
  it('should format time duration', () => {
    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }

    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3665)).toBe('1:01:05')
    expect(formatDuration(30)).toBe('0:30')
    expect(formatDuration(0)).toBe('0:00')
  })

  it('should format file size', () => {
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    expect(formatFileSize(0)).toBe('0 Bytes')
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1048576)).toBe('1 MB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('should format currency', () => {
    const formatCurrency = (amount, currency = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount)
    }

    expect(formatCurrency(10.50)).toBe('$10.50')
    expect(formatCurrency(1000)).toBe('$1,000.00')
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('should format percentage', () => {
    const formatPercentage = (value, total) => {
      if (total === 0) return '0%'
      const percentage = (value / total) * 100
      return `${Math.round(percentage)}%`
    }

    expect(formatPercentage(8, 10)).toBe('80%')
    expect(formatPercentage(5, 10)).toBe('50%')
    expect(formatPercentage(0, 10)).toBe('0%')
    expect(formatPercentage(10, 0)).toBe('0%')
  })

  it('should format date', () => {
    const formatDate = (date) => {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(new Date(date))
    }

    const testDate = '2024-01-15'
    expect(formatDate(testDate)).toBe('Jan 15, 2024')
  })

  it('should truncate text', () => {
    const truncateText = (text, maxLength) => {
      if (text.length <= maxLength) return text
      return text.substring(0, maxLength) + '...'
    }

    expect(truncateText('Short text', 20)).toBe('Short text')
    expect(truncateText('This is a very long text that should be truncated', 20)).toBe('This is a very long ...')
  })
})
