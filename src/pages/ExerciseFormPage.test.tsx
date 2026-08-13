import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ExerciseFormPage } from './ExerciseFormPage.tsx'
import { ToastProvider } from '../components/Toast.tsx'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { sessionsRepo } from '../db/repositories/sessions.ts'

function renderForm(initialPath: string) {
  function PathProbe() {
    const loc = useLocation()
    return <div data-testid="loc">{loc.pathname}</div>
  }
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ToastProvider>
        <Routes>
          <Route path="/exercises/new" element={<ExerciseFormPage />} />
          <Route path="/exercises/:id/edit" element={<ExerciseFormPage />} />
          <Route path="*" element={<PathProbe />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('ExerciseFormPage — 신규', () => {
  it('타이틀이 "운동 추가" + 저장 비활성', () => {
    renderForm('/exercises/new')
    expect(screen.getByRole('heading', { name: '운동 추가' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('이름 입력 시 저장 활성', async () => {
    renderForm('/exercises/new')
    await userEvent.type(screen.getByPlaceholderText('운동 입력'), '데드리프트')
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled()
  })

  it('저장 시 운동 생성 + /exercises로 이동 + 토스트', async () => {
    renderForm('/exercises/new')
    await userEvent.type(screen.getByPlaceholderText('운동 입력'), '신규 운동')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => {
      expect(screen.getByTestId('loc')).toHaveTextContent('/exercises')
    })
    const all = await exercisesRepo.findAll()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('신규 운동')
    expect(await screen.findByRole('status')).toHaveTextContent('운동이 추가되었습니다')
  })

  it('카테고리 최대 3개까지 선택, 4번째는 disabled', async () => {
    renderForm('/exercises/new')
    await userEvent.click(screen.getByRole('button', { name: '상체' }))
    await userEvent.click(screen.getByRole('button', { name: '하체' }))
    await userEvent.click(screen.getByRole('button', { name: '등' }))
    expect(screen.getByRole('button', { name: '어깨' })).toHaveClass('chip--disabled')
    // 토글: 상체 해제하면 다시 어깨 선택 가능
    await userEvent.click(screen.getByRole('button', { name: '상체' }))
    expect(screen.getByRole('button', { name: '어깨' })).not.toHaveClass('chip--disabled')
  })

  it('삭제 버튼 없음 (삭제는 상세 케밥에서)', () => {
    renderForm('/exercises/new')
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
  })
})

describe('ExerciseFormPage — 수정', () => {
  it('기존 값으로 채워짐 + 변경 전엔 저장 비활성', async () => {
    const ex = await exercisesRepo.create({
      name: '데드리프트',
      categories: ['back'],
      equipment: 'barbell',
    })
    renderForm(`/exercises/${ex.id}/edit`)
    await screen.findByDisplayValue('데드리프트')
    expect(screen.getByRole('heading', { name: '운동 수정' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('변경 후 저장 → 업데이트 + 토스트', async () => {
    const ex = await exercisesRepo.create({ name: 'orig' })
    renderForm(`/exercises/${ex.id}/edit`)
    const nameInput = await screen.findByDisplayValue('orig')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, '수정됨')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(async () => {
      const fresh = await exercisesRepo.findById(ex.id)
      expect(fresh?.name).toBe('수정됨')
    })
  })

  it('dirty 상태에서 뒤로 가기 → ConfirmDialog', async () => {
    const ex = await exercisesRepo.create({ name: 'orig' })
    renderForm(`/exercises/${ex.id}/edit`)
    const nameInput = await screen.findByDisplayValue('orig')
    await userEvent.type(nameInput, '!')
    await userEvent.click(screen.getByLabelText('뒤로'))
    expect(await screen.findByText(/저장하지 않은 변경사항/)).toBeInTheDocument()
  })

  it('기록 없으면 측정 방식 Select 노출', async () => {
    const ex = await exercisesRepo.create({ name: '운동', metric: 'reps' })
    renderForm(`/exercises/${ex.id}/edit`)
    await screen.findByDisplayValue('운동')
    expect(screen.getByText('측정 방식')).toBeInTheDocument()
    expect(screen.queryByText('기록이 있어 변경할 수 없습니다')).not.toBeInTheDocument()
  })

  it('기록이 있으면 측정 방식 잠김', async () => {
    const ex = await exercisesRepo.create({ name: '사용중운동', metric: 'reps' })
    await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: 'x',
      date: '2026-06-01',
      routine: [{ exerciseId: ex.id, sets: [{ weight: 0, reps: 10 }] }],
    })
    renderForm(`/exercises/${ex.id}/edit`)
    await screen.findByDisplayValue('사용중운동')
    expect(await screen.findByText('기록이 있어 변경할 수 없습니다')).toBeInTheDocument()
  })

  it('없는 id: "운동을 찾을 수 없습니다"', async () => {
    renderForm('/exercises/ex_none/edit')
    expect(await screen.findByText('운동을 찾을 수 없습니다')).toBeInTheDocument()
  })
})

describe('ExerciseFormPage — 어시스트 머신(보조 무게)', () => {
  const checkbox = () => screen.getByLabelText('보조 무게')

  it('체크해서 저장하면 assisted로 남는다', async () => {
    renderForm('/exercises/new')
    await userEvent.type(screen.getByPlaceholderText('운동 입력'), '어시스트 풀업')
    await userEvent.click(checkbox())
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(async () => {
      const list = await exercisesRepo.findAll()
      expect(list.find((e) => e.name === '어시스트 풀업')?.assisted).toBe(true)
    })
  })

  it('기본은 꺼져 있다', () => {
    renderForm('/exercises/new')
    expect(checkbox()).not.toBeChecked()
  })

  it('저장된 값이 수정 화면에 반영된다', async () => {
    const ex = await exercisesRepo.create({ name: '어시스트 딥스', assisted: true })
    renderForm(`/exercises/${ex.id}/edit`)
    await screen.findByDisplayValue('어시스트 딥스')
    expect(checkbox()).toBeChecked()
  })

  it('무게 × 횟수가 아니면 노출되지 않는다', async () => {
    const ex = await exercisesRepo.create({ name: '플랭크', metric: 'time' })
    renderForm(`/exercises/${ex.id}/edit`)
    await screen.findByDisplayValue('플랭크')
    expect(screen.queryByLabelText('보조 무게')).not.toBeInTheDocument()
  })
})

// 같은 운동이 둘로 갈리면 최고 기록과 향상 추적이 각각 반쪽이 된다.
// 피커(ExercisePicker)는 이미 막고 있었는데 이 폼만 통과시켰다.
describe('ExerciseFormPage — 이름 중복', () => {
  it('이미 있는 이름이면 저장할 수 없다', async () => {
    await exercisesRepo.create({ name: '벤치프레스', metric: 'weight_reps' })
    renderForm('/exercises/new')

    await userEvent.type(screen.getByPlaceholderText('운동 입력'), '벤치프레스')

    expect(await screen.findByText('같은 이름의 운동이 이미 있습니다')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('앞뒤 공백만 다른 것도 중복으로 본다', async () => {
    await exercisesRepo.create({ name: '벤치프레스', metric: 'weight_reps' })
    renderForm('/exercises/new')

    await userEvent.type(screen.getByPlaceholderText('운동 입력'), '  벤치프레스  ')

    expect(await screen.findByText('같은 이름의 운동이 이미 있습니다')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('다른 이름이면 그대로 저장된다', async () => {
    await exercisesRepo.create({ name: '벤치프레스', metric: 'weight_reps' })
    renderForm('/exercises/new')

    await userEvent.type(screen.getByPlaceholderText('운동 입력'), '인클라인 벤치프레스')

    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled())
    expect(screen.queryByText('같은 이름의 운동이 이미 있습니다')).not.toBeInTheDocument()
  })

  it('이름을 지우면 중복 안내도 사라진다 (빈 이름은 별개 문제)', async () => {
    await exercisesRepo.create({ name: '벤치프레스', metric: 'weight_reps' })
    renderForm('/exercises/new')

    const input = screen.getByPlaceholderText('운동 입력')
    await userEvent.type(input, '벤치프레스')
    await screen.findByText('같은 이름의 운동이 이미 있습니다')

    await userEvent.clear(input)
    await waitFor(() =>
      expect(screen.queryByText('같은 이름의 운동이 이미 있습니다')).not.toBeInTheDocument(),
    )
  })

  // 자기 자신을 중복으로 세면 이름을 안 바꾼 수정이 통째로 막힌다
  it('수정 중인 자기 이름은 중복이 아니다', async () => {
    const ex = await exercisesRepo.create({ name: '스쿼트', metric: 'weight_reps' })
    renderForm(`/exercises/${ex.id}/edit`)
    await screen.findByDisplayValue('스쿼트')

    expect(screen.queryByText('같은 이름의 운동이 이미 있습니다')).not.toBeInTheDocument()

    // 다른 항목을 바꿔 저장 가능한 상태로 만든다
    await userEvent.type(screen.getByPlaceholderText(/그립/), '오버핸드')
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled())
  })

  it('수정하면서 다른 운동의 이름으로 바꾸면 막는다', async () => {
    await exercisesRepo.create({ name: '데드리프트', metric: 'weight_reps' })
    const ex = await exercisesRepo.create({ name: '스쿼트', metric: 'weight_reps' })
    renderForm(`/exercises/${ex.id}/edit`)
    await screen.findByDisplayValue('스쿼트')

    const input = screen.getByPlaceholderText('운동 입력')
    await userEvent.clear(input)
    await userEvent.type(input, '데드리프트')

    expect(await screen.findByText('같은 이름의 운동이 이미 있습니다')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })
})

