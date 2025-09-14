import { describe, it, expect } from 'vitest'
import {
  removeDuplicates,
  groupBy,
  sortBy,
  chunk,
  flatten,
  findMax,
  findMin
} from '../utils/arrayUtils'

describe('Array Utility Functions', () => {
  it('should remove duplicates', () => {
    expect(removeDuplicates([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
    expect(removeDuplicates(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
    expect(removeDuplicates([])).toEqual([])
    expect(removeDuplicates(null)).toEqual([])
    expect(removeDuplicates(undefined)).toEqual([])
  })

  it('should group by key', () => {
    const data = [
      { category: 'fruit', name: 'apple' },
      { category: 'fruit', name: 'banana' },
      { category: 'vegetable', name: 'carrot' }
    ]

    const grouped = groupBy(data, 'category')
    expect(grouped.fruit).toHaveLength(2)
    expect(grouped.vegetable).toHaveLength(1)
    expect(grouped.fruit[0].name).toBe('apple')
    expect(grouped.vegetable[0].name).toBe('carrot')

    expect(groupBy([], 'category')).toEqual({})
    expect(groupBy(null, 'category')).toEqual({})
  })

  it('should sort by key', () => {
    const data = [
      { name: 'Charlie', age: 30 },
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 35 }
    ]

    const sortedAsc = sortBy(data, 'age')
    expect(sortedAsc[0].name).toBe('Alice')
    expect(sortedAsc[2].name).toBe('Bob')

    const sortedDesc = sortBy(data, 'age', 'desc')
    expect(sortedDesc[0].name).toBe('Bob')
    expect(sortedDesc[2].name).toBe('Alice')

    expect(sortBy([], 'age')).toEqual([])
    expect(sortBy(null, 'age')).toEqual([])
  })

  it('should chunk arrays', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]])
    expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]])
    expect(chunk([], 2)).toEqual([])
    expect(chunk(null, 2)).toEqual([])
    expect(chunk([1, 2, 3], 0)).toEqual([])
  })

  it('should flatten arrays', () => {
    expect(flatten([1, [2, 3], [4, [5, 6]]])).toEqual([1, 2, 3, 4, 5, 6])
    expect(flatten([1, 2, 3])).toEqual([1, 2, 3])
    expect(flatten([])).toEqual([])
    expect(flatten(null)).toEqual([])
  })

  it('should find maximum', () => {
    expect(findMax([1, 5, 3, 9, 2])).toBe(9)
    expect(findMax([-1, -5, -3])).toBe(-1)

    const data = [
      { score: 85, name: 'Alice' },
      { score: 92, name: 'Bob' },
      { score: 78, name: 'Charlie' }
    ]
    expect(findMax(data, 'score')).toEqual({ score: 92, name: 'Bob' })

    expect(findMax([])).toBe(null)
    expect(findMax(null)).toBe(null)
  })

  it('should find minimum', () => {
    expect(findMin([5, 1, 9, 3, 2])).toBe(1)
    expect(findMin([-1, -5, -3])).toBe(-5)

    const data = [
      { score: 85, name: 'Alice' },
      { score: 92, name: 'Bob' },
      { score: 78, name: 'Charlie' }
    ]
    expect(findMin(data, 'score')).toEqual({ score: 78, name: 'Charlie' })

    expect(findMin([])).toBe(null)
    expect(findMin(null)).toBe(null)
  })
})
