import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ExerciseDetailPage } from './ExerciseDetailPage.tsx'
import { ModeContext } from '../components/ModeContext.tsx'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import type { Mode } from '../db/types.ts'

function renderPage(id: string, mode: Mode = 'trainer') {
  function PathProbe() {
    const loc = useLocation()
    return <div data-testid="loc">{loc.pathname}</div>
  }
  return render(
    <MemoryRouter initialEntries={[`/exercises/${id}`]}>
      <ModeContext.Provider value={{ mode, setMode: async () => {} }}>
        <Routes>
          <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
          <Route path="*" element={<PathProbe />} />
        </Routes>
      </ModeContext.Provider>
    </MemoryRouter>,
  )
}

describe('ExerciseDetailPage', () => {
  it('운동 정보 표시', async () => {
    const ex = await exercisesRepo.create({
      name: '데드리프트',
      categories: ['back', 'lower'],
      equipment: 'barbell',
      grip: '오버핸드',
      description: '주의사항',
    })
    renderPage(ex.id)
    expect(await screen.findByRole('heading', { name: '데드리프트' })).toBeInTheDocument()
    expect(screen.getByText('등')).toBeInTheDocument()
    expect(screen.getByText('하체')).toBeInTheDocument()
    expect(screen.getByText('바벨')).toBeInTheDocument()
    expect(screen.getByText('오버핸드')).toBeInTheDocument()
    expect(screen.getByText('주의사항')).toBeInTheDocument()
  })

  it('빈 필드는 "-"로 표시', async () => {
    const ex = await exercisesRepo.create({ name: '운동' })
    renderPage(ex.id)
    await screen.findByRole('heading', { name: '운동' })
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(3) // 카테고리/장비/그립 모두 비어있음
  })

  it('사진 없으면 빈 thumb (💪) 표시', async () => {
    const ex = await exercisesRepo.create({ name: '운동' })
    renderPage(ex.id)
    expect(await screen.findByText('💪')).toBeInTheDocument()
  })

  it('케밥 → 수정 → /exercises/:id/edit', async () => {
    const ex = await exercisesRepo.create({ name: '운동' })
    renderPage(ex.id)
    await userEvent.click(await screen.findByLabelText('더보기'))
    await userEvent.click(within(screen.getByRole('dialog')).getByText('수정'))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/exercises/${ex.id}/edit`)
  })

  it('개인 모드: 해당 운동의 최근 기록 표시', async () => {
    const { sessionsRepo } = await import('../db/repositories/sessions.ts')
    const { routineLogsRepo } = await import('../db/repositories/routineLogs.ts')
    const ex = await exercisesRepo.create({ name: '데드리프트' })
    await routineLogsRepo.create({
      title: '하체 데이',
      date: '2026-06-01',
      status: 'completed',
      exercises: [{ exerciseId: ex.id, sets: [{ weight: 100, reps: 5 }] }],
    })
    // 다른 운동만 있는 기록은 제외되어야 함
    await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: 'x',
      date: '2026-06-02',
    })
    renderPage(ex.id, 'personal')
    expect(await screen.findByText('최근 기록')).toBeInTheDocument()
    expect(screen.getByText('100kg×5')).toBeInTheDocument()
  })

  it('케밥 → 삭제 → 확인 → 삭제 완료', async () => {
    const ex = await exercisesRepo.create({ name: '삭제할' })
    renderPage(ex.id)
    await userEvent.click(await screen.findByLabelText('더보기'))
    await userEvent.click(within(screen.getByRole('dialog')).getByText('삭제'))
    const confirm = await screen.findByRole('alertdialog')
    await userEvent.click(within(confirm).getByRole('button', { name: '삭제' }))
    await waitFor(async () => {
      expect(await exercisesRepo.findById(ex.id)).toBeUndefined()
    })
  })

  it('케밥 → 삭제: 사용 중이면 blocked 안내', async () => {
    const { sessionsRepo } = await import('../db/repositories/sessions.ts')
    const ex = await exercisesRepo.create({ name: '사용중' })
    await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: 'x',
      date: '2026-06-01',
      routine: [{ exerciseId: ex.id, sets: [{ weight: 0, reps: 1 }] }],
    })
    renderPage(ex.id)
    await userEvent.click(await screen.findByLabelText('더보기'))
    await userEvent.click(within(screen.getByRole('dialog')).getByText('삭제'))
    const confirm = await screen.findByRole('alertdialog')
    await userEvent.click(within(confirm).getByRole('button', { name: '삭제' }))
    await waitFor(() => {
      expect(screen.getByText(/사용 중/)).toBeInTheDocument()
    })
    expect(await exercisesRepo.findById(ex.id)).toBeDefined()
  })

  it('없는 id: 안내 표시', async () => {
    renderPage('ex_none')
    expect(await screen.findByText('운동을 찾을 수 없습니다')).toBeInTheDocument()
  })
})
