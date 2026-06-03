import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { RoutinesPage } from './RoutinesPage.tsx'
import { routineTemplatesRepo } from '../db/repositories/routineTemplates.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'

function renderPage() {
  function PathProbe() {
    const loc = useLocation()
    return <div data-testid="loc">{loc.pathname}</div>
  }
  return render(
    <MemoryRouter initialEntries={['/routines']}>
      <Routes>
        <Route path="/routines" element={<RoutinesPage />} />
        <Route path="*" element={<PathProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RoutinesPage', () => {
  it('루틴 없으면 빈 상태', async () => {
    renderPage()
    expect(await screen.findByText('저장된 루틴이 없습니다')).toBeInTheDocument()
  })

  it('루틴 목록 + 운동 이름 표시', async () => {
    const ex = await exercisesRepo.create({ name: '데드리프트' })
    await routineTemplatesRepo.create({
      title: '하체 루틴',
      exercises: [{ exerciseId: ex.id, sets: [{ weight: 100, reps: 5 }] }],
    })
    renderPage()
    expect(await screen.findByText('하체 루틴')).toBeInTheDocument()
    expect(screen.getByText('데드리프트')).toBeInTheDocument()
  })

  it('카드 클릭 시 루틴 상세로', async () => {
    const t = await routineTemplatesRepo.create({ title: 'x' })
    renderPage()
    await userEvent.click(await screen.findByText('x'))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/routines/${t.id}`)
  })

  it('FAB → 루틴 추가', async () => {
    renderPage()
    await screen.findByText('저장된 루틴이 없습니다')
    await userEvent.click(screen.getByLabelText('루틴 추가'))
    expect(screen.getByTestId('loc')).toHaveTextContent('/routines/new')
  })

  it('카테고리 필터: 사용된 카테고리 칩만 노출 + 필터링', async () => {
    await routineTemplatesRepo.create({ title: '하체 루틴', categories: ['lower'] })
    await routineTemplatesRepo.create({ title: '상체 루틴', categories: ['upper'] })
    renderPage()
    await screen.findByText('하체 루틴')
    // 사용된 카테고리(하체/상체)만 칩으로 노출, 안 쓰인 '등'은 없음
    expect(screen.getByRole('button', { name: '하체' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '등' })).not.toBeInTheDocument()
    // 하체 필터 → 상체 루틴 숨김
    await userEvent.click(screen.getByRole('button', { name: '하체' }))
    expect(screen.getByText('하체 루틴')).toBeInTheDocument()
    expect(screen.queryByText('상체 루틴')).not.toBeInTheDocument()
  })

  it('카테고리 배지 표시', async () => {
    await routineTemplatesRepo.create({ title: 'x', categories: ['lower', 'core'] })
    renderPage()
    await screen.findByText('x')
    const card = document.querySelector('.log-card__titlerow')!
    expect(card.textContent).toContain('하체')
    expect(card.textContent).toContain('코어')
  })
})
