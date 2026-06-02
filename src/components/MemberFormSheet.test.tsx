import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberFormSheet } from './MemberFormSheet.tsx'
import type { Member } from '../db/types.ts'

const baseMember: Member = {
  id: 'm_1',
  name: '홍길동',
  phone: '010-1234-5678',
  status: 'active',
  memo: '주 3회',
  registeredAt: '2026-01-01',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function noop() {}

describe('MemberFormSheet — 신규 등록', () => {
  it('타이틀이 "회원 추가"', () => {
    render(
      <MemberFormSheet open member={null} onClose={noop} onSave={noop} onDelete={noop} />,
    )
    expect(screen.getByRole('heading', { name: '회원 추가' })).toBeInTheDocument()
  })

  it('이름 비어 있으면 저장 비활성', () => {
    render(
      <MemberFormSheet open member={null} onClose={noop} onSave={noop} onDelete={noop} />,
    )
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('이름 입력 시 저장 활성', async () => {
    render(
      <MemberFormSheet open member={null} onClose={noop} onSave={noop} onDelete={noop} />,
    )
    await userEvent.type(screen.getByPlaceholderText('회원 이름'), '신규')
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled()
  })

  it('이름 공백만 입력해도 저장 비활성', async () => {
    render(
      <MemberFormSheet open member={null} onClose={noop} onSave={noop} onDelete={noop} />,
    )
    await userEvent.type(screen.getByPlaceholderText('회원 이름'), '   ')
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('삭제 버튼은 없음', () => {
    render(
      <MemberFormSheet open member={null} onClose={noop} onSave={noop} onDelete={noop} />,
    )
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
  })

  it('전화번호 자동 포맷', async () => {
    render(
      <MemberFormSheet open member={null} onClose={noop} onSave={noop} onDelete={noop} />,
    )
    const phone = screen.getByPlaceholderText('010-0000-0000') as HTMLInputElement
    await userEvent.type(phone, '01012345678')
    expect(phone.value).toBe('010-1234-5678')
  })

  it('저장 시 onSave에 trim된 이름 전달', async () => {
    const onSave = vi.fn()
    render(
      <MemberFormSheet open member={null} onClose={noop} onSave={onSave} onDelete={noop} />,
    )
    await userEvent.type(screen.getByPlaceholderText('회원 이름'), '  홍길동  ')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: '홍길동' }),
    )
  })
})

describe('MemberFormSheet — 수정', () => {
  it('타이틀이 "회원 수정"', () => {
    render(
      <MemberFormSheet open member={baseMember} onClose={noop} onSave={noop} onDelete={noop} />,
    )
    expect(screen.getByRole('heading', { name: '회원 수정' })).toBeInTheDocument()
  })

  it('기존 값으로 채워짐', () => {
    render(
      <MemberFormSheet open member={baseMember} onClose={noop} onSave={noop} onDelete={noop} />,
    )
    expect((screen.getByPlaceholderText('회원 이름') as HTMLInputElement).value).toBe('홍길동')
    expect((screen.getByPlaceholderText('010-0000-0000') as HTMLInputElement).value).toBe('010-1234-5678')
  })

  it('변경 없으면 저장 비활성 (dirty 체크)', () => {
    render(
      <MemberFormSheet open member={baseMember} onClose={noop} onSave={noop} onDelete={noop} />,
    )
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('한 글자라도 바꾸면 저장 활성', async () => {
    render(
      <MemberFormSheet open member={baseMember} onClose={noop} onSave={noop} onDelete={noop} />,
    )
    await userEvent.type(screen.getByPlaceholderText('회원 이름'), '!')
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled()
  })

  it('삭제 버튼 표시 + 클릭 시 onDelete(member)', async () => {
    const onDelete = vi.fn()
    render(
      <MemberFormSheet open member={baseMember} onClose={noop} onSave={noop} onDelete={onDelete} />,
    )
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(onDelete).toHaveBeenCalledWith(baseMember)
  })

  it('dirty 상태에서 backdrop 닫기 시도 → 확인 다이얼로그', async () => {
    const onClose = vi.fn()
    const { container } = render(
      <MemberFormSheet open member={baseMember} onClose={onClose} onSave={noop} onDelete={noop} />,
    )
    await userEvent.type(screen.getByPlaceholderText('회원 이름'), '수정')
    await userEvent.click(container.querySelector('.sheet-backdrop')!)
    expect(screen.getByText('저장하지 않은 변경사항이 있습니다')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('dirty 없으면 backdrop 닫기 즉시 onClose', async () => {
    const onClose = vi.fn()
    const { container } = render(
      <MemberFormSheet open member={baseMember} onClose={onClose} onSave={noop} onDelete={noop} />,
    )
    await userEvent.click(container.querySelector('.sheet-backdrop')!)
    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.queryByText('저장하지 않은 변경사항이 있습니다')).not.toBeInTheDocument()
  })

  it('상태 segmented 버튼으로 상태 변경 가능', async () => {
    render(
      <MemberFormSheet open member={baseMember} onClose={noop} onSave={noop} onDelete={noop} />,
    )
    await userEvent.click(screen.getByRole('button', { name: '수업종료' }))
    expect(screen.getByRole('button', { name: '수업종료' })).toHaveClass('segmented__item--active')
  })
})
