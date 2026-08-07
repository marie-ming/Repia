import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
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

// 상태를 들고 있는 래퍼 — 묶기 후 화면 변화까지 확인하기 위해
function Harness({ initial }: { initial: RoutineExercise[] }) {
  const [v, setV] = useState(initial)
  return (
    <>
      <RoutineEditor value={v} onChange={setV} exercises={exercises} />
      <output data-testid="state">{JSON.stringify(v)}</output>
    </>
  )
}
const state = (): RoutineExercise[] => JSON.parse(screen.getByTestId('state').textContent ?? '[]')

describe('RoutineEditor 슈퍼세트 묶기', () => {
  it('묶기: 두 번째 운동을 위 운동과 한 묶음으로', async () => {
    render(<Harness initial={value} />)
    await userEvent.click(screen.getAllByLabelText('위 운동과 묶기')[1]) // 스쿼트를 벤치와 묶기

    const after = state()
    expect(after[0].groupId).toBeDefined()
    expect(after[1].groupId).toBe(after[0].groupId)
    expect(after[2].groupId).toBeUndefined() // 데드는 그대로
    expect(screen.getByText('슈퍼세트')).toBeInTheDocument()
  })

  it('첫 운동은 위에 묶을 대상이 없어 비활성', () => {
    render(<RoutineEditor value={value} onChange={() => {}} exercises={exercises} />)
    expect(screen.getAllByLabelText('위 운동과 묶기')[0]).toBeDisabled()
  })

  it('묶으면 개별 "세트 추가"가 라운드 단위 추가로 바뀐다', async () => {
    render(<Harness initial={value} />)
    expect(screen.getAllByText('+ 세트 추가')).toHaveLength(3)

    await userEvent.click(screen.getAllByLabelText('위 운동과 묶기')[1])

    // 묶인 두 운동은 공용 "라운드 추가" 하나, 남은 단독 운동만 세트 추가 유지
    expect(screen.getByText('+ 라운드 추가')).toBeInTheDocument()
    expect(screen.getAllByText('+ 세트 추가')).toHaveLength(1)
  })

  it('라운드 추가: 묶인 운동 전원에게 세트가 하나씩 늘어난다', async () => {
    render(<Harness initial={value} />)
    await userEvent.click(screen.getAllByLabelText('위 운동과 묶기')[1])
    await userEvent.click(screen.getByText('+ 라운드 추가'))

    expect(state().map((r) => r.sets.length)).toEqual([2, 2, 1]) // 묶음 밖(데드)은 그대로
    expect(screen.getByText('2라운드')).toBeInTheDocument()
  })

  it('세트 삭제는 묶인 운동 전원에서 같은 라운드를 뺀다', async () => {
    render(<Harness initial={value} />)
    await userEvent.click(screen.getAllByLabelText('위 운동과 묶기')[1])
    await userEvent.click(screen.getByText('+ 라운드 추가'))
    await userEvent.click(screen.getAllByLabelText('세트 삭제')[0]) // 1라운드 삭제

    expect(state().map((r) => r.sets.length)).toEqual([1, 1, 1])
  })

  it('해제: 묶음이 풀리고 다시 개별 세트 추가로 돌아온다', async () => {
    render(<Harness initial={value} />)
    await userEvent.click(screen.getAllByLabelText('위 운동과 묶기')[1])
    await userEvent.click(screen.getAllByLabelText('묶음 해제')[0])

    expect(state().every((r) => r.groupId === undefined)).toBe(true)
    expect(screen.queryByText('슈퍼세트')).not.toBeInTheDocument()
    expect(screen.getAllByText('+ 세트 추가')).toHaveLength(3)
  })

  it('묶음은 통째로 이동한다(찢어지지 않음)', async () => {
    render(<Harness initial={value} />)
    await userEvent.click(screen.getAllByLabelText('위 운동과 묶기')[2]) // 데드를 스쿼트와 묶기
    await userEvent.click(screen.getByLabelText('묶음 위로 이동'))

    // [벤치] [스쿼트+데드] → [스쿼트+데드] [벤치]
    const after = state()
    expect(after.map((r) => r.exerciseId)).toEqual(['b', 'c', 'a'])
    expect(after[0].groupId).toBe(after[1].groupId)
    expect(after[2].groupId).toBeUndefined()
  })
})
