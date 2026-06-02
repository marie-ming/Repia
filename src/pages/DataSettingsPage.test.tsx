import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { DataSettingsPage } from './DataSettingsPage.tsx'
import { ToastProvider } from '../components/Toast.tsx'

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <DataSettingsPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('DataSettingsPage', () => {
  it('백업/복원 섹션 노출', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: '데이터 관리' })).toBeInTheDocument()
    expect(screen.getByText('데이터 백업')).toBeInTheDocument()
    expect(screen.getByText('데이터 복원')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '백업 파일 내려받기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '백업 파일 선택' })).toBeInTheDocument()
  })

  it('사진 포함 토글 가능', async () => {
    renderPage()
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(true)
    await userEvent.click(checkbox)
    expect(checkbox.checked).toBe(false)
  })

  it('백업 내려받기 → exportBackup 호출 + 토스트', async () => {
    // a.click이 jsdom에서 동작하므로 그대로 가능 (createObjectURL은 mock 필요할 수 있음)
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    // URL.createObjectURL / revokeObjectURL mock
    const orig = globalThis.URL.createObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
    globalThis.URL.revokeObjectURL = vi.fn()

    renderPage()
    await userEvent.click(screen.getByRole('button', { name: '백업 파일 내려받기' }))
    expect(await screen.findByRole('status')).toHaveTextContent('백업 파일을 내려받았습니다')
    expect(clickSpy).toHaveBeenCalled()

    clickSpy.mockRestore()
    globalThis.URL.createObjectURL = orig
  })

  it('파일 선택 후 ConfirmDialog 표시 → 복원 확인 라벨', async () => {
    renderPage()
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['{}'], 'backup.json', { type: 'application/json' })
    await userEvent.upload(fileInput, file)
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/기존 데이터를 모두 덮어쓸까요/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '복원' })).toBeInTheDocument()
  })

  it('잘못된 백업 파일 복원 시 에러 다이얼로그', async () => {
    renderPage()
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['not json'], 'bad.json', { type: 'application/json' })
    await userEvent.upload(fileInput, file)
    await userEvent.click(await screen.findByRole('button', { name: '복원' }))
    expect(await screen.findByText('문제가 발생했습니다')).toBeInTheDocument()
  })
})
