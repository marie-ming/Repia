import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { RoutineLogDetailPage } from './RoutineLogDetailPage.tsx'
import { ToastProvider } from '../components/Toast.tsx'
import { routineLogsRepo } from '../db/repositories/routineLogs.ts'
import { routineTemplatesRepo } from '../db/repositories/routineTemplates.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'

function renderPage(id: string) {
  function PathProbe() {
    const loc = useLocation()
    return <div data-testid="loc">{loc.pathname}{loc.search}</div>
  }
  return render(
    <MemoryRouter initialEntries={[`/logs/${id}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/logs/new" element={<PathProbe />} />
          <Route path="/logs/:id/edit" element={<PathProbe />} />
          <Route path="/logs/:id" element={<RoutineLogDetailPage />} />
          <Route path="*" element={<PathProbe />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

async function seedLog() {
  const ex = await exercisesRepo.create({ name: '데드리프트' })
  return routineLogsRepo.create({
    title: '하체 데이',
    date: '2026-06-10',
    time: '10:00',
    status: 'completed',
    exercises: [{ exerciseId: ex.id, sets: [{ weight: 100, reps: 5 }] }],
    memo: '컨디션 좋음',
  })
}

describe('RoutineLogDetailPage', () => {
  it('제목·메타·운동·메모 표시', async () => {
    const l = await seedLog()
    renderPage(l.id)
    expect(await screen.findByRole('heading', { name: '하체 데이' })).toBeInTheDocument()
    expect(screen.getByText(/2026.06.10/)).toBeInTheDocument()
    expect(screen.getByText('데드리프트')).toBeInTheDocument()
    expect(screen.getByText('컨디션 좋음')).toBeInTheDocument()
  })

  it('케밥 메뉴: 수정/이대로 기록 추가/루틴으로 저장/이미지로 공유/삭제', async () => {
    const l = await seedLog()
    renderPage(l.id)
    await userEvent.click(await screen.findByLabelText('더보기'))
    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByText('수정')).toBeInTheDocument()
    expect(within(sheet).getByText('이대로 기록 추가')).toBeInTheDocument()
    expect(within(sheet).getByText('루틴으로 저장')).toBeInTheDocument()
    expect(within(sheet).getByText('이미지로 공유')).toBeInTheDocument()
    expect(within(sheet).getByText('삭제')).toBeInTheDocument()
  })

  it('수정 → 편집 페이지', async () => {
    const l = await seedLog()
    renderPage(l.id)
    await userEvent.click(await screen.findByLabelText('더보기'))
    await userEvent.click(within(screen.getByRole('dialog')).getByText('수정'))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/logs/${l.id}/edit`)
  })

  it('이대로 기록 추가 → /logs/new?from=', async () => {
    const l = await seedLog()
    renderPage(l.id)
    await userEvent.click(await screen.findByLabelText('더보기'))
    await userEvent.click(within(screen.getByRole('dialog')).getByText('이대로 기록 추가'))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/logs/new?from=${l.id}`)
  })

  it('루틴으로 저장 → 템플릿 생성 + 토스트', async () => {
    const l = await seedLog()
    renderPage(l.id)
    await userEvent.click(await screen.findByLabelText('더보기'))
    await userEvent.click(within(screen.getByRole('dialog')).getByText('루틴으로 저장'))
    await waitFor(async () => {
      const tpls = await routineTemplatesRepo.findAll()
      expect(tpls).toHaveLength(1)
      expect(tpls[0].title).toBe('하체 데이')
      expect(tpls[0].exercises).toHaveLength(1)
    })
    expect(await screen.findByRole('status')).toHaveTextContent('루틴으로 저장되었습니다')
  })

  it('삭제 → 확인 → 삭제 후 홈', async () => {
    const l = await seedLog()
    renderPage(l.id)
    await userEvent.click(await screen.findByLabelText('더보기'))
    await userEvent.click(within(screen.getByRole('dialog')).getByText('삭제'))
    const confirm = await screen.findByRole('alertdialog')
    await userEvent.click(within(confirm).getByRole('button', { name: '삭제' }))
    await waitFor(async () => {
      expect(await routineLogsRepo.findById(l.id)).toBeUndefined()
    })
  })

  it('없는 id: 안내', async () => {
    renderPage('rtl_none')
    expect(await screen.findByText('기록을 찾을 수 없습니다')).toBeInTheDocument()
  })

  describe('어시스트 머신(보조 무게)', () => {
    // 직전 완료 기록 + 이번 기록을 만들어 배지/증감 화살표를 확인
    async function seedTwoLogs(assisted: boolean, prevW: number, curW: number) {
      const ex = await exercisesRepo.create({ name: `어시스트풀업${Math.random()}`, assisted })
      await routineLogsRepo.create({
        title: '지난 기록',
        date: '2026-06-01',
        time: '10:00',
        status: 'completed',
        exercises: [{ exerciseId: ex.id, sets: [{ weight: prevW, reps: 8 }] }],
      })
      const cur = await routineLogsRepo.create({
        title: '이번 기록',
        date: '2026-06-10',
        time: '10:00',
        status: 'completed',
        exercises: [{ exerciseId: ex.id, sets: [{ weight: curW, reps: 8 }] }],
      })
      return cur
    }

    it('보조가 줄면 "보조" 배지 + ▲(향상)', async () => {
      const l = await seedTwoLogs(true, 40, 30)
      renderPage(l.id)
      expect(await screen.findByText('보조 30kg')).toBeInTheDocument()
      expect(screen.getByText(/▲ 지난 40kg/)).toBeInTheDocument()
    })

    it('보조가 늘면 ▼(하락)', async () => {
      const l = await seedTwoLogs(true, 30, 45)
      renderPage(l.id)
      await screen.findByText('보조 45kg')
      expect(screen.getByText(/▼ 지난 30kg/)).toBeInTheDocument()
    })

    it('일반 운동은 그대로 "최고" + 무게가 늘어야 ▲', async () => {
      const l = await seedTwoLogs(false, 60, 80)
      renderPage(l.id)
      expect(await screen.findByText('최고 80kg')).toBeInTheDocument()
      expect(screen.getByText(/▲ 지난 60kg/)).toBeInTheDocument()
    })
  })

  describe('거리 + 시간 — 거리 우선, 같으면 더 빠른 시간', () => {
    async function seedRunLogs(prev: [number, number], cur: [number, number]) {
      const ex = await exercisesRepo.create({
        name: `러닝${Math.random()}`,
        metric: 'distance_time',
      })
      const set = ([km, s]: [number, number]) => [{ weight: 0, reps: 0, distance: km, seconds: s }]
      await routineLogsRepo.create({
        title: '지난 러닝',
        date: '2026-06-01',
        time: '10:00',
        status: 'completed',
        exercises: [{ exerciseId: ex.id, sets: set(prev) }],
      })
      return routineLogsRepo.create({
        title: '이번 러닝',
        date: '2026-06-10',
        time: '10:00',
        status: 'completed',
        exercises: [{ exerciseId: ex.id, sets: set(cur) }],
      })
    }

    it('거리와 시간을 함께 표시', async () => {
      const l = await seedRunLogs([5, 1800], [5, 1470])
      renderPage(l.id)
      expect(await screen.findByText('최고 5km 24:30')).toBeInTheDocument()
    })

    it('같은 거리를 더 빨리 뛰면 ▲', async () => {
      const l = await seedRunLogs([5, 1800], [5, 1470])
      renderPage(l.id)
      await screen.findByText('최고 5km 24:30')
      expect(screen.getByText(/▲ 지난 5km 30:00/)).toBeInTheDocument()
    })

    it('같은 거리를 더 느리게 뛰면 ▼', async () => {
      const l = await seedRunLogs([5, 1470], [5, 1800])
      renderPage(l.id)
      await screen.findByText('최고 5km 30:00')
      expect(screen.getByText(/▼ 지난 5km 24:30/)).toBeInTheDocument()
    })

    it('느려도 더 멀리 뛰었으면 ▲', async () => {
      // 3km 15분(5:00/km) → 5km 30분(6:00/km): 페이스는 느려졌지만 거리가 늘어 향상
      const l = await seedRunLogs([3, 900], [5, 1800])
      renderPage(l.id)
      await screen.findByText('최고 5km 30:00')
      expect(screen.getByText(/▲ 지난 3km 15:00/)).toBeInTheDocument()
    })
  })
})
