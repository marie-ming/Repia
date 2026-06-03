import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExercisePicker } from './ExercisePicker.tsx'
import type { Exercise } from '../db/types.ts'

function makeEx(over: Partial<Exercise>): Exercise {
  return {
    id: over.id ?? 'ex_x',
    name: over.name ?? '운동',
    categories: over.categories ?? [],
    equipment: over.equipment ?? null,
    grip: '',
    metric: over.metric ?? 'weight_reps',
    photos: [],
    description: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

const EXERCISES: Exercise[] = [
  makeEx({ id: 'ex_1', name: '데드리프트', categories: ['back'], equipment: 'barbell' }),
  makeEx({ id: 'ex_2', name: '벤치프레스', categories: ['chest'], equipment: 'barbell' }),
  makeEx({ id: 'ex_3', name: '풀업', categories: ['back'], equipment: 'bodyweight' }),
  makeEx({ id: 'ex_4', name: '스쿼트', categories: ['lower'], equipment: 'barbell' }),
]

describe('ExercisePicker', () => {
  it('open=false면 렌더 안 함', () => {
    const { container } = render(
      <ExercisePicker open={false} exercises={EXERCISES} excludeIds={[]} onClose={() => {}} onConfirm={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('전체 운동을 카드로 표시', () => {
    render(
      <ExercisePicker open exercises={EXERCISES} excludeIds={[]} onClose={() => {}} onConfirm={() => {}} />,
    )
    expect(screen.getByText('데드리프트')).toBeInTheDocument()
    expect(screen.getByText('벤치프레스')).toBeInTheDocument()
    expect(screen.getByText('풀업')).toBeInTheDocument()
    expect(screen.getByText('스쿼트')).toBeInTheDocument()
  })

  it('excludeIds에 포함된 운동은 숨김', () => {
    render(
      <ExercisePicker
        open
        exercises={EXERCISES}
        excludeIds={['ex_1', 'ex_3']}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    expect(screen.queryByText('데드리프트')).not.toBeInTheDocument()
    expect(screen.queryByText('풀업')).not.toBeInTheDocument()
    expect(screen.getByText('벤치프레스')).toBeInTheDocument()
    expect(screen.getByText('스쿼트')).toBeInTheDocument()
  })

  it('검색어로 필터링', async () => {
    render(
      <ExercisePicker open exercises={EXERCISES} excludeIds={[]} onClose={() => {}} onConfirm={() => {}} />,
    )
    await userEvent.type(screen.getByPlaceholderText('운동 이름 검색'), '풀')
    expect(screen.getByText('풀업')).toBeInTheDocument()
    expect(screen.queryByText('데드리프트')).not.toBeInTheDocument()
  })

  it('카테고리 필터: 등', async () => {
    render(
      <ExercisePicker open exercises={EXERCISES} excludeIds={[]} onClose={() => {}} onConfirm={() => {}} />,
    )
    await userEvent.click(screen.getByRole('button', { name: '등' }))
    expect(screen.getByText('데드리프트')).toBeInTheDocument()
    expect(screen.getByText('풀업')).toBeInTheDocument()
    expect(screen.queryByText('벤치프레스')).not.toBeInTheDocument()
    expect(screen.queryByText('스쿼트')).not.toBeInTheDocument()
  })

  it('장비 필터: 바벨', async () => {
    render(
      <ExercisePicker open exercises={EXERCISES} excludeIds={[]} onClose={() => {}} onConfirm={() => {}} />,
    )
    await userEvent.click(screen.getByRole('button', { name: '바벨' }))
    expect(screen.queryByText('풀업')).not.toBeInTheDocument()
    expect(screen.getByText('데드리프트')).toBeInTheDocument()
    expect(screen.getByText('벤치프레스')).toBeInTheDocument()
    expect(screen.getByText('스쿼트')).toBeInTheDocument()
  })

  it('카테고리 + 장비 AND 조건', async () => {
    render(
      <ExercisePicker open exercises={EXERCISES} excludeIds={[]} onClose={() => {}} onConfirm={() => {}} />,
    )
    await userEvent.click(screen.getByRole('button', { name: '등' }))
    await userEvent.click(screen.getByRole('button', { name: '맨몸' }))
    expect(screen.getByText('풀업')).toBeInTheDocument()
    expect(screen.queryByText('데드리프트')).not.toBeInTheDocument()
  })

  it('선택 카운트가 확인 버튼에 표시', async () => {
    render(
      <ExercisePicker open exercises={EXERCISES} excludeIds={[]} onClose={() => {}} onConfirm={() => {}} />,
    )
    // 처음엔 "추가" (디스에이블)
    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled()
    await userEvent.click(screen.getByText('데드리프트'))
    expect(screen.getByRole('button', { name: /추가\s*1/ })).toBeEnabled()
    await userEvent.click(screen.getByText('벤치프레스'))
    expect(screen.getByRole('button', { name: /추가\s*2/ })).toBeEnabled()
  })

  it('같은 운동 다시 클릭 시 선택 해제', async () => {
    render(
      <ExercisePicker open exercises={EXERCISES} excludeIds={[]} onClose={() => {}} onConfirm={() => {}} />,
    )
    await userEvent.click(screen.getByText('데드리프트'))
    expect(screen.getByRole('button', { name: /추가\s*1/ })).toBeInTheDocument()
    await userEvent.click(screen.getByText('데드리프트'))
    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled()
  })

  it('확인 클릭 시 선택된 id들이 onConfirm으로 전달', async () => {
    const onConfirm = vi.fn()
    render(
      <ExercisePicker open exercises={EXERCISES} excludeIds={[]} onClose={() => {}} onConfirm={onConfirm} />,
    )
    await userEvent.click(screen.getByText('데드리프트'))
    await userEvent.click(screen.getByText('풀업'))
    await userEvent.click(screen.getByRole('button', { name: /추가/ }))
    expect(onConfirm).toHaveBeenCalledOnce()
    const ids = onConfirm.mock.calls[0][0] as string[]
    expect(ids.sort()).toEqual(['ex_1', 'ex_3'])
  })

  it('닫기 버튼 클릭 시 onClose 호출', async () => {
    const onClose = vi.fn()
    render(
      <ExercisePicker open exercises={EXERCISES} excludeIds={[]} onClose={onClose} onConfirm={() => {}} />,
    )
    await userEvent.click(screen.getByLabelText('닫기'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('패널 재오픈 시 선택/검색/필터 초기화', async () => {
    const { rerender } = render(
      <ExercisePicker open exercises={EXERCISES} excludeIds={[]} onClose={() => {}} onConfirm={() => {}} />,
    )
    await userEvent.click(screen.getByText('데드리프트'))
    await userEvent.type(screen.getByPlaceholderText('운동 이름 검색'), '데')
    rerender(
      <ExercisePicker open={false} exercises={EXERCISES} excludeIds={[]} onClose={() => {}} onConfirm={() => {}} />,
    )
    rerender(
      <ExercisePicker open exercises={EXERCISES} excludeIds={[]} onClose={() => {}} onConfirm={() => {}} />,
    )
    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled()
    expect((screen.getByPlaceholderText('운동 이름 검색') as HTMLInputElement).value).toBe('')
  })
})
