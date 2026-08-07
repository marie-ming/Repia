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

  it('케밥 → 수정 → /sessions/:id/edit', async () => {
    const s = await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: 'x',
      date: '2026-06-10',
    })
    renderPage(s.id)
    await userEvent.click(await screen.findByLabelText('더보기'))
    await userEvent.click(screen.getByRole('button', { name: '수정' }))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/sessions/${s.id}/edit`)
  })

  it('케밥에 "이미지로 공유" 노출', async () => {
    const ex = await exercisesRepo.create({ name: '벤치' })
    const s = await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: 'x',
      date: '2026-06-10',
      routine: [{ exerciseId: ex.id, sets: [{ weight: 60, reps: 10 }] }],
    })
    renderPage(s.id)
    await userEvent.click(await screen.findByLabelText('더보기'))
    expect(screen.getByRole('button', { name: '이미지로 공유' })).toBeInTheDocument()
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

  describe('회원 진척 (지난 수업 대비)', () => {
    // 같은 회원의 직전 완료 수업과 비교해 운동명 옆에 배지를 보여준다
    async function seedTwoSessions(
      prevW: number,
      curW: number,
      opts: { assisted?: boolean; prevMemberId?: string } = {},
    ) {
      const ex = await exercisesRepo.create({
        name: `벤치${Math.random()}`,
        assisted: opts.assisted,
      })
      await sessionsRepo.create({
        memberId: opts.prevMemberId ?? 'm1',
        memberNameSnapshot: '홍길동',
        date: '2026-06-01',
        time: '10:00',
        status: 'completed',
        routine: [{ exerciseId: ex.id, sets: [{ weight: prevW, reps: 8 }] }],
      })
      const cur = await sessionsRepo.create({
        memberId: 'm1',
        memberNameSnapshot: '홍길동',
        date: '2026-06-10',
        time: '10:00',
        status: 'completed',
        routine: [{ exerciseId: ex.id, sets: [{ weight: curW, reps: 8 }] }],
      })
      return cur
    }

    it('무게가 늘면 "최고" 배지 + ▲', async () => {
      const s = await seedTwoSessions(60, 80)
      renderPage(s.id)
      expect(await screen.findByText('최고 80kg')).toBeInTheDocument()
      expect(screen.getByText(/▲ 지난 60kg/)).toBeInTheDocument()
    })

    it('무게가 줄면 ▼', async () => {
      const s = await seedTwoSessions(80, 60)
      renderPage(s.id)
      await screen.findByText('최고 60kg')
      expect(screen.getByText(/▼ 지난 80kg/)).toBeInTheDocument()
    })

    it('보조 무게 운동은 보조가 줄어야 ▲', async () => {
      const s = await seedTwoSessions(40, 30, { assisted: true })
      renderPage(s.id)
      expect(await screen.findByText('보조 30kg')).toBeInTheDocument()
      expect(screen.getByText(/▲ 지난 40kg/)).toBeInTheDocument()
    })

    it('다른 회원의 수업과는 비교하지 않는다', async () => {
      const s = await seedTwoSessions(60, 80, { prevMemberId: 'm2' })
      renderPage(s.id)
      expect(await screen.findByText('최고 80kg')).toBeInTheDocument()
      expect(screen.queryByText(/지난/)).not.toBeInTheDocument()
    })

    it('이전 수업이 없으면 배지만 나오고 증감은 없다', async () => {
      const ex = await exercisesRepo.create({ name: '첫수업운동' })
      const s = await sessionsRepo.create({
        memberId: 'm1',
        memberNameSnapshot: '홍길동',
        date: '2026-06-10',
        status: 'completed',
        routine: [{ exerciseId: ex.id, sets: [{ weight: 50, reps: 10 }] }],
      })
      renderPage(s.id)
      expect(await screen.findByText('최고 50kg')).toBeInTheDocument()
      expect(screen.queryByText(/지난/)).not.toBeInTheDocument()
    })
  })
})
