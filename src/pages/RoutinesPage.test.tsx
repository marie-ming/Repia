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
})
