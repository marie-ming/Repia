import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from './ConfirmDialog.tsx'

function setup(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  const utils = render(
    <ConfirmDialog
      open
      title="삭제할까요?"
      message="복구할 수 없습니다."
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  )
  return { ...utils, onConfirm, onCancel }
}

describe('ConfirmDialog', () => {
  it('open=false면 아무것도 렌더 안 함', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="x"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('title과 message를 표시', () => {
    setup()
    expect(screen.getByText('삭제할까요?')).toBeInTheDocument()
    expect(screen.getByText('복구할 수 없습니다.')).toBeInTheDocument()
  })

  it('기본 라벨: 확인 / 취소', () => {
    setup()
    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument()
  })

  it('커스텀 라벨이 적용', () => {
    setup({ confirmLabel: '삭제', cancelLabel: '돌아가기' })
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '돌아가기' })).toBeInTheDocument()
  })

  it('확인 클릭 시 onConfirm 호출', async () => {
    const { onConfirm, onCancel } = setup()
    await userEvent.click(screen.getByRole('button', { name: '확인' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('취소 클릭 시 onCancel 호출', async () => {
    const { onConfirm, onCancel } = setup()
    await userEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('backdrop 클릭 시 onCancel 호출', async () => {
    const { onCancel, container } = setup()
    const backdrop = container.querySelector('.dialog-backdrop')!
    await userEvent.click(backdrop)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('dialog 자체를 클릭해도 onCancel 호출 안 됨 (stopPropagation)', async () => {
    const { onCancel } = setup()
    await userEvent.click(screen.getByRole('alertdialog'))
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('ESC 키로 onCancel 호출', async () => {
    const { onCancel } = setup()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('hideCancel이면 취소 버튼 숨김', () => {
    setup({ hideCancel: true })
    expect(screen.queryByRole('button', { name: '취소' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument()
  })

  it('danger이면 확인 버튼에 danger 클래스', () => {
    setup({ danger: true })
    expect(screen.getByRole('button', { name: '확인' })).toHaveClass('btn--danger')
  })
})
