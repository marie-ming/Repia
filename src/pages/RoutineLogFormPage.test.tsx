import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { RoutineLogFormPage } from './RoutineLogFormPage.tsx'
import { ToastProvider } from '../components/Toast.tsx'
import { routineLogsRepo } from '../db/repositories/routineLogs.ts'
import { routineTemplatesRepo } from '../db/repositories/routineTemplates.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { logDraftRepo } from '../db/repositories/logDraft.ts'

function renderForm(path: string) {
  function PathProbe() {
    const loc = useLocation()
    return <div data-testid="loc">{loc.pathname}{loc.search}</div>
  }
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <Routes>
          <Route path="/logs/new" element={<RoutineLogFormPage />} />
          <Route path="/logs/:id/edit" element={<RoutineLogFormPage />} />
          <Route path="*" element={<PathProbe />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('RoutineLogFormPage — 신규', () => {
  it('타이틀 "기록 추가" + 저장 가능(날짜 기본값)', async () => {
    renderForm('/logs/new')
    expect(await screen.findByRole('heading', { name: '기록 추가' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled()
  })

  it('상태 옵션에 취소 없음 (예정/완료만)', async () => {
    renderForm('/logs/new')
    await screen.findByRole('heading', { name: '기록 추가' })
    expect(screen.getByRole('button', { name: '예정' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '완료' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '취소' })).not.toBeInTheDocument()
  })

  it('삭제 버튼 없음', async () => {
    renderForm('/logs/new')
    await screen.findByRole('heading', { name: '기록 추가' })
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
  })

  it('저장 시 기록 생성 + 홈으로', async () => {
    renderForm('/logs/new?date=2026-06-10')
    await screen.findByRole('heading', { name: '기록 추가' })
    await userEvent.type(screen.getByPlaceholderText(/제목 입력/), '하체')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(async () => {
      const all = await routineLogsRepo.findAll()
      expect(all).toHaveLength(1)
      expect(all[0].title).toBe('하체')
      expect(all[0].date).toBe('2026-06-10')
    })
  })

  it('?from= 복제: 이전 기록의 운동·세트 프리필', async () => {
    const ex = await exercisesRepo.create({ name: '데드리프트' })
    const src = await routineLogsRepo.create({
      title: '원본',
      date: '2026-05-01',
      status: 'completed',
      exercises: [{ exerciseId: ex.id, sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }] }],
    })
    renderForm(`/logs/new?from=${src.id}`)
    expect(await screen.findByText('데드리프트')).toBeInTheDocument()
    // 세트 2개 복제됨
    const setRows = document.querySelectorAll('.set-row')
    expect(setRows.length).toBe(2)
  })

  it('?fromTemplate= : 템플릿 운동·세트 프리필 + 저장 시 templateId 연결', async () => {
    const ex = await exercisesRepo.create({ name: '스쿼트' })
    const tpl = await routineTemplatesRepo.create({
      title: '하체 루틴',
      exercises: [{ exerciseId: ex.id, sets: [{ weight: 60, reps: 10 }] }],
    })
    renderForm(`/logs/new?fromTemplate=${tpl.id}`)
    expect(await screen.findByDisplayValue('하체 루틴')).toBeInTheDocument()
    expect(screen.getByText('스쿼트')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(async () => {
      const all = await routineLogsRepo.findAll()
      expect(all).toHaveLength(1)
      expect(all[0].templateId).toBe(tpl.id)
    })
  })
})

describe('RoutineLogFormPage — 수정', () => {
  it('기존 값 프리필 + 변경 전 저장 비활성', async () => {
    const l = await routineLogsRepo.create({ title: '기존', date: '2026-06-10', status: 'completed' })
    renderForm(`/logs/${l.id}/edit`)
    expect(await screen.findByRole('heading', { name: '기록 수정' })).toBeInTheDocument()
    expect(await screen.findByDisplayValue('기존')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('변경 후 저장 → 업데이트', async () => {
    const l = await routineLogsRepo.create({ title: 'orig', date: '2026-06-10', status: 'planned' })
    renderForm(`/logs/${l.id}/edit`)
    await screen.findByDisplayValue('orig')
    await userEvent.click(screen.getByRole('button', { name: '완료' }))
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(async () => {
      const fresh = await routineLogsRepo.findById(l.id)
      expect(fresh?.status).toBe('completed')
    })
  })
})

// 헬스장에서 세트를 채우다 앱이 내려가면 그대로 날아가던 문제.
describe('RoutineLogFormPage 작성 중 기록 복구', () => {
  const draftForm = {
    title: '작성중이던 가슴',
    date: '2026-08-10',
    time: '09:00',
    status: 'planned' as const,
    exercises: [{ exerciseId: 'ex_1', sets: [{ weight: 60, reps: 10 }] }],
    memo: '',
    templateId: null,
  }

  it('초안이 있으면 이어쓸지 묻는다', async () => {
    await logDraftRepo.save(draftForm)
    renderForm('/logs/new')
    expect(await screen.findByText('작성 중이던 기록이 있어요')).toBeInTheDocument()
  })

  it('이어쓰기를 누르면 내용이 복원된다', async () => {
    await logDraftRepo.save(draftForm)
    renderForm('/logs/new')
    await screen.findByText('작성 중이던 기록이 있어요')
    await userEvent.click(screen.getByRole('button', { name: '이어쓰기' }))
    expect(await screen.findByDisplayValue('작성중이던 가슴')).toBeInTheDocument()
  })

  it('새로 시작을 누르면 빈 폼이 되고 초안도 지워진다', async () => {
    await logDraftRepo.save(draftForm)
    renderForm('/logs/new')
    await screen.findByText('작성 중이던 기록이 있어요')
    await userEvent.click(screen.getByRole('button', { name: '새로 시작' }))

    expect(screen.queryByDisplayValue('작성중이던 가슴')).not.toBeInTheDocument()
    await waitFor(async () => {
      expect(await logDraftRepo.get()).toBeNull()
    })
  })

  it('초안이 없으면 아무것도 묻지 않는다', async () => {
    renderForm('/logs/new')
    await screen.findByPlaceholderText(/제목 입력/)
    expect(screen.queryByText('작성 중이던 기록이 있어요')).not.toBeInTheDocument()
  })

  it('수정 화면에서는 초안을 묻지 않는다 (이미 내용이 있음)', async () => {
    await logDraftRepo.save(draftForm)
    const l = await routineLogsRepo.create({ title: '기존 기록', date: '2026-06-10' })
    renderForm(`/logs/${l.id}/edit`)
    await screen.findByDisplayValue('기존 기록')
    expect(screen.queryByText('작성 중이던 기록이 있어요')).not.toBeInTheDocument()
  })

  it('작성하면 초안이 저장되고, 저장 완료 후에는 지워진다', async () => {
    await exercisesRepo.create({ name: '벤치프레스' })
    renderForm('/logs/new')
    await userEvent.type(await screen.findByPlaceholderText(/제목 입력/), '새 기록')

    await waitFor(async () => {
      expect((await logDraftRepo.get())?.form.title).toBe('새 기록')
    })

    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(async () => {
      expect(await logDraftRepo.get()).toBeNull()
    })
  })
})
