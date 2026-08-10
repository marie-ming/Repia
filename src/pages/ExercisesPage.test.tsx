import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ExercisesPage } from './ExercisesPage.tsx'
import { exercisesRepo } from '../db/repositories/exercises.ts'

function renderPage(initialEntry = '/exercises') {
  function PathProbe() {
    const loc = useLocation()
    return <div data-testid="loc">{loc.pathname}</div>
  }
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/exercises" element={<ExercisesPage />} />
        <Route path="*" element={<PathProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ExercisesPage', () => {
  it('운동이 없으면 빈 상태 + 필터 UI 미표시', async () => {
    renderPage()
    expect(await screen.findByText('등록된 운동이 없습니다')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('운동 이름 검색')).not.toBeInTheDocument()
  })

  it('운동 목록 표시', async () => {
    await exercisesRepo.create({ name: '데드리프트', categories: ['back'], equipment: 'barbell' })
    await exercisesRepo.create({ name: '벤치프레스', categories: ['chest'], equipment: 'barbell' })
    renderPage()
    expect(await screen.findByText('데드리프트')).toBeInTheDocument()
    expect(screen.getByText('벤치프레스')).toBeInTheDocument()
  })

  it('카테고리/장비 칩 행이 모두 노출', async () => {
    await exercisesRepo.create({ name: 'x', categories: ['back'], equipment: 'barbell' })
    renderPage()
    await screen.findByText('x')
    expect(screen.getByRole('button', { name: '등' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '바벨' })).toBeInTheDocument()
  })

  it('검색 필터', async () => {
    await exercisesRepo.create({ name: '데드리프트' })
    await exercisesRepo.create({ name: '벤치프레스' })
    renderPage()
    await screen.findByText('데드리프트')
    await userEvent.type(screen.getByPlaceholderText('운동 이름 검색'), '데')
    expect(screen.getByText('데드리프트')).toBeInTheDocument()
    expect(screen.queryByText('벤치프레스')).not.toBeInTheDocument()
  })

  it('카테고리 + 장비 AND 필터', async () => {
    await exercisesRepo.create({ name: '데드리프트', categories: ['back'], equipment: 'barbell' })
    await exercisesRepo.create({ name: '풀업', categories: ['back'], equipment: 'bodyweight' })
    await exercisesRepo.create({ name: '벤치프레스', categories: ['chest'], equipment: 'barbell' })
    renderPage()
    await screen.findByText('데드리프트')
    await userEvent.click(screen.getByRole('button', { name: '등' }))
    expect(screen.queryByText('벤치프레스')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '바벨' }))
    expect(screen.getByText('데드리프트')).toBeInTheDocument()
    expect(screen.queryByText('풀업')).not.toBeInTheDocument()
  })

  it('필터 결과 0개일 때 "해당하는 운동이 없습니다"', async () => {
    await exercisesRepo.create({ name: '데드리프트', categories: ['back'] })
    renderPage()
    await screen.findByText('데드리프트')
    await userEvent.type(screen.getByPlaceholderText('운동 이름 검색'), 'zzz')
    expect(screen.getByText('해당하는 운동이 없습니다')).toBeInTheDocument()
  })

  it('카드 클릭 시 상세 페이지로 이동', async () => {
    const ex = await exercisesRepo.create({ name: '데드리프트' })
    renderPage()
    await userEvent.click(await screen.findByText('데드리프트'))
    expect(screen.getByTestId('loc')).toHaveTextContent(`/exercises/${ex.id}`)
  })

  it('FAB 클릭 시 신규 등록 페이지로 이동', async () => {
    renderPage()
    await screen.findByText('등록된 운동이 없습니다')
    await userEvent.click(screen.getByLabelText('운동 추가'))
    expect(screen.getByTestId('loc')).toHaveTextContent('/exercises/new')
  })
})

// 필터를 useState로 들고 있으면 상세로 갔다 뒤로 왔을 때 화면이 다시 마운트되며 풀려버린다.
// URL 쿼리에 있으면 그 URL로 돌아오는 것만으로 복원된다.
describe('ExercisesPage 필터 유지 (URL 쿼리)', () => {
  async function seed() {
    await exercisesRepo.create({ name: '데드리프트', categories: ['back'], equipment: 'barbell' })
    await exercisesRepo.create({ name: '벤치프레스', categories: ['chest'], equipment: 'barbell' })
    await exercisesRepo.create({ name: '풀업', categories: ['back'], equipment: 'bodyweight' })
  }

  it('부위 칩을 누르면 URL 쿼리에 반영된다', async () => {
    await seed()
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: '등' }))
    expect(screen.getByText('데드리프트')).toBeInTheDocument()
    expect(screen.queryByText('벤치프레스')).not.toBeInTheDocument()
  })

  it('필터가 담긴 URL로 들어오면 그대로 적용된 상태로 보인다 (뒤로가기 복원)', async () => {
    await seed()
    renderPage('/exercises?cat=back&eq=barbell')
    expect(await screen.findByText('데드리프트')).toBeInTheDocument()
    expect(screen.queryByText('벤치프레스')).not.toBeInTheDocument()
    expect(screen.queryByText('풀업')).not.toBeInTheDocument()
  })

  it('검색어도 URL에서 복원된다', async () => {
    await seed()
    renderPage('/exercises?q=벤치')
    expect(await screen.findByDisplayValue('벤치')).toBeInTheDocument()
    expect(screen.getByText('벤치프레스')).toBeInTheDocument()
    expect(screen.queryByText('데드리프트')).not.toBeInTheDocument()
  })

  it('알 수 없는 값이 들어오면 전체로 취급한다', async () => {
    await seed()
    renderPage('/exercises?cat=이상한값')
    expect(await screen.findByText('데드리프트')).toBeInTheDocument()
    expect(screen.getByText('벤치프레스')).toBeInTheDocument()
  })
})
