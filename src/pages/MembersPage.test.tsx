import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { MembersPage } from './MembersPage.tsx'
import { ToastProvider } from '../components/Toast.tsx'
import { membersRepo } from '../db/repositories/members.ts'

function renderPage() {
  function PathProbe() {
    const loc = useLocation()
    return <div data-testid="loc">{loc.pathname}</div>
  }
  return render(
    <MemoryRouter initialEntries={['/members']}>
      <ToastProvider>
        <Routes>
          <Route path="/members" element={<MembersPage />} />
          <Route path="*" element={<PathProbe />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('MembersPage', () => {
  it('회원이 없으면 빈 상태 안내', async () => {
    renderPage()
    expect(await screen.findByText('등록된 회원이 없습니다')).toBeInTheDocument()
  })

  it('회원 목록 표시', async () => {
    await membersRepo.create({ name: '홍길동' })
    await membersRepo.create({ name: '김철수' })
    renderPage()
    expect(await screen.findByText('홍길동')).toBeInTheDocument()
    expect(screen.getByText('김철수')).toBeInTheDocument()
  })

  it('이름순 정렬', async () => {
    await membersRepo.create({ name: '나' })
    await membersRepo.create({ name: '가' })
    await membersRepo.create({ name: '다' })
    renderPage()
    await screen.findByText('가')
    const names = Array.from(document.querySelectorAll('.member-card__name')).map(
      (n) => n.textContent,
    )
    expect(names).toEqual(['가', '나', '다'])
  })

  it('검색으로 필터링', async () => {
    await membersRepo.create({ name: '홍길동' })
    await membersRepo.create({ name: '김철수' })
    renderPage()
    await screen.findByText('홍길동')
    await userEvent.type(screen.getByPlaceholderText('이름 검색'), '홍')
    expect(screen.getByText('홍길동')).toBeInTheDocument()
    expect(screen.queryByText('김철수')).not.toBeInTheDocument()
  })

  it('수업종료 회원은 기본 숨김, 토글로 표시', async () => {
    await membersRepo.create({ name: '활동중' })
    await membersRepo.create({ name: '종료자', status: 'ended' })
    renderPage()
    await screen.findByText('활동중')
    expect(screen.queryByText('종료자')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '수업종료' }))
    expect(screen.getByText('종료자')).toBeInTheDocument()
  })

  it('수업종료 회원 없으면 토글 칩도 안 보임', async () => {
    await membersRepo.create({ name: '활동중1' })
    await membersRepo.create({ name: '활동중2' })
    renderPage()
    await screen.findByText('활동중1')
    expect(screen.queryByRole('button', { name: '수업종료' })).not.toBeInTheDocument()
  })

  it('회원 카드 클릭 시 상세 페이지로 이동', async () => {
    const m = await membersRepo.create({ name: '홍길동' })
    renderPage()
    await userEvent.click(await screen.findByText('홍길동'))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/members/${m.id}`)
  })

  it('FAB 클릭 시 시트 열림', async () => {
    renderPage()
    await screen.findByText('등록된 회원이 없습니다')
    await userEvent.click(screen.getByLabelText('회원 추가'))
    expect(screen.getByRole('heading', { name: '회원 추가' })).toBeInTheDocument()
  })

  it('시트에서 회원 추가 후 목록에 반영 + 토스트', async () => {
    renderPage()
    await screen.findByText('등록된 회원이 없습니다')
    await userEvent.click(screen.getByLabelText('회원 추가'))
    await userEvent.type(screen.getByPlaceholderText('회원 이름'), '신규회원')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => {
      expect(screen.getByText('신규회원')).toBeInTheDocument()
    })
    expect(screen.getByRole('status')).toHaveTextContent('회원이 추가되었습니다')
  })
})
