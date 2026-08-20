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
import { exercisesRepo } from '../db/repositories/exercises.ts'

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

// 어느 부위를 빠뜨렸는지 알아채기 위한 요약. 오늘(2026-06-15) 기준 최근 4주.
describe('최근 4주 부위 요약', () => {
  it('기록이 없으면 줄 자체가 안 나온다 (빈 앱에 잔소리 금지)', async () => {
    renderPage()
    await screen.findByText('이번 달 기록이 없습니다.')
    expect(document.querySelector('.balance-bar')).toBeNull()
  })

  it('완료 기록이 있으면 횟수와 많이 한 부위를 보여준다', async () => {
    const back = await exercisesRepo.create({ name: '풀업', categories: ['back'] })
    const chest = await exercisesRepo.create({ name: '벤치', categories: ['chest'] })
    await routineLogsRepo.create({
      title: '등',
      date: '2026-06-14',
      status: 'completed',
      exercises: [{ exerciseId: back.id, sets: [{ weight: 0, reps: 10 }] }],
    })
    await routineLogsRepo.create({
      title: '등2',
      date: '2026-06-12',
      status: 'completed',
      exercises: [{ exerciseId: back.id, sets: [{ weight: 0, reps: 10 }] }],
    })
    await routineLogsRepo.create({
      title: '가슴',
      date: '2026-06-10',
      status: 'completed',
      exercises: [{ exerciseId: chest.id, sets: [{ weight: 60, reps: 8 }] }],
    })

    renderPage()

    const bar = await waitFor(() => {
      const el = document.querySelector('.balance-bar')
      expect(el).not.toBeNull()
      return el!
    })
    expect(bar.textContent).toContain('최근 4주')
    expect(bar.textContent).toContain('3회')
    expect(bar.textContent).toContain('등 2')
    expect(bar.textContent).toContain('가슴 1')
  })

  it('탭하면 부위별 막대가 열리고 안 한 부위도 0으로 보인다', async () => {
    const back = await exercisesRepo.create({ name: '풀업2', categories: ['back'] })
    await routineLogsRepo.create({
      title: '등',
      date: '2026-06-14',
      status: 'completed',
      exercises: [{ exerciseId: back.id, sets: [{ weight: 0, reps: 10 }] }],
    })

    renderPage()
    const bar = await waitFor(() => {
      const el = document.querySelector('.balance-bar')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    await userEvent.click(bar)

    expect(await screen.findByText('최근 4주 부위')).toBeInTheDocument()
    const rows = [...document.querySelectorAll('.balance-row')].map((r) => r.textContent)
    expect(rows[0]).toBe('등1')
    // 빠뜨린 부위를 보려는 기능이라 0도 함께 나온다
    expect(rows).toContain('어깨0')
  })

  it('완료가 아닌 기록은 세지 않는다', async () => {
    const back = await exercisesRepo.create({ name: '풀업3', categories: ['back'] })
    await routineLogsRepo.create({
      title: '계획만',
      date: '2026-06-14',
      status: 'planned',
      exercises: [{ exerciseId: back.id, sets: [{ weight: 0, reps: 10 }] }],
    })

    renderPage()
    await screen.findByText('계획만')
    expect(document.querySelector('.balance-bar')).toBeNull()
  })
})

// 오늘은 2026-06-15로 고정돼 있다.
// 4주 창 = 05-19 ~ 06-15. 캘린더가 읽는 6주 그리드 = 05-31 ~ 07-11.
// 두 범위가 다르므로, 부위 집계가 캘린더용 데이터를 쓰면 05-19~05-30 기록을 놓친다.
describe('부위 요약의 4주 창', () => {
  async function seedAt(date: string, name: string) {
    const ex = await exercisesRepo.create({ name, categories: ['back'] })
    await routineLogsRepo.create({
      title: `기록 ${date}`,
      date,
      status: 'completed',
      exercises: [{ exerciseId: ex.id, sets: [{ weight: 0, reps: 10 }] }],
    })
  }

  const barText = async () => {
    renderPage()
    const bar = await waitFor(() => {
      const el = document.querySelector('.balance-bar')
      expect(el).not.toBeNull()
      return el!
    })
    return bar.textContent ?? ''
  }

  // 캘린더 그리드(05-31~)보다 이른 날이라, 캘린더용 데이터를 쓰면 안 잡힌다
  it('캘린더가 안 읽는 기간의 기록도 센다', async () => {
    await seedAt('2026-05-20', '오래된등')
    expect(await barText()).toContain('1회')
  })

  it('창의 첫날(오늘-27일)은 센다', async () => {
    await seedAt('2026-05-19', '경계안')
    expect(await barText()).toContain('1회')
  })

  it('창보다 하루 이른 기록은 세지 않는다', async () => {
    await seedAt('2026-05-18', '경계밖')
    renderPage()
    await screen.findByText('이번 달 기록이 없습니다.')
    expect(document.querySelector('.balance-bar')).toBeNull()
  })

  it('다른 달로 넘겨봐도 집계는 그대로다 (오늘 기준이라)', async () => {
    await seedAt('2026-05-20', '오래된등2')
    const before = await barText()

    await userEvent.click(screen.getByRole('button', { name: '이전 달' }))

    await waitFor(() => {
      expect(document.querySelector('.balance-bar')?.textContent).toBe(before)
    })
  })
})

