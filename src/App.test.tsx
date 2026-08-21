import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { ToastProvider } from './components/Toast.tsx'
import { appConfigRepo } from './db/repositories/appConfig.ts'

// 실제 앱과 같은 껍데기(main.tsx와 동일한 순서)
function renderApp() {
  return render(
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>,
  )
}

beforeEach(() => {
  // 바운더리가 잡은 에러를 React가 콘솔에 다시 뱉는다
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

// 스플래시는 최소 1200ms 노출된다. 가짜 타이머는 fake-indexeddb와 맞물리지 않아
// 실제 시간을 기다린다.
const WAIT = { timeout: 4000 }

async function splashGone() {
  await waitFor(() => expect(document.querySelector('.splash')).toBeNull(), WAIT)
}

describe('앱 시작', () => {
  it('정상이면 스플래시 뒤에 화면이 뜬다', async () => {
    renderApp()
    expect(document.querySelector('.splash')).toBeTruthy()

    await splashGone()
    expect(document.querySelector('.crash')).toBeNull()
  })

  // catch가 없으면 state가 loading에 남아 스플래시에 영구히 갇힌다.
  // 에러 바운더리도 못 잡는다 — 렌더 예외가 아니라 거부된 프라미스라서.
  // 라우터가 뜨지 않으니 설정으로 들어가 백업을 뽑을 수도 없다.
  it('저장소를 못 열면 스플래시에 갇히지 않고 복구 화면을 보여준다', async () => {
    vi.spyOn(appConfigRepo, 'getMode').mockRejectedValue(new Error('IndexedDB 사용 불가'))

    renderApp()
    expect(await screen.findByText('앱에 문제가 생겼습니다', undefined, WAIT)).toBeInTheDocument()
    expect(document.querySelector('.splash')).toBeNull()
  })

  // 그 화면에서 백업을 뽑을 수 있어야 한다 — 설정으로 들어갈 길이 없으므로
  it('복구 화면에 백업 내려받기가 있다', async () => {
    vi.spyOn(appConfigRepo, 'getMode').mockRejectedValue(new Error('IndexedDB 사용 불가'))

    renderApp()
    await screen.findByText('앱에 문제가 생겼습니다', undefined, WAIT)

    expect(screen.getByRole('button', { name: '백업 내려받기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '앱 다시 시작' })).toBeInTheDocument()
  })

  it('무엇이 실패했는지 오류 내용에 남는다', async () => {
    vi.spyOn(appConfigRepo, 'getMode').mockRejectedValue(new Error('IndexedDB 사용 불가'))

    renderApp()
    await screen.findByText('앱에 문제가 생겼습니다', undefined, WAIT)

    expect(screen.getByText(/저장소를 열 수 없습니다/)).toBeInTheDocument()
    expect(screen.getByText(/IndexedDB 사용 불가/)).toBeInTheDocument()
  })

  // 첫 실행에 모드·설치 시각을 쓰는데 그것도 실패할 수 있다
  it('첫 실행 쓰기가 실패해도 갇히지 않는다', async () => {
    vi.spyOn(appConfigRepo, 'getMode').mockResolvedValue(null)
    vi.spyOn(appConfigRepo, 'setMode').mockRejectedValue(new Error('쓰기 불가'))

    renderApp()
    expect(await screen.findByText('앱에 문제가 생겼습니다', undefined, WAIT)).toBeInTheDocument()
    expect(document.querySelector('.splash')).toBeNull()
  })
})
