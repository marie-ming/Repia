import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoutineEditor } from './RoutineEditor.tsx'
import type { Exercise, RoutineExercise } from '../db/types.ts'

const exercises = [
  { id: 'a', name: '벤치', metric: 'weight_reps' },
  { id: 'b', name: '스쿼트', metric: 'weight_reps' },
  { id: 'c', name: '데드', metric: 'weight_reps' },
] as Exercise[]

const value: RoutineExercise[] = [
  { exerciseId: 'a', sets: [{ weight: 60, reps: 10 }] },
  { exerciseId: 'b', sets: [{ weight: 80, reps: 8 }] },
  { exerciseId: 'c', sets: [{ weight: 100, reps: 5 }] },
]

describe('RoutineEditor 운동 순서 변경', () => {
  it('아래로 이동: 첫 운동이 다음 운동과 교체', async () => {
    const onChange = vi.fn()
    render(<RoutineEditor value={value} onChange={onChange} exercises={exercises} />)
    await userEvent.click(screen.getAllByLabelText('아래로 이동')[0])
    expect(onChange).toHaveBeenCalledWith([value[1], value[0], value[2]])
  })

  it('위로 이동: 두 번째 운동이 앞 운동과 교체', async () => {
    const onChange = vi.fn()
    render(<RoutineEditor value={value} onChange={onChange} exercises={exercises} />)
    await userEvent.click(screen.getAllByLabelText('위로 이동')[1])
    expect(onChange).toHaveBeenCalledWith([value[1], value[0], value[2]])
  })

  it('첫 운동 위로/마지막 운동 아래로는 비활성', () => {
    render(<RoutineEditor value={value} onChange={() => {}} exercises={exercises} />)
    const ups = screen.getAllByLabelText('위로 이동')
    const downs = screen.getAllByLabelText('아래로 이동')
    expect(ups[0]).toBeDisabled()
    expect(downs[downs.length - 1]).toBeDisabled()
  })
})
