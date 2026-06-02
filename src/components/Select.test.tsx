import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from './Select.tsx'

const OPTIONS = [
  { value: 'a', label: '사과' },
  { value: 'b', label: '바나나' },
  { value: 'c', label: '체리' },
] as const

describe('Select', () => {
  it('기본 상태: placeholder 표시 + 옵션은 숨김', () => {
    render(<Select value={null} options={[...OPTIONS]} onChange={() => {}} placeholder="과일 선택" />)
    expect(screen.getByText('과일 선택')).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('선택된 값이 있으면 해당 라벨 표시', () => {
    render(<Select value="b" options={[...OPTIONS]} onChange={() => {}} />)
    expect(screen.getByText('바나나')).toBeInTheDocument()
  })

  it('컨트롤 클릭 시 옵션 패널이 열림', async () => {
    render(<Select value={null} options={[...OPTIONS]} onChange={() => {}} />)
    await userEvent.click(screen.getByRole('button', { expanded: false }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('옵션 선택 시 onChange 호출 + 패널 닫힘', async () => {
    const onChange = vi.fn()
    render(<Select value={null} options={[...OPTIONS]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button'))
    await userEvent.click(screen.getByRole('option', { name: '체리' }))
    expect(onChange).toHaveBeenCalledWith('c')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('aria-selected는 현재 value에만 true', async () => {
    render(<Select value="b" options={[...OPTIONS]} onChange={() => {}} />)
    await userEvent.click(screen.getByRole('button'))
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'false')
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
    expect(options[2]).toHaveAttribute('aria-selected', 'false')
  })

  describe('searchable', () => {
    it('searchable=true면 검색 input 표시', async () => {
      render(<Select value={null} options={[...OPTIONS]} onChange={() => {}} searchable />)
      await userEvent.click(screen.getByRole('button'))
      expect(screen.getByRole('searchbox')).toBeInTheDocument()
    })

    it('검색어로 옵션 필터링', async () => {
      render(
        <Select value={null} options={[...OPTIONS]} onChange={() => {}} searchable />,
      )
      await userEvent.click(screen.getByRole('button'))
      await userEvent.type(screen.getByRole('searchbox'), '바')
      expect(screen.getAllByRole('option')).toHaveLength(1)
      expect(screen.getByRole('option', { name: '바나나' })).toBeInTheDocument()
    })

    it('일치 옵션 없으면 안내 문구', async () => {
      render(
        <Select value={null} options={[...OPTIONS]} onChange={() => {}} searchable />,
      )
      await userEvent.click(screen.getByRole('button'))
      await userEvent.type(screen.getByRole('searchbox'), 'xyz')
      expect(screen.queryAllByRole('option')).toHaveLength(0)
      expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument()
    })

    it('대소문자 무시', async () => {
      const opts = [{ value: 'a', label: 'Apple' }]
      render(<Select value={null} options={opts} onChange={() => {}} searchable />)
      await userEvent.click(screen.getByRole('button'))
      await userEvent.type(screen.getByRole('searchbox'), 'app')
      expect(screen.getAllByRole('option')).toHaveLength(1)
    })

    it('패널을 닫았다 다시 열면 검색어 초기화', async () => {
      render(<Select value={null} options={[...OPTIONS]} onChange={() => {}} searchable />)
      await userEvent.click(screen.getByRole('button'))
      await userEvent.type(screen.getByRole('searchbox'), '바')
      // 바깥 클릭으로 닫기
      await userEvent.click(document.body)
      await userEvent.click(screen.getByRole('button'))
      expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('')
    })
  })

  it('외부 클릭 시 패널 닫힘', async () => {
    render(
      <div>
        <Select value={null} options={[...OPTIONS]} onChange={() => {}} />
        <button type="button">밖</button>
      </div>,
    )
    await userEvent.click(screen.getByRole('button', { name: '선택' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '밖' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
