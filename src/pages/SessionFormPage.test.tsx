import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { SessionFormPage } from './SessionFormPage.tsx'
import { ToastProvider } from '../components/Toast.tsx'
import { sessionsRepo } from '../db/repositories/sessions.ts'
import { membersRepo } from '../db/repositories/members.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'

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
})
