import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { SettingsPage } from './SettingsPage.tsx'
import { appConfigRepo } from '../db/repositories/appConfig.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { BACKUP_STALE_DAYS } from '../utils/backupReminder.ts'

function renderPage() {
  function PathProbe() {
    const loc = useLocation()
    return <div data-testid="loc">{loc.pathname}</div>
  }
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<PathProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  it('타이틀 + 데이터 관리 메뉴 + 버전 노출', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: '설정' })).toBeInTheDocument()
    expect(screen.getByText('데이터 관리')).toBeInTheDocument()
    expect(screen.getByText(/^v\d/)).toBeInTheDocument()
  })

  it('데이터 관리 클릭 시 /settings/data 이동', async () => {
    renderPage()
    await userEvent.click(screen.getByText('데이터 관리'))
    expect(screen.getByTestId('loc')).toHaveTextContent('/settings/data')
  })
})

// 데이터가 전부 브라우저에만 있어 백업을 안 하면 복구할 방법이 없다.
describe('SettingsPage 백업 안내', () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

  it('데이터가 없으면 안내하지 않는다', async () => {
    renderPage()
    expect(await screen.findByText('백업 · 복원')).toBeInTheDocument()
    expect(screen.queryByLabelText('백업 필요')).not.toBeInTheDocument()
  })

  it('데이터는 있는데 백업한 적 없으면 안내', async () => {
    await exercisesRepo.create({ name: '운동' })
    renderPage()
    expect(await screen.findByText('아직 백업한 적 없음')).toBeInTheDocument()
    expect(screen.getByLabelText('백업 필요')).toBeInTheDocument()
  })

  it('최근에 백업했으면 안내하지 않고 경과일만 보여준다', async () => {
    await exercisesRepo.create({ name: '운동' })
    await appConfigRepo.setLastBackupAt(daysAgo(2))
    renderPage()
    expect(await screen.findByText('마지막 백업 2일 전')).toBeInTheDocument()
    expect(screen.queryByLabelText('백업 필요')).not.toBeInTheDocument()
  })

  it('오래되면 안내', async () => {
    await exercisesRepo.create({ name: '운동' })
    await appConfigRepo.setLastBackupAt(daysAgo(BACKUP_STALE_DAYS + 3))
    renderPage()
    expect(await screen.findByText(`마지막 백업 ${BACKUP_STALE_DAYS + 3}일 전`)).toBeInTheDocument()
    expect(screen.getByLabelText('백업 필요')).toBeInTheDocument()
  })
})
