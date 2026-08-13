import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExercisePicker } from './ExercisePicker.tsx'
import { ToastProvider } from './Toast.tsx'
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

describe('ExercisePicker 인라인 생성 실패', () => {
  // catch가 없으면 스피너만 꺼지고 아무 안내 없이 운동이 안 만들어진 채 끝난다
  it('생성이 실패하면 실패 토스트를 띄운다', async () => {
    const onCreateExercise = vi.fn().mockRejectedValue(new Error('저장 공간 부족'))
    render(
      <ToastProvider>
        <ExercisePicker
          open
          exercises={EXERCISES}
          excludeIds={[]}
          onClose={() => {}}
          onConfirm={() => {}}
          onCreateExercise={onCreateExercise}
        />
      </ToastProvider>,
    )
    await userEvent.type(screen.getByPlaceholderText('운동 이름 검색'), '새로운운동')
    // 만들기 UI는 링크를 눌러 펼친 뒤에 나온다
    await userEvent.click(document.querySelector('.picker__create-link') as HTMLElement)
    await userEvent.click(screen.getByRole('button', { name: '만들기' }))

    expect(await screen.findByRole('status')).toHaveTextContent('저장 실패: 저장 공간 부족')
    expect(onCreateExercise).toHaveBeenCalled()
  })
})

// 폼(ExerciseFormPage)과 같은 규칙을 써야 한다. 한쪽만 막으면 같은 운동이 둘로 갈린다.
describe('ExercisePicker — 새로 만들기 이름 중복', () => {
  function renderPicker() {
    return render(
      <ToastProvider>
        <ExercisePicker
          open
          exercises={EXERCISES}
          excludeIds={[]}
          onClose={() => {}}
          onConfirm={() => {}}
          onCreateExercise={vi.fn()}
        />
      </ToastProvider>,
    )
  }

  it('없는 이름이면 만들기가 뜬다', async () => {
    renderPicker()
    await userEvent.type(screen.getByPlaceholderText('운동 이름 검색'), '힙쓰러스트')
    expect(screen.getByText(/“힙쓰러스트” 새 운동 만들기/)).toBeInTheDocument()
  })

  it('이미 있는 이름이면 만들기가 안 뜬다', async () => {
    renderPicker()
    await userEvent.type(screen.getByPlaceholderText('운동 이름 검색'), '데드리프트')
    expect(screen.queryByText(/새 운동 만들기/)).not.toBeInTheDocument()
  })

  // 「데드리프트」와 「데드 리프트」는 같은 운동이다
  it('중간 띄어쓰기만 다른 것도 막는다', async () => {
    renderPicker()
    await userEvent.type(screen.getByPlaceholderText('운동 이름 검색'), '데드 리프트')
    expect(screen.queryByText(/새 운동 만들기/)).not.toBeInTheDocument()
  })

  // 만들기가 막힌 채로 검색까지 안 되면 아무것도 못 하는 막다른 화면이 된다
  it('띄어쓰기를 달리 쳐도 이미 있는 운동을 찾아준다', async () => {
    renderPicker()
    await userEvent.type(screen.getByPlaceholderText('운동 이름 검색'), '데드 리프트')
    expect(screen.getByText('데드리프트')).toBeInTheDocument()
    expect(screen.queryByText('운동 이름을 검색해 새로 만들 수 있어요.')).not.toBeInTheDocument()
  })

  it('대소문자만 다른 것도 막는다', async () => {
    render(
      <ToastProvider>
        <ExercisePicker
          open
          exercises={[makeEx({ id: 'ex_9', name: 'Lat Pulldown' })]}
          excludeIds={[]}
          onClose={() => {}}
          onConfirm={() => {}}
          onCreateExercise={vi.fn()}
        />
      </ToastProvider>,
    )
    await userEvent.type(screen.getByPlaceholderText('운동 이름 검색'), 'lat pulldown')

    expect(screen.queryByText(/새 운동 만들기/)).not.toBeInTheDocument()
    // 검색으로는 찾아줘야 막다른 화면이 안 된다
    expect(screen.getByText('Lat Pulldown')).toBeInTheDocument()
  })

  it('띄어쓰기를 지워도 다른 이름이면 만들 수 있다', async () => {
    renderPicker()
    await userEvent.type(screen.getByPlaceholderText('운동 이름 검색'), '루마니안 데드리프트')
    expect(screen.getByText(/“루마니안 데드리프트” 새 운동 만들기/)).toBeInTheDocument()
  })
})
