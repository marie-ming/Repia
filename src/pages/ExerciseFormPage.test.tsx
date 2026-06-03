import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ExerciseFormPage } from './ExerciseFormPage.tsx'
import { ToastProvider } from '../components/Toast.tsx'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { sessionsRepo } from '../db/repositories/sessions.ts'

function renderForm(initialPath: string) {
  function PathProbe() {
    const loc = useLocation()
    return <div data-testid="loc">{loc.pathname}</div>
  }
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ToastProvider>
        <Routes>
          <Route path="/exercises/new" element={<ExerciseFormPage />} />
          <Route path="/exercises/:id/edit" element={<ExerciseFormPage />} />
          <Route path="*" element={<PathProbe />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('ExerciseFormPage — 신규', () => {
  it('타이틀이 "운동 추가" + 저장 비활성', () => {
    renderForm('/exercises/new')
    expect(screen.getByRole('heading', { name: '운동 추가' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('이름 입력 시 저장 활성', async () => {
    renderForm('/exercises/new')
    await userEvent.type(screen.getByPlaceholderText('운동 입력'), '데드리프트')
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled()
  })

  it('저장 시 운동 생성 + /exercises로 이동 + 토스트', async () => {
    renderForm('/exercises/new')
    await userEvent.type(screen.getByPlaceholderText('운동 입력'), '신규 운동')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => {
      expect(screen.getByTestId('loc')).toHaveTextContent('/exercises')
    })
    const all = await exercisesRepo.findAll()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('신규 운동')
    expect(screen.getByRole('status')).toHaveTextContent('운동이 추가되었습니다')
  })

  it('카테고리 최대 3개까지 선택, 4번째는 disabled', async () => {
    renderForm('/exercises/new')
    await userEvent.click(screen.getByRole('button', { name: '상체' }))
    await userEvent.click(screen.getByRole('button', { name: '하체' }))
    await userEvent.click(screen.getByRole('button', { name: '등' }))
    expect(screen.getByRole('button', { name: '어깨' })).toHaveClass('chip--disabled')
    // 토글: 상체 해제하면 다시 어깨 선택 가능
    await userEvent.click(screen.getByRole('button', { name: '상체' }))
    expect(screen.getByRole('button', { name: '어깨' })).not.toHaveClass('chip--disabled')
  })

  it('삭제 버튼 없음 (삭제는 상세 케밥에서)', () => {
    renderForm('/exercises/new')
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
  })
})

describe('ExerciseFormPage — 수정', () => {
  it('기존 값으로 채워짐 + 변경 전엔 저장 비활성', async () => {
    const ex = await exercisesRepo.create({
      name: '데드리프트',
      categories: ['back'],
      equipment: 'barbell',
    })
    renderForm(`/exercises/${ex.id}/edit`)
    await screen.findByDisplayValue('데드리프트')
    expect(screen.getByRole('heading', { name: '운동 수정' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('변경 후 저장 → 업데이트 + 토스트', async () => {
    const ex = await exercisesRepo.create({ name: 'orig' })
    renderForm(`/exercises/${ex.id}/edit`)
    const nameInput = await screen.findByDisplayValue('orig')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, '수정됨')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(async () => {
      const fresh = await exercisesRepo.findById(ex.id)
      expect(fresh?.name).toBe('수정됨')
    })
  })

  it('dirty 상태에서 뒤로 가기 → ConfirmDialog', async () => {
    const ex = await exercisesRepo.create({ name: 'orig' })
    renderForm(`/exercises/${ex.id}/edit`)
    const nameInput = await screen.findByDisplayValue('orig')
    await userEvent.type(nameInput, '!')
    await userEvent.click(screen.getByLabelText('뒤로'))
    expect(await screen.findByText(/저장하지 않은 변경사항/)).toBeInTheDocument()
  })

  it('기록 없으면 측정 방식 Select 노출', async () => {
    const ex = await exercisesRepo.create({ name: '운동', metric: 'reps' })
    renderForm(`/exercises/${ex.id}/edit`)
    await screen.findByDisplayValue('운동')
    expect(screen.getByText('측정 방식')).toBeInTheDocument()
    expect(screen.queryByText('기록이 있어 변경할 수 없습니다')).not.toBeInTheDocument()
  })

  it('기록이 있으면 측정 방식 잠김', async () => {
    const ex = await exercisesRepo.create({ name: '사용중운동', metric: 'reps' })
    await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: 'x',
      date: '2026-06-01',
      routine: [{ exerciseId: ex.id, sets: [{ weight: 0, reps: 10 }] }],
    })
    renderForm(`/exercises/${ex.id}/edit`)
    await screen.findByDisplayValue('사용중운동')
    expect(await screen.findByText('기록이 있어 변경할 수 없습니다')).toBeInTheDocument()
  })

  it('없는 id: "운동을 찾을 수 없습니다"', async () => {
    renderForm('/exercises/ex_none/edit')
    expect(await screen.findByText('운동을 찾을 수 없습니다')).toBeInTheDocument()
  })
})
