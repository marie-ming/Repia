import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ExerciseDetailPage } from './ExerciseDetailPage.tsx'
import { exercisesRepo } from '../db/repositories/exercises.ts'

function renderPage(id: string) {
  function PathProbe() {
    const loc = useLocation()
    return <div data-testid="loc">{loc.pathname}</div>
  }
  return render(
    <MemoryRouter initialEntries={[`/exercises/${id}`]}>
      <Routes>
        <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
        <Route path="*" element={<PathProbe />} />
      </Routes>
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

  it('수정 버튼 → /exercises/:id/edit', async () => {
    const ex = await exercisesRepo.create({ name: '운동' })
    renderPage(ex.id)
    await userEvent.click(await screen.findByRole('button', { name: '수정' }))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/exercises/${ex.id}/edit`)
  })

  it('없는 id: 안내 표시', async () => {
    renderPage('ex_none')
    expect(await screen.findByText('운동을 찾을 수 없습니다')).toBeInTheDocument()
  })
})
