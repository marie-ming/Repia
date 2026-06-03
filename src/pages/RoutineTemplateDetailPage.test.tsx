import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { RoutineTemplateDetailPage } from './RoutineTemplateDetailPage.tsx'
import { ToastProvider } from '../components/Toast.tsx'
import { routineTemplatesRepo } from '../db/repositories/routineTemplates.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'

function renderPage(id: string) {
  function PathProbe() {
    const loc = useLocation()
    return <div data-testid="loc">{loc.pathname}{loc.search}</div>
  }
  return render(
    <MemoryRouter initialEntries={[`/routines/${id}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/routines/new" element={<PathProbe />} />
          <Route path="/routines/:id/edit" element={<PathProbe />} />
          <Route path="/routines/:id" element={<RoutineTemplateDetailPage />} />
          <Route path="/logs/new" element={<PathProbe />} />
          <Route path="*" element={<PathProbe />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

async function seedTemplate() {
  const ex = await exercisesRepo.create({ name: '데드리프트' })
  return routineTemplatesRepo.create({
    title: '하체 루틴',
    exercises: [{ exerciseId: ex.id, sets: [{ weight: 100, reps: 5 }] }],
    memo: '주 1회',
  })
}

describe('RoutineTemplateDetailPage', () => {
  it('제목·운동·메모 표시', async () => {
    const t = await seedTemplate()
    renderPage(t.id)
    expect(await screen.findByRole('heading', { name: '하체 루틴' })).toBeInTheDocument()
    expect(screen.getByText('데드리프트')).toBeInTheDocument()
    expect(screen.getByText('주 1회')).toBeInTheDocument()
  })

  it('이 루틴으로 기록 시작 → /logs/new?fromTemplate=', async () => {
    const t = await seedTemplate()
    renderPage(t.id)
    await userEvent.click(await screen.findByRole('button', { name: '이 루틴으로 기록 시작' }))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/logs/new?fromTemplate=${t.id}`)
  })

  it('케밥 → 수정 이동', async () => {
    const t = await seedTemplate()
    renderPage(t.id)
    await userEvent.click(await screen.findByLabelText('더보기'))
    await userEvent.click(within(screen.getByRole('dialog')).getByText('수정'))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/routines/${t.id}/edit`)
  })

  it('케밥 → 삭제 → 확인 → 삭제', async () => {
    const t = await seedTemplate()
    renderPage(t.id)
    await userEvent.click(await screen.findByLabelText('더보기'))
    await userEvent.click(within(screen.getByRole('dialog')).getByText('삭제'))
    const confirm = await screen.findByRole('alertdialog')
    await userEvent.click(within(confirm).getByRole('button', { name: '삭제' }))
    await waitFor(async () => {
      expect(await routineTemplatesRepo.findById(t.id)).toBeUndefined()
    })
  })

  it('없는 id: 안내', async () => {
    renderPage('rtt_none')
    expect(await screen.findByText('루틴을 찾을 수 없습니다')).toBeInTheDocument()
  })
})
