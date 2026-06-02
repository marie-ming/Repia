import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { SettingsPage } from './SettingsPage.tsx'

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
