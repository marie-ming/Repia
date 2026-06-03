import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { RoutineTemplateFormPage } from './RoutineTemplateFormPage.tsx'
import { ToastProvider } from '../components/Toast.tsx'
import { routineTemplatesRepo } from '../db/repositories/routineTemplates.ts'

function renderForm(path: string) {
  function PathProbe() {
    const loc = useLocation()
    return <div data-testid="loc">{loc.pathname}</div>
  }
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <Routes>
          <Route path="/routines/new" element={<RoutineTemplateFormPage />} />
          <Route path="/routines/:id/edit" element={<RoutineTemplateFormPage />} />
          <Route path="*" element={<PathProbe />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('RoutineTemplateFormPage', () => {
  it('신규: 제목 없으면 저장 비활성, 입력 시 활성', async () => {
    renderForm('/routines/new')
    expect(await screen.findByRole('heading', { name: '루틴 추가' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
    await userEvent.type(screen.getByPlaceholderText(/제목 입력/), '상체 루틴')
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled()
  })

  it('저장 시 템플릿 생성', async () => {
    renderForm('/routines/new')
    await userEvent.type(await screen.findByPlaceholderText(/제목 입력/), '풀바디')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(async () => {
      const all = await routineTemplatesRepo.findAll()
      expect(all).toHaveLength(1)
      expect(all[0].title).toBe('풀바디')
    })
  })

  it('수정: 기존 값 프리필 + 변경 전 저장 비활성', async () => {
    const t = await routineTemplatesRepo.create({ title: '기존 루틴' })
    renderForm(`/routines/${t.id}/edit`)
    expect(await screen.findByDisplayValue('기존 루틴')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })
})
