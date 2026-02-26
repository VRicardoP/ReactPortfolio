import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import useJobBookmarks from '../useJobBookmarks'

const STORAGE_KEY = 'job-bookmarks'

const makeJob = (overrides = {}) => ({
  id: 'job-1',
  title: 'Frontend Developer',
  company: 'Acme Corp',
  url: 'https://example.com/job-1',
  source: 'remotive',
  ...overrides,
})

describe('useJobBookmarks', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initially loads bookmarks from localStorage', () => {
    const existing = [
      { id: 'saved-1', title: 'Saved Job', company: 'Co', url: 'https://x.com', source: 'jobicy', savedAt: '2025-01-01T00:00:00.000Z' },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))

    const { result } = renderHook(() => useJobBookmarks())

    expect(result.current.bookmarks).toHaveLength(1)
    expect(result.current.bookmarks[0].id).toBe('saved-1')
  })

  it('adds a bookmark via toggleBookmark', () => {
    const { result } = renderHook(() => useJobBookmarks())
    const job = makeJob()

    act(() => {
      result.current.toggleBookmark(job)
    })

    expect(result.current.bookmarks).toHaveLength(1)
    expect(result.current.bookmarks[0].id).toBe('job-1')
    expect(result.current.bookmarks[0].title).toBe('Frontend Developer')
    expect(result.current.bookmarks[0].company).toBe('Acme Corp')
    expect(result.current.bookmarks[0].source).toBe('remotive')
    // savedAt should be set
    expect(result.current.bookmarks[0].savedAt).toBeDefined()
  })

  it('removes a bookmark when already bookmarked (toggleBookmark)', () => {
    const { result } = renderHook(() => useJobBookmarks())
    const job = makeJob()

    // Add then toggle again to remove
    act(() => {
      result.current.toggleBookmark(job)
    })
    expect(result.current.bookmarks).toHaveLength(1)

    act(() => {
      result.current.toggleBookmark(job)
    })
    expect(result.current.bookmarks).toHaveLength(0)
  })

  it('isBookmarked returns true for bookmarked jobs', () => {
    const { result } = renderHook(() => useJobBookmarks())
    const job = makeJob()

    expect(result.current.isBookmarked('job-1')).toBe(false)

    act(() => {
      result.current.toggleBookmark(job)
    })

    expect(result.current.isBookmarked('job-1')).toBe(true)
    expect(result.current.isBookmarked('other-id')).toBe(false)
  })

  it('persists to localStorage on change', () => {
    const { result } = renderHook(() => useJobBookmarks())
    const job = makeJob()

    act(() => {
      result.current.toggleBookmark(job)
    })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe('job-1')
  })

  it('handles empty/invalid localStorage gracefully', () => {
    // Test with invalid JSON
    localStorage.setItem(STORAGE_KEY, 'not-valid-json')

    const { result } = renderHook(() => useJobBookmarks())

    expect(result.current.bookmarks).toEqual([])
  })

  it('removeBookmark removes by job id', () => {
    const { result } = renderHook(() => useJobBookmarks())
    const job1 = makeJob({ id: 'job-1' })
    const job2 = makeJob({ id: 'job-2', title: 'Backend Developer' })

    act(() => {
      result.current.toggleBookmark(job1)
      result.current.toggleBookmark(job2)
    })

    expect(result.current.bookmarks).toHaveLength(2)

    act(() => {
      result.current.removeBookmark('job-1')
    })

    expect(result.current.bookmarks).toHaveLength(1)
    expect(result.current.bookmarks[0].id).toBe('job-2')
    // Also verify localStorage was updated
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe('job-2')
  })
})
