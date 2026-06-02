import { describe, expect, it, vi } from 'vitest'
import { render, renderHook, screen } from '@testing-library/react'
import { ModeContext, useMode } from './ModeContext.tsx'

describe('ModeContext / useMode', () => {
  it('Provider 안에서 mode와 setMode를 반환', () => {
    const setMode = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useMode(), {
      wrapper: ({ children }) => (
        <ModeContext.Provider value={{ mode: 'trainer', setMode }}>
          {children}
        </ModeContext.Provider>
      ),
    })
    expect(result.current.mode).toBe('trainer')
    expect(result.current.setMode).toBe(setMode)
  })

  it('Provider 밖에서 호출 시 에러', () => {
    // suppress React error boundary console.error noise
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      function Solo() {
        useMode()
        return null
      }
      render(<Solo />)
    }).toThrow(/useMode must be used inside/)
    err.mockRestore()
  })

  it('setMode를 호출하면 provider에 전달된 함수 실행', async () => {
    const setMode = vi.fn().mockResolvedValue(undefined)
    function Inner() {
      const { mode, setMode } = useMode()
      return (
        <button type="button" onClick={() => setMode('personal')}>
          {mode}
        </button>
      )
    }
    render(
      <ModeContext.Provider value={{ mode: 'trainer', setMode }}>
        <Inner />
      </ModeContext.Provider>,
    )
    const btn = screen.getByRole('button', { name: 'trainer' })
    btn.click()
    expect(setMode).toHaveBeenCalledWith('personal')
  })
})
