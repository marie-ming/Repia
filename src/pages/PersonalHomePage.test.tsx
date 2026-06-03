import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

vi.mock('../utils/date.ts', async () => {
  const actual = await vi.importActual<typeof import('../utils/date.ts')>('../utils/date.ts')
  return { ...actual, todayISODate: () => '2026-06-15' }
})

import { PersonalHomePage } from './PersonalHomePage.tsx'
import { ModeContext } from '../components/ModeContext.tsx'
import { routineLogsRepo } from '../db/repositories/routineLogs.ts'

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
      <ModeContext.Provider value={{ mode: 'personal', setMode: async () => {} }}>
        <Routes>
          <Route path="/" element={<PersonalHomePage />} />
          <Route path="*" element={<PathProbe />} />
        </Routes>
      </ModeContext.Provider>
    </MemoryRouter>,
  )
}

describe('PersonalHomePage', () => {
  it('기록 없으면 빈 상태', async () => {
    renderPage()
    expect(await screen.findByText('이번 달 기록이 없습니다.')).toBeInTheDocument()
  })

  it('이번 달 기록 카드 표시', async () => {
    await routineLogsRepo.create({ title: '하체 데이', date: '2026-06-10', status: 'completed' })
    renderPage()
    expect(await screen.findByText('하체 데이')).toBeInTheDocument()
  })

  it('카드 클릭 시 기록 상세로', async () => {
    const l = await routineLogsRepo.create({ title: '상체', date: '2026-06-10', status: 'completed' })
    renderPage()
    await userEvent.click(await screen.findByText('상체'))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/logs/${l.id}`)
  })

  it('FAB → 오늘 날짜로 기록 추가', async () => {
    renderPage()
    await screen.findByText('이번 달 기록이 없습니다.')
    await userEvent.click(screen.getByLabelText('운동 추가'))
    expect(screen.getByTestId('loc')).toHaveTextContent('/logs/new?date=2026-06-15')
  })

  it('캘린더 빈 날짜 탭 → 그 날짜로 추가', async () => {
    renderPage()
    await screen.findByRole('button', { name: '2026년 6월' })
    const cells = screen.getAllByRole('button').filter(
      (b) => b.className.startsWith('calendar__cell') && b.textContent === '20',
    )
    await userEvent.click(cells[0])
    expect(screen.getByTestId('loc')).toHaveTextContent('/logs/new?date=2026-06-20')
  })

  it('캘린더에서 기록 1개인 날 탭 → 상세로', async () => {
    const l = await routineLogsRepo.create({ title: 'x', date: '2026-06-12', status: 'completed' })
    renderPage()
    await screen.findByText('x')
    const cells = screen.getAllByRole('button').filter(
      (b) => b.className.startsWith('calendar__cell') && b.textContent === '12',
    )
    await userEvent.click(cells[0])
    expect(screen.getByTestId('loc')).toHaveTextContent(`/logs/${l.id}`)
  })

  it('기록 2개 이상인 날 탭 → 바텀시트', async () => {
    await routineLogsRepo.create({ title: '아침', date: '2026-06-12', time: '08:00', status: 'completed' })
    await routineLogsRepo.create({ title: '저녁', date: '2026-06-12', time: '20:00', status: 'completed' })
    renderPage()
    await screen.findByText('아침')
    const cells = screen.getAllByRole('button').filter(
      (b) => b.className.startsWith('calendar__cell') && b.textContent === '12',
    )
    await userEvent.click(cells[0])
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    // 시트 안에 두 기록 모두
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('아침')
    expect(dialog).toHaveTextContent('저녁')
  })
})
