import { describe, it, expect } from 'vitest'
import {
  formatDuration,
  formatFileSize,
  formatCurrency,
  formatPercentage,
  formatDate,
  truncateText
} from '../utils/formatting'

describe('Formatting Functions', () => {
  it('should format time duration', () => {
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3665)).toBe('1:01:05')
    expect(formatDuration(30)).toBe('0:30')
    expect(formatDuration(0)).toBe('0:00')
  })

  it('should format file size', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1048576)).toBe('1 MB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('should format currency', () => {
    expect(formatCurrency(10.50)).toBe('$10.50')
    expect(formatCurrency(1000)).toBe('$1,000.00')
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('should format percentage', () => {
    expect(formatPercentage(8, 10)).toBe('80%')
    expect(formatPercentage(5, 10)).toBe('50%')
    expect(formatPercentage(0, 10)).toBe('0%')
    expect(formatPercentage(10, 0)).toBe('0%')
  })

  it('should format date', () => {
    const testDate = '2024-01-15'
    expect(formatDate(testDate)).toBe('Jan 15, 2024')
  })

  it('should truncate text', () => {
    expect(truncateText('Short text', 20)).toBe('Short text')
    expect(truncateText('This is a very long text that should be truncated', 20)).toBe('This is a very long ...')
  })
})
