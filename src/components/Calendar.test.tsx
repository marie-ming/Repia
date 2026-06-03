import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Calendar } from './Calendar.tsx'

function defaultProps(over: Partial<Parameters<typeof Calendar>[0]> = {}) {
  return {
    viewMonth: new Date(2026, 5, 1), // 2026-06-01 (Monday)
    selectedDate: '2026-06-15',
    markedCounts: new Map<string, number>(),
    onSelect: vi.fn(),
    onShiftMonth: vi.fn(),
    onToday: vi.fn(),
    ...over,
  }
}

describe('Calendar', () => {
  it('월 라벨 표시', () => {
    render(<Calendar {...defaultProps()} />)
    expect(screen.getByRole('button', { name: '2026년 6월' })).toBeInTheDocument()
  })

  it('일~토 요일 헤더 표시', () => {
    const { container } = render(<Calendar {...defaultProps()} />)
    const weekdays = container.querySelectorAll('.calendar__weekday')
    expect([...weekdays].map((w) => w.textContent)).toEqual(['일', '월', '화', '수', '목', '금', '토'])
  })

  it('6월 1일~30일 모두 셀에 존재', () => {
    render(<Calendar {...defaultProps()} />)
    for (let d = 1; d <= 30; d++) {
      expect(screen.getAllByText(String(d)).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('선택된 날짜는 --selected 클래스', () => {
    const { container } = render(<Calendar {...defaultProps()} />)
    const selected = container.querySelector('.calendar__cell--selected')!
    expect(within(selected as HTMLElement).getByText('15')).toBeInTheDocument()
  })

  it('이전 달/다음 달 날짜는 --other 클래스', () => {
    const { container } = render(<Calendar {...defaultProps()} />)
    const others = container.querySelectorAll('.calendar__cell--other')
    // 6월 1일이 월요일이라 5월 31일(일)만 앞에. 뒤로 7월 1일~ 일부
    expect(others.length).toBeGreaterThan(0)
  })

  it('셀 클릭 시 onSelect(YYYY-MM-DD) 호출', async () => {
    const onSelect = vi.fn()
    render(<Calendar {...defaultProps({ onSelect })} />)
    // 6월 1일 (당월) 클릭 — '6월'은 .calendar__date에 들어가 있음
    const cells = screen.getAllByRole('button').filter((b) =>
      b.className.startsWith('calendar__cell') && b.textContent === '1',
    )
    await userEvent.click(cells[0])
    expect(onSelect).toHaveBeenCalledWith('2026-06-01')
  })

  it('이전/다음 달 버튼 → onShiftMonth(-1 / +1)', async () => {
    const onShiftMonth = vi.fn()
    render(<Calendar {...defaultProps({ onShiftMonth })} />)
    await userEvent.click(screen.getByLabelText('이전 달'))
    expect(onShiftMonth).toHaveBeenLastCalledWith(-1)
    await userEvent.click(screen.getByLabelText('다음 달'))
    expect(onShiftMonth).toHaveBeenLastCalledWith(1)
  })

  it('월 라벨 클릭 시 onToday 호출', async () => {
    const onToday = vi.fn()
    render(<Calendar {...defaultProps({ onToday })} />)
    await userEvent.click(screen.getByRole('button', { name: '2026년 6월' }))
    expect(onToday).toHaveBeenCalledOnce()
  })

  it('markedCounts에 있는 날짜는 개수만큼 dot 표시 (최대 3)', () => {
    const { container } = render(
      <Calendar
        {...defaultProps({
          markedCounts: new Map([
            ['2026-06-10', 1],
            ['2026-06-11', 2],
            ['2026-06-12', 5], // 5개여도 3개까지만
          ]),
        })}
      />,
    )
    const dots = container.querySelectorAll('.calendar__dot')
    expect(dots.length).toBe(1 + 2 + 3)
  })

  it('마지막 주가 모두 다음 달이면 그 주 잘림', () => {
    // 2026-02 (28일, 일요일 시작) → 4주만 필요. 4주 = 28셀.
    const { container } = render(
      <Calendar {...defaultProps({ viewMonth: new Date(2026, 1, 1), selectedDate: '2026-02-15' })} />,
    )
    const cells = container.querySelectorAll('.calendar__cell')
    expect(cells.length).toBeLessThanOrEqual(35) // 최대 5주로 잘림
    expect(cells.length).toBeGreaterThanOrEqual(28)
  })
})
