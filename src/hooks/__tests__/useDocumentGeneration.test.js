import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import useDocumentGeneration from '../useDocumentGeneration'

// Mock authenticatedFetch from AuthContext
const mockAuthenticatedFetch = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authenticatedFetch: mockAuthenticatedFetch,
    token: 'test-token',
    isAuthenticated: true,
    loading: false,
  }),
}))

// Mock i18next
const mockT = (key) => key
const mockI18n = { language: 'en', changeLanguage: vi.fn() }
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: mockI18n,
  }),
}))

const makeMockResponse = (data, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
  blob: () => Promise.resolve(new Blob(['pdf-content'], { type: 'application/pdf' })),
})

describe('useDocumentGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  // --- 1. Initial state ---
  it('returns correct initial state', () => {
    const { result } = renderHook(() => useDocumentGeneration())

    expect(result.current.documents).toEqual({})
    expect(result.current.error).toBeNull()
    expect(result.current.generatingSet).toEqual(new Set())
    expect(result.current.isGenerating(1)).toBe(false)
    expect(result.current.getDocumentsFor(1)).toBeNull()
    expect(typeof result.current.generate).toBe('function')
    expect(typeof result.current.fetchDocuments).toBe('function')
    expect(typeof result.current.downloadPdf).toBe('function')
    expect(typeof result.current.downloadJson).toBe('function')
    expect(typeof result.current.deleteDocument).toBe('function')
  })

  // --- 2. Generate documents successfully ---
  it('generates documents and stores them by applicationId', async () => {
    const mockData = {
      cv_document: { id: 10, content: 'cv content' },
      cover_letter_document: { id: 11, content: 'cover letter content' },
      generation_time_ms: 1500,
    }
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(mockData))

    const { result } = renderHook(() => useDocumentGeneration())

    let returnedData
    await act(async () => {
      returnedData = await result.current.generate(42, { language: 'de' })
    })

    expect(returnedData).toEqual(mockData)
    expect(result.current.documents[42]).toEqual({
      cv: mockData.cv_document,
      coverLetter: mockData.cover_letter_document,
      generationTimeMs: 1500,
    })
    expect(result.current.isGenerating(42)).toBe(false)
    expect(result.current.error).toBeNull()

    // Verify the POST body
    const callArgs = mockAuthenticatedFetch.mock.calls[0]
    expect(callArgs[0]).toContain('/api/v1/cv-generation/generate')
    const body = JSON.parse(callArgs[1].body)
    expect(body.application_id).toBe(42)
    expect(body.language).toBe('de')
    expect(body.include_cv).toBe(true)
    expect(body.include_cover_letter).toBe(true)
  })

  // --- 3. Generate with custom options ---
  it('generates with include_cv=false when specified', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse({
      cv_document: null,
      cover_letter_document: { id: 11 },
      generation_time_ms: 800,
    }))

    const { result } = renderHook(() => useDocumentGeneration())

    await act(async () => {
      await result.current.generate(1, { includeCv: false })
    })

    const body = JSON.parse(mockAuthenticatedFetch.mock.calls[0][1].body)
    expect(body.include_cv).toBe(false)
    expect(body.include_cover_letter).toBe(true)
  })

  // --- 4. Generate error sets error state ---
  it('sets error on generation failure and re-throws', async () => {
    mockAuthenticatedFetch.mockRejectedValueOnce(new Error('AI service unavailable'))

    const { result } = renderHook(() => useDocumentGeneration())

    let caughtError
    await act(async () => {
      try {
        await result.current.generate(42)
      } catch (err) {
        caughtError = err
      }
    })

    expect(caughtError).toBeDefined()
    expect(caughtError.message).toBe('AI service unavailable')
    expect(result.current.error).toBe('AI service unavailable')
    expect(result.current.isGenerating(42)).toBe(false)
  })

  // --- 5. isGenerating tracks generating state ---
  it('tracks generating state during async operation', async () => {
    let resolveGenerate
    mockAuthenticatedFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGenerate = resolve
      })
    )

    const { result } = renderHook(() => useDocumentGeneration())

    // Start generating — do not await
    let generatePromise
    act(() => {
      generatePromise = result.current.generate(7)
    })

    // While generating, isGenerating should be true
    expect(result.current.isGenerating(7)).toBe(true)
    expect(result.current.generatingSet.has(7)).toBe(true)

    // Resolve the fetch
    await act(async () => {
      resolveGenerate(makeMockResponse({
        cv_document: { id: 1 },
        cover_letter_document: null,
        generation_time_ms: 200,
      }))
      await generatePromise
    })

    expect(result.current.isGenerating(7)).toBe(false)
  })

  // --- 6. fetchDocuments success ---
  it('fetches existing documents for an application', async () => {
    const mockDocs = [
      { id: 10, doc_type: 'cv', content: '{}' },
      { id: 11, doc_type: 'cover_letter', content: '{}' },
    ]
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(mockDocs))

    const { result } = renderHook(() => useDocumentGeneration())

    let fetched
    await act(async () => {
      fetched = await result.current.fetchDocuments(42)
    })

    expect(fetched.cv).toEqual(mockDocs[0])
    expect(fetched.coverLetter).toEqual(mockDocs[1])
    expect(result.current.documents[42].cv).toEqual(mockDocs[0])
    expect(result.current.documents[42].coverLetter).toEqual(mockDocs[1])
  })

  // --- 7. fetchDocuments returns null on error ---
  it('returns null when fetchDocuments fails', async () => {
    mockAuthenticatedFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useDocumentGeneration())

    let fetched
    await act(async () => {
      fetched = await result.current.fetchDocuments(99)
    })

    expect(fetched).toBeNull()
  })

  // --- 8. fetchDocuments when only CV exists (no cover letter) ---
  it('handles fetched documents when only CV exists', async () => {
    const mockDocs = [
      { id: 10, doc_type: 'cv', content: '{}' },
    ]
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(mockDocs))

    const { result } = renderHook(() => useDocumentGeneration())

    let fetched
    await act(async () => {
      fetched = await result.current.fetchDocuments(42)
    })

    expect(fetched.cv).toEqual(mockDocs[0])
    expect(fetched.coverLetter).toBeNull()
  })

  // --- 9. getDocumentsFor returns null for unknown app ---
  it('getDocumentsFor returns null for unknown applicationId', () => {
    const { result } = renderHook(() => useDocumentGeneration())
    expect(result.current.getDocumentsFor(999)).toBeNull()
  })

  // --- 10. downloadPdf calls the correct endpoint ---
  it('downloads PDF via correct endpoint', async () => {
    const mockBlob = new Blob(['pdf'], { type: 'application/pdf' })
    mockAuthenticatedFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    })

    // Mock URL.createObjectURL and URL.revokeObjectURL
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()

    const { result } = renderHook(() => useDocumentGeneration())

    await act(async () => {
      await result.current.downloadPdf(10, 'my-cv.pdf')
    })

    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
    expect(mockAuthenticatedFetch.mock.calls[0][0]).toContain('/api/v1/cv-generation/10/pdf')
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  // --- 11. downloadPdf silently fails on error ---
  it('handles downloadPdf error silently', async () => {
    mockAuthenticatedFetch.mockRejectedValueOnce(new Error('Download failed'))

    const { result } = renderHook(() => useDocumentGeneration())

    // Should not throw
    await act(async () => {
      await result.current.downloadPdf(10, 'my-cv.pdf')
    })

    // No crash — error handled internally
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
  })

  // --- 12. downloadJson calls the correct endpoint ---
  it('downloads JSON via correct endpoint', async () => {
    const docData = { content: JSON.stringify({ name: 'John', skills: ['React'] }) }
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(docData))

    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:mock-json-url')
    URL.revokeObjectURL = vi.fn()

    const { result } = renderHook(() => useDocumentGeneration())

    await act(async () => {
      await result.current.downloadJson(10, 'my-cv.json')
    })

    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
    expect(mockAuthenticatedFetch.mock.calls[0][0]).toContain('/api/v1/cv-generation/10')
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-json-url')

    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  // --- 13. deleteDocument removes from state ---
  it('deletes document and removes from state', async () => {
    // First, generate a document
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse({
      cv_document: { id: 10 },
      cover_letter_document: null,
      generation_time_ms: 100,
    }))

    const { result } = renderHook(() => useDocumentGeneration())

    await act(async () => {
      await result.current.generate(42)
    })

    expect(result.current.documents[42]).toBeTruthy()

    // Now delete — mock the DELETE fetch (no extra options arg on the first generate)
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse({}))

    await act(async () => {
      await result.current.deleteDocument(10, 42)
    })

    expect(result.current.documents[42]).toBeUndefined()

    // Verify DELETE was called
    const deleteCall = mockAuthenticatedFetch.mock.calls[1]
    expect(deleteCall[0]).toContain('/api/v1/cv-generation/10')
    expect(deleteCall[1].method).toBe('DELETE')
  })

  // --- 14. deleteDocument without applicationId does not modify state ---
  it('deletes document without applicationId — state unchanged', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse({
      cv_document: { id: 10 },
      cover_letter_document: null,
      generation_time_ms: 100,
    }))

    const { result } = renderHook(() => useDocumentGeneration())

    await act(async () => {
      await result.current.generate(42)
    })

    // Delete without applicationId
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse({}))

    await act(async () => {
      await result.current.deleteDocument(10)
    })

    // Documents state still has the entry
    expect(result.current.documents[42]).toBeTruthy()
  })

  // --- 15. Generate with default options ---
  it('uses default options when none provided', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse({
      cv_document: { id: 1 },
      cover_letter_document: { id: 2 },
      generation_time_ms: 500,
    }))

    const { result } = renderHook(() => useDocumentGeneration())

    await act(async () => {
      await result.current.generate(1)
    })

    const body = JSON.parse(mockAuthenticatedFetch.mock.calls[0][1].body)
    expect(body.language).toBe('en')
    expect(body.include_cv).toBe(true)
    expect(body.include_cover_letter).toBe(true)
  })

  // --- 16. Error clears on new generation ---
  it('clears previous error when starting new generation', async () => {
    // First generation fails
    mockAuthenticatedFetch.mockRejectedValueOnce(new Error('fail'))

    const { result } = renderHook(() => useDocumentGeneration())

    await act(async () => {
      try {
        await result.current.generate(1)
      } catch {
        // expected
      }
    })

    expect(result.current.error).toBe('fail')

    // Second generation succeeds — error should clear
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse({
      cv_document: { id: 1 },
      cover_letter_document: null,
      generation_time_ms: 100,
    }))

    await act(async () => {
      await result.current.generate(2)
    })

    expect(result.current.error).toBeNull()
  })

  // --- 17. deleteDocument silently handles errors ---
  it('handles deleteDocument error silently', async () => {
    mockAuthenticatedFetch.mockRejectedValueOnce(new Error('Delete failed'))

    const { result } = renderHook(() => useDocumentGeneration())

    // Should not throw
    await act(async () => {
      await result.current.deleteDocument(10, 42)
    })

    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
  })
})
