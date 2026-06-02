import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

vi.mock('../utils/date.ts', async () => {
  const actual = await vi.importActual<typeof import('../utils/date.ts')>('../utils/date.ts')
  return { ...actual, todayISODate: () => '2026-06-15' }
})

import { TrainerHomePage } from './TrainerHomePage.tsx'
import { ToastProvider } from '../components/Toast.tsx'
import { ModeContext } from '../components/ModeContext.tsx'
import { membersRepo } from '../db/repositories/members.ts'
import { sessionsRepo } from '../db/repositories/sessions.ts'

function renderPage() {
  function PathProbe() {
    const loc = useLocation()
    return (
      <div data-testid="loc">
        {loc.pathname}
        {loc.search}
      </div>
    )
  }
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ModeContext.Provider value={{ mode: 'trainer', setMode: async () => {} }}>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<TrainerHomePage />} />
            <Route path="*" element={<PathProbe />} />
          </Routes>
        </ToastProvider>
      </ModeContext.Provider>
    </MemoryRouter>,
  )
}

describe('TrainerHomePage', () => {
  it('월 라벨이 오늘(2026-06-15) 기준', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: '2026년 6월' })).toBeInTheDocument()
  })

  it('오늘 수업이 없으면 "예정된 수업이 없습니다"', async () => {
    renderPage()
    expect(await screen.findByText('예정된 수업이 없습니다.')).toBeInTheDocument()
  })

  it('오늘 수업이 있으면 시간순 정렬로 노출', async () => {
    await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: '회원2',
      date: '2026-06-15',
      time: '14:00',
      status: 'reserved',
    })
    await sessionsRepo.create({
      memberId: 'm2',
      memberNameSnapshot: '회원1',
      date: '2026-06-15',
      time: '10:00',
      status: 'reserved',
    })
    renderPage()
    await screen.findByText('회원1')
    const items = document.querySelectorAll('.session-item__member')
    expect([...items].map((el) => el.textContent)).toEqual(['회원1', '회원2'])
  })

  it('수업 아이템 클릭 시 /sessions/:id로 이동', async () => {
    const s = await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: '홍길동',
      date: '2026-06-15',
      time: '10:00',
      status: 'reserved',
    })
    renderPage()
    await userEvent.click(await screen.findByText('홍길동'))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/sessions/${s.id}`)
  })

  it('회원 없을 때 FAB 클릭 → 토스트, navigate 안 함', async () => {
    renderPage()
    await screen.findByText('예정된 수업이 없습니다.')
    await userEvent.click(screen.getByLabelText('수업 추가'))
    expect(screen.getByRole('status')).toHaveTextContent('회원을 먼저 추가해주세요')
    expect(screen.queryByTestId('loc')).toBeNull()
  })

  it('회원 있을 때 FAB → /sessions/new?date=today', async () => {
    await membersRepo.create({ name: '홍길동' })
    renderPage()
    await screen.findByText('예정된 수업이 없습니다.')
    await userEvent.click(screen.getByLabelText('수업 추가'))
    await waitFor(() => {
      expect(screen.getByTestId('loc')).toHaveTextContent('/sessions/new?date=2026-06-15')
    })
  })

  it('다음 달 화살표 → 7월 라벨', async () => {
    renderPage()
    await screen.findByRole('button', { name: '2026년 6월' })
    await userEvent.click(screen.getByLabelText('다음 달'))
    expect(screen.getByRole('button', { name: '2026년 7월' })).toBeInTheDocument()
  })

  it('취소된 수업은 marked dot에서 제외', async () => {
    await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: '취소',
      date: '2026-06-20',
      status: 'cancelled',
    })
    renderPage()
    await screen.findByRole('button', { name: '2026년 6월' })
    expect(document.querySelectorAll('.calendar__dot').length).toBe(0)
  })
})
