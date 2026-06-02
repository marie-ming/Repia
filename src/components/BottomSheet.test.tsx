import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottomSheet } from './BottomSheet.tsx'

function setup(overrides: Partial<Parameters<typeof BottomSheet>[0]> = {}) {
  const onClose = vi.fn()
  const utils = render(
    <BottomSheet open onClose={onClose} title="시트 제목" {...overrides}>
      <p>내용</p>
    </BottomSheet>,
  )
  return { ...utils, onClose }
}

describe('BottomSheet', () => {
  it('open=false면 렌더 안 함', () => {
    const { container } = render(
      <BottomSheet open={false} onClose={() => {}}>
        <p>내용</p>
      </BottomSheet>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('open=true면 title/children 표시', () => {
    setup()
    expect(screen.getByRole('heading', { name: '시트 제목' })).toBeInTheDocument()
    expect(screen.getByText('내용')).toBeInTheDocument()
  })

  it('title 없으면 헤더 없음', () => {
    setup({ title: undefined })
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('backdrop 클릭 시 onClose 호출', async () => {
    const { onClose, container } = setup()
    await userEvent.click(container.querySelector('.sheet-backdrop')!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('sheet 내부 클릭은 onClose 호출 안 함 (stopPropagation)', async () => {
    const { onClose } = setup()
    await userEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('ESC 키로 onClose 호출', async () => {
    const { onClose } = setup()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('aria-modal과 role="dialog" 속성', () => {
    setup()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })
})
