import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import useJobBoardControls from '../useJobBoardControls'

const makeJobs = (overrides = []) =>
  overrides.map((o, i) => ({
    id: i + 1,
    title: o.title || `Job ${i + 1}`,
    company: o.company || `Company ${i + 1}`,
    date: o.date || `2025-01-0${i + 1}`,
    ...o,
  }))

describe('useJobBoardControls', () => {
  it('default sort returns jobs sorted newest first', () => {
    const jobs = makeJobs([
      { title: 'Old', date: '2024-01-01' },
      { title: 'New', date: '2025-06-15' },
      { title: 'Mid', date: '2025-01-01' },
    ])

    const { result } = renderHook(() => useJobBoardControls(jobs))

    expect(result.current.pagedJobs[0].title).toBe('New')
    expect(result.current.pagedJobs[1].title).toBe('Mid')
    expect(result.current.pagedJobs[2].title).toBe('Old')
    expect(result.current.sortBy).toBe('newest')
  })

  it('sorts by company name', () => {
    const jobs = makeJobs([
      { company: 'Zebra Corp' },
      { company: 'Apple Inc' },
      { company: 'Microsoft' },
    ])

    const { result } = renderHook(() => useJobBoardControls(jobs))

    act(() => {
      result.current.handleSortChange('company')
    })

    expect(result.current.pagedJobs[0].company).toBe('Apple Inc')
    expect(result.current.pagedJobs[1].company).toBe('Microsoft')
    expect(result.current.pagedJobs[2].company).toBe('Zebra Corp')
  })

  it('sorts by title', () => {
    const jobs = makeJobs([
      { title: 'Zookeeper' },
      { title: 'Architect' },
      { title: 'Manager' },
    ])

    const { result } = renderHook(() => useJobBoardControls(jobs))

    act(() => {
      result.current.handleSortChange('title')
    })

    expect(result.current.pagedJobs[0].title).toBe('Architect')
    expect(result.current.pagedJobs[1].title).toBe('Manager')
    expect(result.current.pagedJobs[2].title).toBe('Zookeeper')
  })

  it('pagination returns correct page', () => {
    // Create 25 jobs so we get 2 pages (PAGE_SIZE = 20)
    const jobs = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      title: `Job ${String(i + 1).padStart(2, '0')}`,
      company: `Company ${i + 1}`,
      date: `2025-01-${String(i + 1).padStart(2, '0')}`,
    }))

    const { result } = renderHook(() => useJobBoardControls(jobs))

    // First page has 20 items
    expect(result.current.pagedJobs).toHaveLength(20)
    expect(result.current.totalPages).toBe(2)
    expect(result.current.page).toBe(0)
    expect(result.current.from).toBe(1)
    expect(result.current.to).toBe(20)
  })

  it('page change updates current page', () => {
    const jobs = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      title: `Job ${String(i + 1).padStart(2, '0')}`,
      company: `Company ${i + 1}`,
      date: `2025-01-${String(i + 1).padStart(2, '0')}`,
    }))

    const { result } = renderHook(() => useJobBoardControls(jobs))

    act(() => {
      result.current.setPage(1)
    })

    expect(result.current.page).toBe(1)
    expect(result.current.pagedJobs).toHaveLength(5)
    expect(result.current.from).toBe(21)
    expect(result.current.to).toBe(25)
  })

  it('returns empty sorted jobs for empty input', () => {
    const { result } = renderHook(() => useJobBoardControls([]))

    expect(result.current.pagedJobs).toEqual([])
    expect(result.current.totalPages).toBe(1)
    expect(result.current.from).toBe(0)
    expect(result.current.to).toBe(0)
  })

  it('handles unix timestamps in seconds for date sorting', () => {
    const jobs = makeJobs([
      { title: 'Unix Old', date: 1704067200 },    // 2024-01-01
      { title: 'Unix New', date: 1750000000 },     // 2025-06-15 approx
      { title: 'ISO Mid', date: '2025-03-01' },
    ])

    const { result } = renderHook(() => useJobBoardControls(jobs))

    // Newest first
    expect(result.current.pagedJobs[0].title).toBe('Unix New')
    expect(result.current.pagedJobs[2].title).toBe('Unix Old')
  })
})
