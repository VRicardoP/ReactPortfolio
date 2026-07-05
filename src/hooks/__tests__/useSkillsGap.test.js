import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import useSkillsGap from '../useSkillsGap'

// Characterization tests: pin the current behavior of the skills-gap hook
// (aggregation + add/remove toggle against /cv-profiles/skills) before any
// refactor of the AI-match window. Asserts the real contract, not an ideal one.

const mockAuthenticatedFetch = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authenticatedFetch: mockAuthenticatedFetch,
    isAuthenticated: true,
  }),
}))

const okResponse = () => ({ ok: true, text: () => Promise.resolve('') })

describe('useSkillsGap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthenticatedFetch.mockResolvedValue(okResponse())
  })

  it('starts empty and idle', () => {
    const { result } = renderHook(() => useSkillsGap([]))
    expect(result.current.missingSkills).toEqual([])
    expect(result.current.addedSkills.size).toBe(0)
    expect(result.current.togglingSkill).toBeNull()
    expect(result.current.lastError).toBeNull()
  })

  it('aggregates unique missing skills sorted case-insensitively', () => {
    const results = [
      { missing_skills: ['Zebra', 'apple'] },
      { missing_skills: ['apple', 'Mango'] }, // duplicate "apple"
      { missing_skills: ['react'] },
    ]
    const { result } = renderHook(() => useSkillsGap(results))
    expect(result.current.missingSkills).toEqual(['apple', 'Mango', 'react', 'Zebra'])
  })

  it('ignores jobs without a missing_skills array', () => {
    const { result } = renderHook(() => useSkillsGap([{ title: 'x' }, { missing_skills: ['Go'] }]))
    expect(result.current.missingSkills).toEqual(['Go'])
  })

  it('toggling a skill ON posts add:true, moves it to addedSkills, drops it from missing', async () => {
    const results = [{ missing_skills: ['React', 'Vue'] }]
    const { result } = renderHook(() => useSkillsGap(results))

    let returned
    await act(async () => {
      returned = await result.current.toggleSkill('React')
    })

    expect(returned).toBe(true)
    expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/cv-profiles/skills'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ skill_name: 'React', add: true }),
      })
    )
    expect(result.current.addedSkills.has('React')).toBe(true)
    expect(result.current.missingSkills).toEqual(['Vue']) // React now excluded
    expect(result.current.togglingSkill).toBeNull()
  })

  it('toggling an already-added skill OFF posts add:false and removes it', async () => {
    const { result } = renderHook(() => useSkillsGap([{ missing_skills: ['React'] }]))

    await act(async () => {
      await result.current.toggleSkill('React') // add
    })
    let returned
    await act(async () => {
      returned = await result.current.toggleSkill('React') // remove
    })

    expect(returned).toBe(false)
    expect(mockAuthenticatedFetch).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify({ skill_name: 'React', add: false }) })
    )
    expect(result.current.addedSkills.has('React')).toBe(false)
  })

  it('a non-ok response returns null, records lastError, and does not add the skill', async () => {
    mockAuthenticatedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('boom'),
    })
    const { result } = renderHook(() => useSkillsGap([{ missing_skills: ['React'] }]))

    let returned
    await act(async () => {
      returned = await result.current.toggleSkill('React')
    })

    expect(returned).toBeNull()
    expect(result.current.addedSkills.has('React')).toBe(false)
    expect(result.current.lastError).toContain('500')
    expect(result.current.togglingSkill).toBeNull()
  })

  it('a network error returns null and records lastError', async () => {
    mockAuthenticatedFetch.mockRejectedValue(new Error('Network down'))
    const { result } = renderHook(() => useSkillsGap([{ missing_skills: ['React'] }]))

    let returned
    await act(async () => {
      returned = await result.current.toggleSkill('React')
    })

    expect(returned).toBeNull()
    expect(result.current.lastError).toBe('Network down')
  })
})
