import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useCallback, useState } from 'react'
import { useLoader } from './useLoader.ts'

function Probe({ load }: { load: () => Promise<void> }) {
  const stable = useCallback(load, [load])
  const { error, retry } = useLoader(stable)
  return (
    <div>
      <span data-testid="error">{error ? error.message : '없음'}</span>
      <button type="button" onClick={retry}>
        다시 시도
      </button>
    </div>
  )
}

describe('useLoader', () => {
  it('성공하면 에러가 없다', async () => {
    render(<Probe load={async () => {}} />)
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('없음'))
  })

  it('거부된 프라미스를 에러로 잡는다', async () => {
    render(<Probe load={async () => { throw new Error('읽기 실패') }} />)
    expect(await screen.findByText('읽기 실패')).toBeInTheDocument()
  })

  it('Error가 아닌 값으로 거부돼도 감싼다', async () => {
    render(<Probe load={() => Promise.reject('문자열')} />)
    expect(await screen.findByText('문자열')).toBeInTheDocument()
  })

  it('다시 시도하면 load를 한 번 더 부른다', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('읽기 실패')).mockResolvedValue(undefined)
    render(<Probe load={load} />)
    await screen.findByText('읽기 실패')

    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('없음'))
    expect(load).toHaveBeenCalledTimes(2)
  })

  // 실패한 채로 남으면 성공해도 에러 화면이 그대로 있어 다시 시도가 소용없어진다
  it('다시 시도할 때 이전 에러를 먼저 지운다', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('첫 실패')).mockResolvedValue(undefined)
    render(<Probe load={load} />)
    await screen.findByText('첫 실패')

    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    await waitFor(() => expect(screen.queryByText('첫 실패')).not.toBeInTheDocument())
  })

  it('언마운트된 뒤 거부돼도 상태를 건드리지 않는다', async () => {
    let reject: (e: Error) => void = () => {}
    const load = () => new Promise<void>((_, rej) => { reject = rej })
    const { unmount } = render(<Probe load={load} />)
    unmount()

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    reject(new Error('늦게 도착'))
    await new Promise((r) => setTimeout(r, 0))
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

// 실패 후에도 화면이 계속 살아 있는지 (로딩 플래그가 멈춰 있어도 에러는 떠야 한다)
function StuckProbe() {
  const [loaded, setLoaded] = useState(false)
  const load = useCallback(async () => {
    throw new Error('읽기 실패')
    setLoaded(true) // eslint-disable-line no-unreachable
  }, [])
  const { error } = useLoader(load)
  if (error) return <p>기록을 불러오지 못했습니다.</p>
  if (!loaded) return <p>불러오는 중...</p>
  return <p>본문</p>
}

describe('useLoader가 없을 때의 증상', () => {
  it('로딩 플래그가 안 세워져도 에러 화면으로 빠져나온다', async () => {
    render(<StuckProbe />)
    expect(await screen.findByText('기록을 불러오지 못했습니다.')).toBeInTheDocument()
    expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument()
  })
})
