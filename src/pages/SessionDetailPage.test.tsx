import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { SessionDetailPage } from './SessionDetailPage.tsx'
import { sessionsRepo } from '../db/repositories/sessions.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'

function renderPage(id: string) {
  function PathProbe() {
    const loc = useLocation()
    return <div data-testid="loc">{loc.pathname}</div>
  }
  return render(
    <MemoryRouter initialEntries={[`/sessions/${id}`]}>
      <Routes>
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
        <Route path="*" element={<PathProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SessionDetailPage', () => {
  it('수업 메타 표시', async () => {
    const s = await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: '홍길동',
      date: '2026-06-10',
      time: '10:30',
      status: 'reserved',
      memo: '인터벌 위주',
    })
    renderPage(s.id)
    expect(await screen.findByRole('button', { name: '홍길동' })).toBeInTheDocument()
    expect(screen.getByText(/2026.06.10/)).toBeInTheDocument()
    expect(screen.getByText(/10:30/)).toBeInTheDocument()
    expect(screen.getByText('예약')).toBeInTheDocument()
    expect(screen.getByText('인터벌 위주')).toBeInTheDocument()
  })

  it('루틴 없을 때 "기록된 운동이 없습니다"', async () => {
    const s = await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: '홍길동',
      date: '2026-06-10',
    })
    renderPage(s.id)
    expect(await screen.findByText('기록된 운동이 없습니다.')).toBeInTheDocument()
  })

  it('루틴 운동 + 세트 표시', async () => {
    const ex = await exercisesRepo.create({ name: '데드리프트' })
    const s = await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: '홍길동',
      date: '2026-06-10',
      routine: [
        {
          exerciseId: ex.id,
          sets: [
            { weight: 80, reps: 10 },
            { weight: 100, reps: 8 },
          ],
        },
      ],
    })
    renderPage(s.id)
    expect(await screen.findByText('데드리프트')).toBeInTheDocument()
    const setVals = document.querySelectorAll('.routine-readonly__set-val')
    expect(setVals).toHaveLength(2)
    expect(setVals[0].textContent?.replace(/\s+/g, ' ')).toContain('80')
    expect(setVals[0].textContent?.replace(/\s+/g, ' ')).toMatch(/10\s*회/)
    expect(setVals[1].textContent?.replace(/\s+/g, ' ')).toContain('100')
    expect(setVals[1].textContent?.replace(/\s+/g, ' ')).toMatch(/8\s*회/)
  })

  it('삭제된 운동: "(삭제된 운동)"', async () => {
    const s = await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: 'x',
      date: '2026-06-10',
      routine: [{ exerciseId: 'ex_gone', sets: [{ weight: 1, reps: 1 }] }],
    })
    renderPage(s.id)
    expect(await screen.findByText('(삭제된 운동)')).toBeInTheDocument()
  })

  it('운동 카드 화살표 클릭 시 /exercises/:id로 이동', async () => {
    const ex = await exercisesRepo.create({ name: '데드리프트' })
    const s = await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: 'x',
      date: '2026-06-10',
      routine: [{ exerciseId: ex.id, sets: [{ weight: 1, reps: 1 }] }],
    })
    renderPage(s.id)
    await screen.findByText('데드리프트')
    await userEvent.click(screen.getByLabelText('운동 상세 보기'))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/exercises/${ex.id}`)
  })

  it('수정 버튼 → /sessions/:id/edit', async () => {
    const s = await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: 'x',
      date: '2026-06-10',
    })
    renderPage(s.id)
    await userEvent.click(await screen.findByRole('button', { name: '수정' }))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/sessions/${s.id}/edit`)
  })

  it('회원 이름 클릭 시 /members/:memberId로 이동', async () => {
    const s = await sessionsRepo.create({
      memberId: 'm_42',
      memberNameSnapshot: '홍길동',
      date: '2026-06-10',
    })
    renderPage(s.id)
    await userEvent.click(await screen.findByRole('button', { name: '홍길동' }))
    expect(screen.getByTestId('loc')).toHaveTextContent('/members/m_42')
  })

  it('없는 id: 안내 표시', async () => {
    renderPage('ses_none')
    expect(await screen.findByText('수업을 찾을 수 없습니다')).toBeInTheDocument()
  })
})
