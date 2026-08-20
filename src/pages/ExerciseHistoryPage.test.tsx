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
    expect(await screen.findByText('총 2회 · 최고 120kg×3')).toBeInTheDocument()
    // 같은 값이 추이 그래프에도 나오므로 목록 칩으로 좁힌다
    const chips = document.querySelectorAll('.exrec-chip')
    expect([...chips].map((c) => c.textContent)).toEqual(['120kg×3', '100kg×5'])
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
    await userEvent.click(await screen.findByText('100kg×5'))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/logs/${l.id}`)
  })
})

// 기록은 계속 쌓이는데 목록으로만 보여줘서 몇 달에 걸쳐 늘었는지 볼 방법이 없었다
describe('기록 추이 그래프', () => {
  async function seed(ex: string, rows: [string, number, number][]) {
    for (const [date, weight, reps] of rows) {
      await routineLogsRepo.create({
        title: date,
        date,
        status: 'completed',
        exercises: [{ exerciseId: ex, sets: [{ weight, reps }] }],
      })
    }
  }

  it('기록이 2개 이상이면 그래프를 그린다', async () => {
    const ex = await exercisesRepo.create({ name: '벤치', metric: 'weight_reps' })
    await seed(ex.id, [
      ['2026-06-01', 60, 8],
      ['2026-06-08', 70, 8],
    ])
    renderPage(ex.id)

    expect(await screen.findByText('최고 무게 추이')).toBeInTheDocument()
    expect(document.querySelector('.progress-chart__line')).toBeTruthy()
  })

  it('기록이 하나뿐이면 그래프가 없다 (추이가 아니다)', async () => {
    const ex = await exercisesRepo.create({ name: '벤치1', metric: 'weight_reps' })
    await seed(ex.id, [['2026-06-01', 60, 8]])
    renderPage(ex.id)

    await screen.findByText(/총 1회/)
    expect(screen.queryByText('최고 무게 추이')).not.toBeInTheDocument()
  })

  it('오래된 것 → 최신 순으로 그린다 (최신 값이 오른쪽 끝)', async () => {
    const ex = await exercisesRepo.create({ name: '벤치2', metric: 'weight_reps' })
    await seed(ex.id, [
      ['2026-06-01', 60, 8],
      ['2026-06-08', 80, 8],
    ])
    renderPage(ex.id)
    await screen.findByText('최고 무게 추이')

    // 최신(80kg)이 위 = y가 더 작다
    const pts = document
      .querySelector('.progress-chart__line')!
      .getAttribute('points')!
      .split(' ')
      .map((p) => Number(p.split(',')[1]))
    expect(pts[1]).toBeLessThan(pts[0])
    expect(document.querySelector('.progress-chart__latest')?.textContent).toBe('80kg×8')
  })

  it('맨몸 운동(무게 0)은 횟수로 그린다', async () => {
    const ex = await exercisesRepo.create({ name: '풀업그래프', metric: 'weight_reps' })
    await seed(ex.id, [
      ['2026-06-01', 0, 8],
      ['2026-06-08', 0, 12],
    ])
    renderPage(ex.id)

    expect(await screen.findByText('최고 횟수 추이')).toBeInTheDocument()
  })

  it('보조 무게는 적을수록 위로 그리고 그 사실을 알려준다', async () => {
    const ex = await exercisesRepo.create({
      name: '어시스트그래프',
      metric: 'weight_reps',
      assisted: true,
    })
    await seed(ex.id, [
      ['2026-06-01', 40, 8],
      ['2026-06-08', 30, 8],
    ])
    renderPage(ex.id)
    expect(await screen.findByText('보조 무게 추이 (적을수록 위)')).toBeInTheDocument()

    const pts = document
      .querySelector('.progress-chart__line')!
      .getAttribute('points')!
      .split(' ')
      .map((p) => Number(p.split(',')[1]))
    // 보조 30(향상)이 위 = y가 더 작다
    expect(pts[1]).toBeLessThan(pts[0])
  })

  it('값을 안 채운 기록은 점으로 찍지 않는다', async () => {
    const ex = await exercisesRepo.create({ name: '스쿼트그래프', metric: 'weight_reps' })
    await seed(ex.id, [
      ['2026-06-01', 60, 8],
      ['2026-06-05', 0, 0],
      ['2026-06-08', 70, 8],
    ])
    renderPage(ex.id)
    await screen.findByText('최고 무게 추이')

    const pts = document.querySelector('.progress-chart__line')!.getAttribute('points')!.split(' ')
    expect(pts).toHaveLength(2)
  })
})

