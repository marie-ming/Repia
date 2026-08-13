import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from './ErrorBoundary.tsx'
import { exportBackup } from '../db/backup.ts'

vi.mock('../db/backup.ts', () => ({ exportBackup: vi.fn() }))

function Boom({ throws }: { throws: boolean }) {
  if (throws) throw new Error('렌더 실패')
  return <p>정상 화면</p>
}

beforeEach(() => {
  // 바운더리가 잡은 에러를 React가 콘솔에 다시 뱉는다 — 테스트 출력만 조용히.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(exportBackup).mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('예외가 없으면 자식을 그대로 보여준다', () => {
    render(
      <ErrorBoundary>
        <Boom throws={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('정상 화면')).toBeInTheDocument()
  })

  it('자식이 터지면 안내 화면으로 대체한다', () => {
    render(
      <ErrorBoundary>
        <Boom throws />
      </ErrorBoundary>,
    )
    expect(screen.getByText('앱에 문제가 생겼습니다')).toBeInTheDocument()
    expect(screen.queryByText('정상 화면')).not.toBeInTheDocument()
  })

  it('기록이 남아 있다는 걸 알려준다 (사용자가 가장 먼저 걱정하는 것)', () => {
    render(
      <ErrorBoundary>
        <Boom throws />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/기록은 이 기기에 그대로 있습니다/)).toBeInTheDocument()
  })

  // 이 화면의 핵심. 설정으로 못 들어가는 상태라 여기서 백업이 돼야 한다.
  it('백업 내려받기가 실제로 내보내기를 호출한다', async () => {
    render(
      <ErrorBoundary>
        <Boom throws />
      </ErrorBoundary>,
    )
    await userEvent.click(screen.getByRole('button', { name: '백업 내려받기' }))
    expect(exportBackup).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('백업 파일을 내려받았습니다.')).toBeInTheDocument()
  })

  it('백업까지 실패하면 실패했다고 말한다 (성공한 척하지 않는다)', async () => {
    vi.mocked(exportBackup).mockRejectedValue(new Error('DB 접근 불가'))
    render(
      <ErrorBoundary>
        <Boom throws />
      </ErrorBoundary>,
    )
    await userEvent.click(screen.getByRole('button', { name: '백업 내려받기' }))
    expect(await screen.findByText(/백업에 실패했습니다/)).toBeInTheDocument()
  })

  it('백업이 끝나면 버튼이 다시 눌린다', async () => {
    render(
      <ErrorBoundary>
        <Boom throws />
      </ErrorBoundary>,
    )
    const btn = screen.getByRole('button', { name: '백업 내려받기' })
    await userEvent.click(btn)
    await screen.findByText('백업 파일을 내려받았습니다.')
    expect(screen.getByRole('button', { name: '백업 내려받기' })).toBeEnabled()
  })

  it('오류 내용을 확인할 수 있다', () => {
    render(
      <ErrorBoundary>
        <Boom throws />
      </ErrorBoundary>,
    )
    expect(screen.getByText('렌더 실패')).toBeInTheDocument()
  })

  it('앱 다시 시작은 페이지를 새로 띄운다', async () => {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    })
    render(
      <ErrorBoundary>
        <Boom throws />
      </ErrorBoundary>,
    )
    await userEvent.click(screen.getByRole('button', { name: '앱 다시 시작' }))
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
