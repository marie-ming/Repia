import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MembersPage } from './MembersPage.tsx'
import { PersonalHomePage } from './PersonalHomePage.tsx'
import { RoutineLogFormPage } from './RoutineLogFormPage.tsx'
import { ExerciseFormPage } from './ExerciseFormPage.tsx'
import { ToastProvider } from '../components/Toast.tsx'
import { ModeContext } from '../components/ModeContext.tsx'
import { membersRepo } from '../db/repositories/members.ts'
import { routineLogsRepo } from '../db/repositories/routineLogs.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { appConfigRepo } from '../db/repositories/appConfig.ts'

// 데이터를 못 읽었을 때의 화면. 예전에는 로딩 플래그를 세우는 줄에 도달하지 못해
// 「불러오는 중...」에서 영영 멈췄고, 사용자에게는 아무 설명도 없었다.

function renderAt(path: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <ModeContext.Provider value={{ mode: 'personal', setMode: async () => {} }}>
          <Routes>
            <Route path={path} element={element} />
            <Route path="*" element={<div>다른 화면</div>} />
          </Routes>
        </ModeContext.Provider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('목록에서 읽기 실패', () => {
  it('「불러오는 중...」에 멈추지 않고 실패를 알린다', async () => {
    vi.spyOn(membersRepo, 'findAll').mockRejectedValue(new Error('DB 접근 불가'))
    renderAt('/members', <MembersPage />)

    expect(await screen.findByText('기록을 불러오지 못했습니다.')).toBeInTheDocument()
    expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument()
  })

  it('빈 상태로 둘러대지 않는다 (없는 것과 못 읽은 것은 다르다)', async () => {
    vi.spyOn(membersRepo, 'findAll').mockRejectedValue(new Error('DB 접근 불가'))
    renderAt('/members', <MembersPage />)

    await screen.findByText('기록을 불러오지 못했습니다.')
    expect(screen.queryByText('등록된 회원이 없습니다')).not.toBeInTheDocument()
  })

  it('다시 시도가 실제로 복구시킨다', async () => {
    const spy = vi
      .spyOn(membersRepo, 'findAll')
      .mockRejectedValueOnce(new Error('일시적 실패'))
      .mockResolvedValue([])
    renderAt('/members', <MembersPage />)

    await screen.findByText('기록을 불러오지 못했습니다.')
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(await screen.findByText('등록된 회원이 없습니다')).toBeInTheDocument()
    expect(screen.queryByText('기록을 불러오지 못했습니다.')).not.toBeInTheDocument()
    expect(spy).toHaveBeenCalledTimes(2)
  })
})

describe('홈에서 읽기 실패', () => {
  it('「이번 달 기록이 없습니다」로 둘러대지 않는다', async () => {
    vi.spyOn(routineLogsRepo, 'findByDateRange').mockRejectedValue(new Error('DB 접근 불가'))
    renderAt('/', <PersonalHomePage />)

    expect(await screen.findByText('기록을 불러오지 못했습니다.')).toBeInTheDocument()
    expect(screen.queryByText('이번 달 기록이 없습니다.')).not.toBeInTheDocument()
  })
})

describe('기록 작성 화면에서 읽기 실패', () => {
  it('멈추지 않고 실패를 알린다', async () => {
    vi.spyOn(exercisesRepo, 'findAll').mockRejectedValue(new Error('DB 접근 불가'))
    renderAt('/logs/new', <RoutineLogFormPage />)

    expect(await screen.findByText('기록을 불러오지 못했습니다.')).toBeInTheDocument()
    expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument()
  })

  // 복원한 백업에 망가진 초안이 들어 있으면 이 화면이 초안을 읽다 멈췄고,
  // 초안을 지울 UI가 없어서 전체 초기화 말고는 빠져나갈 방법이 없었다.
  it('망가진 초안이 있어도 정상적으로 열린다', async () => {
    await appConfigRepo.set('logDraft', {
      savedAt: new Date().toISOString(),
      form: { title: '망가짐' }, // exercises 없음 → 예전에는 여기서 TypeError
    })
    // 지우지 말 것: 쓰기만 하고 바로 렌더하면 트랜잭션이 커밋되기 전에 페이지가 읽어
    // 초안이 없는 것으로 지나가고, 그러면 이 테스트가 아무것도 검증하지 않은 채 통과한다.
    // (가드를 제거한 변이에서 1/3만 실패하던 원인)
    expect(await appConfigRepo.get('logDraft')).not.toBeNull()

    renderAt('/logs/new', <RoutineLogFormPage />)

    expect(await screen.findByRole('button', { name: '저장' })).toBeInTheDocument()
    expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument()
    expect(screen.queryByText('기록을 불러오지 못했습니다.')).not.toBeInTheDocument()
    // 복구 여부도 묻지 않는다 (물어봐야 복구할 게 없다)
    expect(screen.queryByText(/작성 중이던/)).not.toBeInTheDocument()
  })
})

describe('운동 수정 화면에서 읽기 실패', () => {
  it('멈추지 않고 실패를 알린다', async () => {
    vi.spyOn(exercisesRepo, 'findAll').mockRejectedValue(new Error('DB 접근 불가'))
    render(
      <MemoryRouter initialEntries={['/exercises/ex_1/edit']}>
        <ToastProvider>
          <Routes>
            <Route path="/exercises/:id/edit" element={<ExerciseFormPage />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('기록을 불러오지 못했습니다.')).toBeInTheDocument()
    expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument()
  })
})

