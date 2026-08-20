import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { SessionFormPage } from './SessionFormPage.tsx'
import { ToastProvider } from '../components/Toast.tsx'
import { sessionsRepo } from '../db/repositories/sessions.ts'
import { membersRepo } from '../db/repositories/members.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { sessionDraftRepo } from '../db/repositories/sessionDraft.ts'

function renderForm(initialPath: string) {
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
    <MemoryRouter initialEntries={[initialPath]}>
      <ToastProvider>
        <Routes>
          <Route path="/sessions/new" element={<SessionFormPage />} />
          <Route path="/sessions/:id/edit" element={<SessionFormPage />} />
          <Route path="*" element={<PathProbe />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('SessionFormPage — 신규', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('회원 미선택 상태에서는 저장 비활성', async () => {
    await membersRepo.create({ name: '홍길동' })
    renderForm('/sessions/new')
    await screen.findByRole('heading', { name: '수업 추가' })
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('?date= 파라미터가 날짜 필드 기본값', async () => {
    await membersRepo.create({ name: '홍길동' })
    renderForm('/sessions/new?date=2026-08-15')
    const dateInput = (await screen.findByDisplayValue('2026-08-15')) as HTMLInputElement
    expect(dateInput.value).toBe('2026-08-15')
  })

  it('회원 선택 + 저장 → 세션 생성', async () => {
    const member = await membersRepo.create({ name: '홍길동' })
    renderForm('/sessions/new?date=2026-08-15')
    await screen.findByRole('heading', { name: '수업 추가' })

    // Select 컨트롤 열기
    await userEvent.click(screen.getByRole('button', { expanded: false, name: /선택|회원/ }))
    await userEvent.click(await screen.findByRole('option', { name: '홍길동' }))

    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(async () => {
      const all = await sessionsRepo.findAll()
      expect(all).toHaveLength(1)
      expect(all[0].memberId).toBe(member.id)
      expect(all[0].date).toBe('2026-08-15')
    })
  })

  it('운동 추가 → picker로 선택 → 루틴 반영', async () => {
    await membersRepo.create({ name: '홍길동' })
    await exercisesRepo.create({ name: '데드리프트' })
    renderForm('/sessions/new')
    await userEvent.click(await screen.findByRole('button', { name: /운동 추가/ }))
    // picker 열림 후 운동 선택
    await userEvent.click(await screen.findByText('데드리프트'))
    // picker confirm 버튼 (text가 "추가 1"이 됨)
    await userEvent.click(screen.getByRole('button', { name: /^추가\s+1$/ }))
    // 루틴에 추가됨 (routine-ex__name)
    await waitFor(() => {
      expect(document.querySelector('.routine-ex__name')).toHaveTextContent('데드리프트')
    })
  })

  it('회원이 없으면 select가 비어있고 저장 불가', async () => {
    renderForm('/sessions/new')
    await screen.findByRole('heading', { name: '수업 추가' })
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })
})

describe('SessionFormPage — 수정', () => {
  it('기존 세션 값으로 채워짐 + 저장 비활성', async () => {
    const member = await membersRepo.create({ name: '홍길동' })
    const s = await sessionsRepo.create({
      memberId: member.id,
      memberNameSnapshot: member.name,
      date: '2026-06-10',
      time: '10:30',
      status: 'reserved',
    })
    renderForm(`/sessions/${s.id}/edit`)
    expect(await screen.findByRole('heading', { name: '수업 수정' })).toBeInTheDocument()
    expect(await screen.findByDisplayValue('2026-06-10')).toBeInTheDocument()
    expect(await screen.findByDisplayValue('10:30')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('상태 변경 후 저장 → 업데이트', async () => {
    const member = await membersRepo.create({ name: '홍길동' })
    const s = await sessionsRepo.create({
      memberId: member.id,
      memberNameSnapshot: member.name,
      date: '2026-06-10',
      status: 'reserved',
    })
    renderForm(`/sessions/${s.id}/edit`)
    await screen.findByDisplayValue('2026-06-10')
    await userEvent.click(screen.getByRole('button', { name: '완료' }))
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(async () => {
      const fresh = await sessionsRepo.findById(s.id)
      expect(fresh?.status).toBe('completed')
    })
  })

  it('삭제 → 다이얼로그 → 삭제 완료', async () => {
    const member = await membersRepo.create({ name: '홍길동' })
    const s = await sessionsRepo.create({
      memberId: member.id,
      memberNameSnapshot: member.name,
      date: '2026-06-10',
      status: 'reserved',
    })
    renderForm(`/sessions/${s.id}/edit`)
    await screen.findByDisplayValue('2026-06-10')
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: '삭제' }))
    await waitFor(async () => {
      expect(await sessionsRepo.findById(s.id)).toBeUndefined()
    })
  })

  it('삭제 실패 시 성공 토스트 대신 실패를 알린다', async () => {
    vi.spyOn(sessionsRepo, 'delete').mockRejectedValueOnce(new Error('쓰기 거부'))
    const member = await membersRepo.create({ name: '홍길동' })
    const s = await sessionsRepo.create({
      memberId: member.id,
      memberNameSnapshot: member.name,
      date: '2026-06-10',
      status: 'reserved',
    })
    renderForm(`/sessions/${s.id}/edit`)
    await screen.findByDisplayValue('2026-06-10')
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: '삭제' }))
    expect(await screen.findByRole('status')).toHaveTextContent('삭제 실패: 쓰기 거부')
    expect(await sessionsRepo.findById(s.id)).toBeDefined() // 실제로 남아 있다
  })
})

// 기록 작성 화면에만 있던 초안을 수업에도 붙였다. 정책은 같다.
describe('작성 중 수업 임시 저장', () => {
  it('메모를 적으면 초안이 남는다', async () => {
    renderForm('/sessions/new')
    await userEvent.type(await screen.findByPlaceholderText('수업 메모'), '어깨 위주')

    await waitFor(async () => {
      expect((await sessionDraftRepo.get())?.form.memo).toBe('어깨 위주')
    })
  })

  it('손대지 않으면 초안을 만들지 않는다', async () => {
    renderForm('/sessions/new')
    await screen.findByPlaceholderText('수업 메모')
    await new Promise((r) => setTimeout(r, 700))
    expect(await sessionDraftRepo.get()).toBeNull()
  })

  it('다시 들어오면 이어쓸지 묻고, 이어쓰면 복구된다', async () => {
    await sessionDraftRepo.save({
      memberId: null,
      date: '2026-06-15',
      time: '10:00',
      status: 'reserved',
      routine: [],
      memo: '이어쓸 메모',
    })

    renderForm('/sessions/new')
    expect(await screen.findByText('작성 중이던 수업이 있어요')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '이어쓰기' }))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('수업 메모')).toHaveValue('이어쓸 메모')
    })
  })

  it('「새로 시작」을 고르면 초안이 지워진다', async () => {
    await sessionDraftRepo.save({
      memberId: null,
      date: '2026-06-15',
      time: '10:00',
      status: 'reserved',
      routine: [],
      memo: '버릴 메모',
    })

    renderForm('/sessions/new')
    await screen.findByText('작성 중이던 수업이 있어요')
    await userEvent.click(screen.getByRole('button', { name: '새로 시작' }))

    await waitFor(async () => {
      expect(await sessionDraftRepo.get()).toBeNull()
    })
    expect(screen.getByPlaceholderText('수업 메모')).toHaveValue('')
  })

  it('신규는 나갈 때 경고 대신 임시 저장했다고 알린다', async () => {
    renderForm('/sessions/new')
    await userEvent.type(await screen.findByPlaceholderText('수업 메모'), '나가는 메모')

    await userEvent.click(screen.getByLabelText('뒤로'))

    expect(await screen.findByText('작성 중인 내용을 임시 저장했습니다')).toBeInTheDocument()
    expect(screen.queryByText('닫으면 변경사항이 사라집니다.')).not.toBeInTheDocument()
  })

  it('수정 화면은 초안을 남기지 않고 경고를 쓴다', async () => {
    const m = await membersRepo.create({ name: '홍길동', phone: '010-0000-0000' })
    const s = await sessionsRepo.create({
      memberId: m.id,
      memberNameSnapshot: m.name,
      date: '2026-06-10',
      time: '10:00',
      status: 'reserved',
      routine: [],
      memo: '기존 메모',
    })

    renderForm(`/sessions/${s.id}/edit`)
    await screen.findByDisplayValue('기존 메모')

    await userEvent.type(screen.getByPlaceholderText('수업 메모'), ' 추가')
    await new Promise((r) => setTimeout(r, 700))
    expect(await sessionDraftRepo.get()).toBeNull()

    await userEvent.click(screen.getByLabelText('뒤로'))
    expect(await screen.findByText('닫으면 변경사항이 사라집니다.')).toBeInTheDocument()
  })
})

