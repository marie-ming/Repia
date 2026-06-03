import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ExerciseHistoryPage } from './ExerciseHistoryPage.tsx'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { routineLogsRepo } from '../db/repositories/routineLogs.ts'

function renderPage(id: string) {
  function PathProbe() {
    const loc = useLocation()
    return <div data-testid="loc">{loc.pathname}</div>
  }
  return render(
    <MemoryRouter initialEntries={[`/exercises/${id}/history`]}>
      <Routes>
        <Route path="/exercises/:id/history" element={<ExerciseHistoryPage />} />
        <Route path="*" element={<PathProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ExerciseHistoryPage', () => {
  it('기록 없으면 빈 상태', async () => {
    const ex = await exercisesRepo.create({ name: '데드리프트' })
    renderPage(ex.id)
    expect(await screen.findByText('기록이 없습니다')).toBeInTheDocument()
  })

  it('완료 기록 전체 + 요약(총 N회·최고) 표시', async () => {
    const ex = await exercisesRepo.create({ name: '데드리프트', metric: 'weight_reps' })
    await routineLogsRepo.create({
      title: 'A',
      date: '2026-06-01',
      status: 'completed',
      exercises: [{ exerciseId: ex.id, sets: [{ weight: 100, reps: 5 }] }],
    })
    await routineLogsRepo.create({
      title: 'B',
      date: '2026-06-03',
      status: 'completed',
      exercises: [{ exerciseId: ex.id, sets: [{ weight: 120, reps: 3 }] }],
    })
    // planned는 제외
    await routineLogsRepo.create({
      title: 'C',
      date: '2026-06-05',
      status: 'planned',
      exercises: [{ exerciseId: ex.id, sets: [{ weight: 200, reps: 1 }] }],
    })
    renderPage(ex.id)
    expect(await screen.findByText('총 2회 · 최고 120kg')).toBeInTheDocument()
    expect(screen.getByText('120kg × 3회')).toBeInTheDocument()
    expect(screen.getByText('100kg × 5회')).toBeInTheDocument()
  })

  it('항목 클릭 시 기록 상세로', async () => {
    const ex = await exercisesRepo.create({ name: '데드리프트' })
    const l = await routineLogsRepo.create({
      title: 'A',
      date: '2026-06-01',
      status: 'completed',
      exercises: [{ exerciseId: ex.id, sets: [{ weight: 100, reps: 5 }] }],
    })
    renderPage(ex.id)
    await userEvent.click(await screen.findByText('100kg × 5회'))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/logs/${l.id}`)
  })
})
