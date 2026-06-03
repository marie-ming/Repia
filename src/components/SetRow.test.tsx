import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetRow } from './SetRow.tsx'
import type { SetEntry } from '../db/types.ts'

function setup(metric: Parameters<typeof SetRow>[0]['metric'], set: SetEntry) {
  const onChange = vi.fn()
  const onRemove = vi.fn()
  render(<SetRow index={0} metric={metric} set={set} onChange={onChange} onRemove={onRemove} />)
  return { onChange, onRemove }
}

describe('SetRow', () => {
  it('weight_reps: kg/회 단위 2칸', () => {
    setup('weight_reps', { weight: 0, reps: 0 })
    expect(screen.getByText('kg')).toBeInTheDocument()
    expect(screen.getByText('회')).toBeInTheDocument()
    expect(screen.getAllByRole('spinbutton')).toHaveLength(2)
  })

  it('reps: 회 1칸', () => {
    setup('reps', { weight: 0, reps: 0 })
    expect(screen.getByText('회')).toBeInTheDocument()
    expect(screen.queryByText('kg')).not.toBeInTheDocument()
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1)
  })

  it('time: 분/초 2칸', () => {
    setup('time', { weight: 0, reps: 0, seconds: 0 })
    expect(screen.getByText('분')).toBeInTheDocument()
    expect(screen.getByText('초')).toBeInTheDocument()
  })

  it('distance_time: km/분/초 3칸', () => {
    setup('distance_time', { weight: 0, reps: 0, seconds: 0, distance: 0 })
    expect(screen.getByText('km')).toBeInTheDocument()
    expect(screen.getByText('분')).toBeInTheDocument()
    expect(screen.getByText('초')).toBeInTheDocument()
    expect(screen.getAllByRole('spinbutton')).toHaveLength(3)
  })

  it('time 입력: 분 변경 시 seconds 반영(기존 초 유지)', async () => {
    const { onChange } = setup('time', { weight: 0, reps: 0, seconds: 30 })
    const min = screen.getAllByRole('spinbutton')[0]
    await userEvent.type(min, '2')
    // 2분 + 기존 30초 = 150
    expect(onChange).toHaveBeenLastCalledWith({ seconds: 150 })
  })

  it('삭제 버튼', async () => {
    const { onRemove } = setup('reps', { weight: 0, reps: 5 })
    await userEvent.click(screen.getByLabelText('세트 삭제'))
    expect(onRemove).toHaveBeenCalledOnce()
  })
})
