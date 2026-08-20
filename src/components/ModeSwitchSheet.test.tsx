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
  setMode = vi.fn(async () => {}),
  onClose = vi.fn(() => {}),
  open = true,
}: {
  mode?: Mode
  setMode?: (m: Mode) => Promise<void>
  onClose?: () => void
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

// 저장이 실패했는데 화면만 바꾸면, 다음에 열 때 아무 말 없이 원래 모드로 돌아간다
describe('모드 전환 실패', () => {
  it('실패하면 전환하지 않고 실패를 알린다', async () => {
    const setMode = vi.fn(async () => {
      throw new Error('쓰기 불가')
    })
    const onClose = vi.fn()
    Setup({ mode: 'trainer', setMode, onClose })

    await userEvent.click(screen.getByRole('button', { name: '개인' }))

    expect(await screen.findByText(/전환 실패/)).toBeInTheDocument()
    // 성공한 척하지 않는다
    expect(screen.queryByText(/모드로 전환했습니다/)).not.toBeInTheDocument()
    // 시트도 닫지 않는다 — 다시 눌러볼 수 있게
    expect(onClose).not.toHaveBeenCalled()
  })

  it('성공하면 전환하고 알린다', async () => {
    const setMode = vi.fn(async () => {})
    const onClose = vi.fn()
    Setup({ mode: 'trainer', setMode, onClose })

    await userEvent.click(screen.getByRole('button', { name: '개인' }))

    expect(await screen.findByText('개인 모드로 전환했습니다')).toBeInTheDocument()
    expect(setMode).toHaveBeenCalledWith('personal')
    expect(onClose).toHaveBeenCalled()
  })
})

