import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ToastProvider, useToast } from './Toast.tsx'

function Trigger({ msg }: { msg: string }) {
  const show = useToast()
  return (
    <button type="button" onClick={() => show(msg)}>
      띄우기
    </button>
  )
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('기본 상태: 토스트 없음', () => {
    render(
      <ToastProvider>
        <div>child</div>
      </ToastProvider>,
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('show() 호출 시 메시지 표시', () => {
    render(
      <ToastProvider>
        <Trigger msg="안녕" />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('status')).toHaveTextContent('안녕')
  })

  it('2.5초 후 자동으로 사라짐', () => {
    render(
      <ToastProvider>
        <Trigger msg="잠시" />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('status')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('연속 호출 시 메시지 교체 + 타이머 리셋', () => {
    function MultiTrigger() {
      const show = useToast()
      return (
        <>
          <button type="button" onClick={() => show('첫번째')}>A</button>
          <button type="button" onClick={() => show('두번째')}>B</button>
        </>
      )
    }

    render(
      <ToastProvider>
        <MultiTrigger />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'A' }))
    expect(screen.getByRole('status')).toHaveTextContent('첫번째')
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    fireEvent.click(screen.getByRole('button', { name: 'B' }))
    expect(screen.getByRole('status')).toHaveTextContent('두번째')
    // B 호출로 타이머 리셋 → 2000ms 더 지나도 살아있음
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByRole('status')).toHaveTextContent('두번째')
    // 추가 600ms로 총 2.5s 경과 → 사라짐
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('Provider 밖에서 useToast는 no-op (기본 빈 함수)', () => {
    function Solo() {
      const show = useToast()
      show('test')
      return <p>ok</p>
    }
    render(<Solo />)
    expect(screen.getByText('ok')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
