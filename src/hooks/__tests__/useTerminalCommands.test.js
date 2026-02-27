import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import useTerminalCommands from '../useTerminalCommands'

const mockSetBackground = vi.fn()
const mockSetTheme = vi.fn()

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({
    backgroundEffect: 'rain',
    setBackground: mockSetBackground,
    setTheme: mockSetTheme,
    themeName: 'cyan',
    availableThemes: [
      { key: 'cyan', name: 'Cyan' },
      { key: 'silver', name: 'Silver' },
      { key: 'amber', name: 'Amber' },
    ],
  }),
}))

const portfolioData = {
  name: 'Vicente',
  title: 'Full Stack Developer',
  location: 'Switzerland',
  email: 'test@example.com',
  profile: { description: 'Test description' },
  techSkills: {
    frontend: [{ name: 'React', level: 90 }],
    backend: [{ name: 'Python', level: 85 }],
    databases: [],
    others: [],
  },
  experience: [
    { title: 'Dev', company: 'Co', location: 'Remote', date: '2024', description: 'Built things' },
  ],
  education: [
    { title: 'CS Degree', institution: 'University', date: '2020', description: 'Studied CS' },
  ],
}

// Helper: submit a command to the hook
const submitCommand = (result, command) => {
  act(() => { result.current.setInputValue(command) })
  const mockEvent = { preventDefault: vi.fn() }
  act(() => { result.current.handleSubmit(mockEvent) })
}

describe('useTerminalCommands', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows welcome banner on mount', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    // Banner contains ASCII art lines (the stylized "Vicente" logo)
    const asciiLines = result.current.lines.filter(l => l.type === 'ascii')
    expect(asciiLines.length).toBeGreaterThan(0)
    // ASCII art contains the stylized name pattern
    expect(asciiLines.some(l => l.text.includes('___'))).toBe(true)
    // Welcome message with the name appears as a success line
    const successLines = result.current.lines.filter(l => l.type === 'success')
    expect(successLines.some(l => l.text.includes('Vicente'))).toBe(true)
    // Hint line present
    const infoLines = result.current.lines.filter(l => l.type === 'info')
    expect(infoLines.some(l => l.text.includes('help'))).toBe(true)
  })

  it('help command outputs command list', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'help')

    const texts = result.current.lines.map(l => l.text)
    expect(texts.some(t => t.includes('help'))).toBe(true)
    expect(texts.some(t => t.includes('about'))).toBe(true)
    expect(texts.some(t => t.includes('skills'))).toBe(true)
    expect(texts.some(t => t.includes('exit'))).toBe(true)
  })

  it('about command outputs portfolio name and title', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'about')

    const texts = result.current.lines.map(l => l.text)
    expect(texts.some(t => t.includes('Vicente'))).toBe(true)
    expect(texts.some(t => t.includes('Full Stack Developer'))).toBe(true)
    expect(texts.some(t => t.includes('Switzerland'))).toBe(true)
  })

  it('skills command outputs tech skills with progress bars', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'skills')

    const texts = result.current.lines.map(l => l.text)
    expect(texts.some(t => t.includes('FRONTEND'))).toBe(true)
    expect(texts.some(t => t.includes('React'))).toBe(true)
    expect(texts.some(t => t.includes('90%'))).toBe(true)
    expect(texts.some(t => t.includes('BACKEND'))).toBe(true)
    expect(texts.some(t => t.includes('Python'))).toBe(true)
    expect(texts.some(t => t.includes('85%'))).toBe(true)
  })

  it('experience command outputs work experience', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'experience')

    const texts = result.current.lines.map(l => l.text)
    expect(texts.some(t => t.includes('Dev'))).toBe(true)
    expect(texts.some(t => t.includes('Co'))).toBe(true)
    expect(texts.some(t => t.includes('Remote'))).toBe(true)
    expect(texts.some(t => t.includes('Built things'))).toBe(true)
  })

  it('education command outputs education entries', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'education')

    const texts = result.current.lines.map(l => l.text)
    expect(texts.some(t => t.includes('CS Degree'))).toBe(true)
    expect(texts.some(t => t.includes('University'))).toBe(true)
    expect(texts.some(t => t.includes('2020'))).toBe(true)
    expect(texts.some(t => t.includes('Studied CS'))).toBe(true)
  })

  it('ls command lists fake files', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'ls')

    const texts = result.current.lines.map(l => l.text)
    expect(texts.some(t => t.includes('about.txt'))).toBe(true)
    expect(texts.some(t => t.includes('skills.dat'))).toBe(true)
    expect(texts.some(t => t.includes('experience.log'))).toBe(true)
    expect(texts.some(t => t.includes('education.md'))).toBe(true)
    expect(texts.some(t => t.includes('contact.cfg'))).toBe(true)
    expect(texts.some(t => t.includes('README.md'))).toBe(true)
  })

  it('cat about.txt triggers the about command', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'cat about.txt')

    const texts = result.current.lines.map(l => l.text)
    // cat about.txt maps to 'about' command which outputs the name
    expect(texts.some(t => t.includes('Vicente'))).toBe(true)
    expect(texts.some(t => t.includes('Full Stack Developer'))).toBe(true)
  })

  it('cat nonexistent shows file not found error', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'cat nonexistent')

    const texts = result.current.lines.map(l => l.text)
    expect(texts.some(t => t.includes('nonexistent') && t.includes('No such file or directory'))).toBe(true)
  })

  it('whoami outputs user info', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'whoami')

    const texts = result.current.lines.map(l => l.text)
    expect(texts.some(t => t.includes('visitor'))).toBe(true)
    expect(texts.some(t => t.includes('READ_ONLY'))).toBe(true)
  })

  it('ping outputs fake ping results', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'ping')

    const texts = result.current.lines.map(l => l.text)
    expect(texts.some(t => t.includes('PING'))).toBe(true)
    expect(texts.some(t => t.includes('127.0.0.1'))).toBe(true)
    expect(texts.some(t => t.includes('0% packet loss'))).toBe(true)
  })

  it('sudo hire_me shows hiring message with email', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'sudo hire_me')

    const texts = result.current.lines.map(l => l.text)
    expect(texts.some(t => t.includes('ACCESS GRANTED'))).toBe(true)
    expect(texts.some(t => t.includes('test@example.com'))).toBe(true)
  })

  it('background list lists available effects', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'background list')

    const texts = result.current.lines.map(l => l.text)
    expect(texts.some(t => t.includes('rain'))).toBe(true)
    expect(texts.some(t => t.includes('matrix'))).toBe(true)
    expect(texts.some(t => t.includes('parallax'))).toBe(true)
    expect(texts.some(t => t.includes('lensflare'))).toBe(true)
  })

  it('background rain calls setBackground', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'background rain')

    expect(mockSetBackground).toHaveBeenCalledWith('rain')
  })

  it('theme list lists available themes', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'theme list')

    const texts = result.current.lines.map(l => l.text)
    expect(texts.some(t => t.includes('cyan'))).toBe(true)
    expect(texts.some(t => t.includes('silver'))).toBe(true)
    expect(texts.some(t => t.includes('amber'))).toBe(true)
  })

  it('theme amber calls setTheme', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'theme amber')

    expect(mockSetTheme).toHaveBeenCalledWith('amber')
  })

  it('unknown command shows error message', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'foobar')

    const texts = result.current.lines.map(l => l.text)
    expect(texts.some(t => t.includes('foobar') && t.includes('command not found'))).toBe(true)
  })

  it('clear clears all lines', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    // Should have welcome banner lines
    expect(result.current.lines.length).toBeGreaterThan(0)

    submitCommand(result, 'clear')

    expect(result.current.lines).toEqual([])
  })

  it('history shows command history', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'help')
    submitCommand(result, 'about')
    submitCommand(result, 'history')

    const texts = result.current.lines.map(l => l.text)
    // History output should include prior commands
    expect(texts.some(t => t.includes('help'))).toBe(true)
    expect(texts.some(t => t.includes('about'))).toBe(true)
  })

  it('ArrowUp navigates command history', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'help')
    submitCommand(result, 'about')

    // ArrowUp should set inputValue to the last command ('about')
    act(() => {
      result.current.handleKeyDown({ key: 'ArrowUp', preventDefault: vi.fn() })
    })

    expect(result.current.inputValue).toBe('about')

    // ArrowUp again goes to 'help'
    act(() => {
      result.current.handleKeyDown({ key: 'ArrowUp', preventDefault: vi.fn() })
    })

    expect(result.current.inputValue).toBe('help')
  })

  it('ArrowDown navigates command history forward', () => {
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'help')
    submitCommand(result, 'about')

    // Navigate up twice
    act(() => {
      result.current.handleKeyDown({ key: 'ArrowUp', preventDefault: vi.fn() })
    })
    act(() => {
      result.current.handleKeyDown({ key: 'ArrowUp', preventDefault: vi.fn() })
    })

    expect(result.current.inputValue).toBe('help')

    // Navigate down once goes back to 'about'
    act(() => {
      result.current.handleKeyDown({ key: 'ArrowDown', preventDefault: vi.fn() })
    })

    expect(result.current.inputValue).toBe('about')

    // Navigate down past the end clears input
    act(() => {
      result.current.handleKeyDown({ key: 'ArrowDown', preventDefault: vi.fn() })
    })

    expect(result.current.inputValue).toBe('')
  })

  it('exit calls onClose', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useTerminalCommands({ portfolioData, onClose })
    )

    submitCommand(result, 'exit')

    // onClose is called via setTimeout(300ms)
    act(() => { vi.advanceTimersByTime(400) })

    expect(onClose).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
