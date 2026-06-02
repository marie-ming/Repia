import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { MemberDetailPage } from './MemberDetailPage.tsx'
import { ToastProvider } from '../components/Toast.tsx'
import { membersRepo } from '../db/repositories/members.ts'
import { sessionsRepo } from '../db/repositories/sessions.ts'
import type { Member } from '../db/types.ts'

async function renderWithMember(member?: Member) {
  const m =
    member ??
    (await membersRepo.create({
      name: '홍길동',
      phone: '010-1111-2222',
      memo: '주 3회',
      registeredAt: '2026-01-01',
    }))
  function PathProbe() {
    const loc = useLocation()
    return <div data-testid="loc">{loc.pathname}</div>
  }
  return {
    member: m,
    ...render(
      <MemoryRouter initialEntries={[`/members/${m.id}`]}>
        <ToastProvider>
          <Routes>
            <Route path="/members/:id" element={<MemberDetailPage />} />
            <Route path="*" element={<PathProbe />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    ),
  }
}

describe('MemberDetailPage', () => {
  it('회원 정보 표시 (이름·연락처·등록일·메모)', async () => {
    await renderWithMember()
    expect(await screen.findByRole('heading', { name: '홍길동' })).toBeInTheDocument()
    expect(screen.getByText('010-1111-2222')).toBeInTheDocument()
    expect(screen.getByText('2026.01.01')).toBeInTheDocument()
    expect(screen.getByText('주 3회')).toBeInTheDocument()
  })

  it('수업이 없으면 "수업 기록 없음"', async () => {
    await renderWithMember()
    expect(await screen.findByText('수업 기록 없음')).toBeInTheDocument()
  })

  it('수업 섹션 헤딩과 이력 표시', async () => {
    const { member } = await renderWithMember()
    await sessionsRepo.create({
      memberId: member.id,
      memberNameSnapshot: member.name,
      date: '2026-06-10',
      status: 'reserved',
    })
    await renderWithMember(member)
    expect(await screen.findByRole('heading', { name: '수업' })).toBeInTheDocument()
    expect(screen.queryByText('수업 기록 없음')).not.toBeInTheDocument()
  })

  it('수업 이력 클릭 시 수업 상세로 이동', async () => {
    const { member } = await renderWithMember()
    const s = await sessionsRepo.create({
      memberId: member.id,
      memberNameSnapshot: member.name,
      date: '2026-06-10',
      time: '10:00',
      status: 'reserved',
    })
    await renderWithMember(member)
    await userEvent.click(await screen.findByText('26.06.10 수'))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/sessions/${s.id}`)
  })

  it('수정 버튼 → 시트 열림', async () => {
    await renderWithMember()
    await userEvent.click(await screen.findByRole('button', { name: '수정' }))
    expect(screen.getByRole('heading', { name: '회원 수정' })).toBeInTheDocument()
  })

  it('삭제 흐름: 시트→삭제→ConfirmDialog→삭제 후 /members 이동', async () => {
    await renderWithMember()
    await userEvent.click(await screen.findByRole('button', { name: '수정' }))
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent(/회원을 삭제할까요/)
    // 시트는 ConfirmDialog 위에서도 유지
    expect(screen.getByRole('heading', { name: '회원 수정' })).toBeInTheDocument()
    // 다이얼로그 내부의 삭제 버튼만 클릭
    const confirmBtn = within(dialog).getByRole('button', { name: '삭제' })
    await userEvent.click(confirmBtn)
    await waitFor(() => {
      expect(screen.getByTestId('loc')).toHaveTextContent('/members')
    })
  })

  it('없는 회원: 안내 표시', async () => {
    render(
      <MemoryRouter initialEntries={['/members/mem_none']}>
        <ToastProvider>
          <Routes>
            <Route path="/members/:id" element={<MemberDetailPage />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText('회원을 찾을 수 없습니다')).toBeInTheDocument()
  })
})
