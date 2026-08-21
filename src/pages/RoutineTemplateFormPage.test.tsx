import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { RoutineTemplateFormPage } from './RoutineTemplateFormPage.tsx'
import { ToastProvider } from '../components/Toast.tsx'
import { routineTemplatesRepo } from '../db/repositories/routineTemplates.ts'
import { routineTemplateDraftRepo } from '../db/repositories/routineTemplateDraft.ts'

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

  it('카테고리 최대 3개 선택, 4번째 비활성 + 저장 시 반영', async () => {
    renderForm('/routines/new')
    await userEvent.type(await screen.findByPlaceholderText(/제목 입력/), '풀바디')
    await userEvent.click(screen.getByRole('button', { name: '상체' }))
    await userEvent.click(screen.getByRole('button', { name: '하체' }))
    await userEvent.click(screen.getByRole('button', { name: '코어' }))
    expect(screen.getByRole('button', { name: '등' })).toHaveClass('chip--disabled')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(async () => {
      const all = await routineTemplatesRepo.findAll()
      expect(all[0].categories.sort()).toEqual(['core', 'lower', 'upper'])
    })
  })
})

// 기록 작성 화면에만 있던 초안을 루틴에도 붙였다. 정책은 같다 —
// 새로 만들 때는 자동 임시저장, 수정할 때는 「변경사항이 사라집니다」 경고.
describe('작성 중 루틴 임시 저장', () => {
  it('입력하면 초안이 남는다', async () => {
    renderForm('/routines/new')
    await userEvent.type(screen.getByPlaceholderText(/제목 입력/), '하체 루틴')

    await waitFor(async () => {
      expect((await routineTemplateDraftRepo.get())?.form.title).toBe('하체 루틴')
    })
  })

  it('손대지 않으면 초안을 만들지 않는다', async () => {
    renderForm('/routines/new')
    await screen.findByPlaceholderText(/제목 입력/)
    await new Promise((r) => setTimeout(r, 700))
    expect(await routineTemplateDraftRepo.get()).toBeNull()
  })

  it('다시 들어오면 이어쓸지 묻고, 이어쓰면 복구된다', async () => {
    await routineTemplateDraftRepo.save({
      title: '작성 중 루틴',
      categories: [],
      exercises: [],
      memo: '메모',
    })

    renderForm('/routines/new')
    expect(await screen.findByText('작성 중이던 루틴이 있어요')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '이어쓰기' }))
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/제목 입력/)).toHaveValue('작성 중 루틴')
    })
  })

  it('「새로 시작」을 고르면 초안이 지워진다', async () => {
    await routineTemplateDraftRepo.save({
      title: '버릴 루틴',
      categories: [],
      exercises: [],
      memo: '',
    })

    renderForm('/routines/new')
    await screen.findByText('작성 중이던 루틴이 있어요')
    await userEvent.click(screen.getByRole('button', { name: '새로 시작' }))

    await waitFor(async () => {
      expect(await routineTemplateDraftRepo.get()).toBeNull()
    })
    expect(screen.getByPlaceholderText(/제목 입력/)).toHaveValue('')
  })

  it('저장하면 초안이 정리된다', async () => {
    renderForm('/routines/new')
    await userEvent.type(screen.getByPlaceholderText(/제목 입력/), '저장할 루틴')
    await waitFor(async () => {
      expect(await routineTemplateDraftRepo.get()).not.toBeNull()
    })

    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(async () => {
      expect(await routineTemplateDraftRepo.get()).toBeNull()
    })
  })

  // 수정은 원본이 있어 무엇을 보여줄지 애매해지므로 초안을 남기지 않는다
  it('수정 화면은 초안을 남기지 않고 경고를 쓴다', async () => {
    const t = await routineTemplatesRepo.create({ title: '기존 루틴', exercises: [], memo: '' })
    renderForm(`/routines/${t.id}/edit`)
    await screen.findByDisplayValue('기존 루틴')

    await userEvent.type(screen.getByPlaceholderText(/제목 입력/), ' 수정')
    await new Promise((r) => setTimeout(r, 700))
    expect(await routineTemplateDraftRepo.get()).toBeNull()

    await userEvent.click(screen.getByLabelText('뒤로'))
    expect(await screen.findByText('닫으면 변경사항이 사라집니다.')).toBeInTheDocument()
  })

  it('신규는 나갈 때 경고 대신 임시 저장했다고 알린다', async () => {
    renderForm('/routines/new')
    await userEvent.type(screen.getByPlaceholderText(/제목 입력/), '나가는 루틴')

    await userEvent.click(screen.getByLabelText('뒤로'))

    expect(await screen.findByText('작성 중인 내용을 임시 저장했습니다')).toBeInTheDocument()
    expect(screen.queryByText('닫으면 변경사항이 사라집니다.')).not.toBeInTheDocument()
    expect((await routineTemplateDraftRepo.get())?.form.title).toBe('나가는 루틴')
  })
})

