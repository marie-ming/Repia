import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

  describe('사진 꾹 눌러 원본 보기', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('꾹 누르면(450ms) 원본 사진 팝업 표시, 배경 클릭으로 닫힘', async () => {
      const ex = await exercisesRepo.create({ name: '사진운동', photos: ['data:image/png;base64,ABC'] })
      renderPage(ex.id)
      const photo = await screen.findByAltText('사진운동 사진 1')

      fireEvent.pointerDown(photo, { clientX: 10, clientY: 10 })
      act(() => {
        vi.advanceTimersByTime(450)
      })

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByAltText('원본 사진')).toBeInTheDocument()

      fireEvent.click(dialog)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('사진 여러 장: 두 번째 사진을 꾹 누르면 그 사진부터 열림(스와이프로 이동 가능한 캐러셀)', async () => {
      const ex = await exercisesRepo.create({
        name: '멀티사진',
        photos: ['data:image/png;base64,FIRST', 'data:image/png;base64,SECOND'],
      })
      renderPage(ex.id)
      const secondPhoto = await screen.findByAltText('멀티사진 사진 2')

      fireEvent.pointerDown(secondPhoto, { clientX: 10, clientY: 10 })
      act(() => {
        vi.advanceTimersByTime(450)
      })

      const dialog = await screen.findByRole('dialog')
      const lightboxImgs = within(dialog).getAllByAltText('원본 사진') as HTMLImageElement[]
      expect(lightboxImgs).toHaveLength(2) // 팝업 안에서도 스와이프 가능하도록 전체 사진이 캐러셀로 렌더링됨
      expect(lightboxImgs[1].src).toContain('SECOND')
    })

    it('짧게 탭하면(누른 후 바로 뗌) 팝업이 뜨지 않음', async () => {
      const ex = await exercisesRepo.create({ name: '사진운동2', photos: ['data:image/png;base64,ABC'] })
      renderPage(ex.id)
      const photo = await screen.findByAltText('사진운동2 사진 1')

      fireEvent.pointerDown(photo, { clientX: 10, clientY: 10 })
      fireEvent.pointerUp(photo)
      act(() => {
        vi.advanceTimersByTime(450)
      })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('누른 채 크게 움직이면(스와이프) 팝업이 뜨지 않음', async () => {
      const ex = await exercisesRepo.create({ name: '사진운동3', photos: ['data:image/png;base64,ABC'] })
      renderPage(ex.id)
      const photo = await screen.findByAltText('사진운동3 사진 1')

      fireEvent.pointerDown(photo, { clientX: 10, clientY: 10 })
      fireEvent.pointerMove(photo, { clientX: 80, clientY: 10 })
      act(() => {
        vi.advanceTimersByTime(450)
      })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
