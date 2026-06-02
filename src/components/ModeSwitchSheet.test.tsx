import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ModeSwitchSheet } from './ModeSwitchSheet.tsx'
import { ModeContext } from './ModeContext.tsx'
import { ToastProvider } from './Toast.tsx'
import type { Mode } from '../db/types.ts'

function Setup({
  mode = 'trainer' as Mode,
  setMode = vi.fn().mockResolvedValue(undefined),
  onClose = vi.fn(),
  open = true,
}: {
  mode?: Mode
  setMode?: ReturnType<typeof vi.fn>
  onClose?: ReturnType<typeof vi.fn>
  open?: boolean
}) {
  function PathProbe() {
    const loc = useLocation()
    return <div data-testid="loc">{loc.pathname}</div>
  }
  return render(
    <MemoryRouter initialEntries={['/members']}>
      <ModeContext.Provider value={{ mode, setMode }}>
        <ToastProvider>
          <ModeSwitchSheet open={open} onClose={onClose} />
          <Routes>
            <Route path="*" element={<PathProbe />} />
          </Routes>
        </ToastProvider>
      </ModeContext.Provider>
    </MemoryRouter>,
  )
}

describe('ModeSwitchSheet', () => {
  it('open=true이면 트레이너/개인 옵션 표시', () => {
    Setup({})
    expect(screen.getByRole('button', { name: '트레이너' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '개인' })).toBeInTheDocument()
  })

  it('현재 모드 옵션에 --active 클래스', () => {
    Setup({ mode: 'trainer' })
    expect(screen.getByRole('button', { name: '트레이너' })).toHaveClass('segmented__item--active')
    expect(screen.getByRole('button', { name: '개인' })).not.toHaveClass('segmented__item--active')
  })

  it('현재 모드와 같은 옵션을 누르면 setMode 호출 없이 onClose만', async () => {
    const setMode = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    Setup({ mode: 'trainer', setMode, onClose })
    await userEvent.click(screen.getByRole('button', { name: '트레이너' }))
    expect(setMode).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('다른 모드 선택 시 setMode 호출 + onClose + navigate /', async () => {
    const setMode = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    Setup({ mode: 'trainer', setMode, onClose })
    await userEvent.click(screen.getByRole('button', { name: '개인' }))
    await waitFor(() => expect(setMode).toHaveBeenCalledWith('personal'))
    expect(onClose).toHaveBeenCalled()
    expect(screen.getByTestId('loc')).toHaveTextContent('/')
  })

  it('모드 전환 후 토스트 표시', async () => {
    const setMode = vi.fn().mockResolvedValue(undefined)
    Setup({ mode: 'personal', setMode })
    await userEvent.click(screen.getByRole('button', { name: '트레이너' }))
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('트레이너 모드로 전환했습니다')
    })
  })
})
