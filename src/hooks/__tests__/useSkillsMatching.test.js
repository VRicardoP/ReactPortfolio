import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import useSkillsMatching, { getJobMatchScore } from '../useSkillsMatching'

// Mock usePortfolioData to control what portfolio skills are available
vi.mock('../usePortfolioData', () => ({
  default: vi.fn(),
}))

import usePortfolioData from '../usePortfolioData'

describe('useSkillsMatching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty results when no portfolio data', () => {
    usePortfolioData.mockReturnValue({ data: null, loading: true, error: null })

    const { result } = renderHook(() => useSkillsMatching())
    const getScore = result.current

    // Should return a function that always returns 0
    const score = getScore({ tags: ['React', 'Python'] })
    expect(score).toBe(0)
  })

  it('calculates match score for a job with matching skills', () => {
    usePortfolioData.mockReturnValue({
      data: {
        techSkills: {
          frontend: [{ name: 'React' }, { name: 'JavaScript' }],
          backend: [{ name: 'Python' }, { name: 'FastAPI' }],
        },
      },
      loading: false,
      error: null,
    })

    const { result } = renderHook(() => useSkillsMatching())
    const getScore = result.current

    // Job has 2 tags, both match portfolio skills
    const score = getScore({ tags: ['React', 'Python'] })
    expect(score).toBe(100)
  })

  it('returns 0 for a job with no matching skills', () => {
    usePortfolioData.mockReturnValue({
      data: {
        techSkills: {
          frontend: [{ name: 'React' }, { name: 'JavaScript' }],
        },
      },
      loading: false,
      error: null,
    })

    const { result } = renderHook(() => useSkillsMatching())
    const getScore = result.current

    const score = getScore({ tags: ['Ruby', 'Elixir', 'Haskell'] })
    expect(score).toBe(0)
  })

  it('handles jobs with empty tags array', () => {
    usePortfolioData.mockReturnValue({
      data: {
        techSkills: {
          frontend: [{ name: 'React' }],
        },
      },
      loading: false,
      error: null,
    })

    const { result } = renderHook(() => useSkillsMatching())
    const getScore = result.current

    const score = getScore({ tags: [] })
    expect(score).toBe(0)
  })

  it('match is case-insensitive', () => {
    usePortfolioData.mockReturnValue({
      data: {
        techSkills: {
          frontend: [{ name: 'React' }, { name: 'JavaScript' }],
        },
      },
      loading: false,
      error: null,
    })

    const { result } = renderHook(() => useSkillsMatching())
    const getScore = result.current

    // Tags in different cases should still match
    const score = getScore({ tags: ['REACT', 'javascript'] })
    expect(score).toBe(100)
  })

  it('detects partial matches (e.g., "React" matches "ReactJS")', () => {
    usePortfolioData.mockReturnValue({
      data: {
        techSkills: {
          frontend: [{ name: 'React' }],
        },
      },
      loading: false,
      error: null,
    })

    const { result } = renderHook(() => useSkillsMatching())
    const getScore = result.current

    // "reactjs" includes "react" as a substring, so it should match
    const score = getScore({ tags: ['ReactJS'] })
    expect(score).toBe(100)
  })
})

describe('getJobMatchScore', () => {
  it('reads from custom skillsFields', () => {
    const portfolioSkills = ['python', 'react', 'docker']

    const job = { skills: ['Python', 'Docker'], tags: [] }
    const score = getJobMatchScore(portfolioSkills, job, ['skills'])
    expect(score).toBe(100)
  })

  it('handles string-type skill fields split by comma', () => {
    const portfolioSkills = ['python', 'react']

    const job = { tags: 'Python, React, Go' }
    const score = getJobMatchScore(portfolioSkills, job, ['tags'])
    // 2 out of 3 match => Math.round(2/3 * 100) = 67
    expect(score).toBe(67)
  })

  it('handles compound portfolio skills like "Python / FastAPI"', () => {
    usePortfolioData.mockReturnValue({
      data: {
        techSkills: {
          backend: [{ name: 'Python / FastAPI' }],
        },
      },
      loading: false,
      error: null,
    })

    const { result } = renderHook(() => useSkillsMatching())
    const getScore = result.current

    // Both "python" and "fastapi" should be extracted from "Python / FastAPI"
    const score = getScore({ tags: ['FastAPI'] })
    expect(score).toBe(100)
  })
})
