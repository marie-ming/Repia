import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exportBackup, importBackup, resetAllData } from '../db/backup.ts'
import { seedDemoData } from '../db/seed.ts'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { useToast } from '../components/Toast.tsx'
import { ChevronLeftIcon } from '../components/icons.tsx'

export function DataSettingsPage() {
  const navigate = useNavigate()
  const showToast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [includesPhotos, setIncludesPhotos] = useState(true)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleExport() {
    try {
      setBusy(true)
      await exportBackup({ includesPhotos })
      showToast('백업 파일을 내려받았습니다')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '백업에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPendingFile(file)
    e.target.value = ''
  }

  async function handleSeed() {
    try {
      setBusy(true)
      await resetAllData()
      await seedDemoData()
      showToast('데모 데이터가 채워졌습니다')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '데모 데이터 주입 실패')
    } finally {
      setBusy(false)
    }
  }

  async function handleReset() {
    setConfirmReset(false)
    try {
      setBusy(true)
      await resetAllData()
      showToast('모든 데이터가 초기화되었습니다')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '초기화에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmImport() {
    if (!pendingFile) return
    const file = pendingFile
    setPendingFile(null)
    try {
      setBusy(true)
      const { includesPhotos: imported } = await importBackup(file)
      showToast(
        imported
          ? '복원이 완료되었습니다'
          : '복원 완료 (사진은 포함되지 않은 백업이었습니다)',
      )
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '복원에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="detail">
      <header className="detail__bar">
        <button type="button" className="detail__back" onClick={() => navigate(-1)} aria-label="뒤로">
          <ChevronLeftIcon />
        </button>
        <h1 className="detail__bar-title">데이터 관리</h1>
        <span className="detail__bar-spacer" aria-hidden="true" />
      </header>
      <div className="detail__body">
        <section className="settings-section">
          <h2 className="settings-section__title">데이터 백업</h2>
          <p className="settings-section__desc">
            모든 데이터를 JSON 파일로 내보냅니다.
          </p>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={includesPhotos}
              onChange={(e) => setIncludesPhotos(e.target.checked)}
            />
            <span>사진 포함</span>
          </label>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleExport}
            disabled={busy}
          >
            백업 파일 내려받기
          </button>
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">데이터 복원</h2>
          <p className="settings-section__desc settings-section__desc--warn">
            기존 데이터가 모두 삭제되고 백업 파일로 교체됩니다.
          </p>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            백업 파일 선택
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handleFileChange}
          />
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">데모 데이터</h2>
          <p className="settings-section__desc settings-section__desc--warn">
            현재 데이터를 지우고 검증용 회원·운동·수업·기록을 채웁니다.
          </p>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleSeed}
            disabled={busy}
          >
            데모 데이터 채우기
          </button>
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">설정 및 데이터 초기화</h2>
          <p className="settings-section__desc settings-section__desc--warn">
            모든 데이터와 모드 설정이 삭제되어 최초 상태로 돌아갑니다.
          </p>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setConfirmReset(true)}
            disabled={busy}
          >
            초기화
          </button>
        </section>
      </div>

      <ConfirmDialog
        open={!!pendingFile}
        title="기존 데이터를 모두 덮어쓸까요?"
        message={
          pendingFile
            ? `'${pendingFile.name}'\n현재 모든 데이터가 삭제됩니다.`
            : ''
        }
        confirmLabel="복원"
        danger
        onConfirm={confirmImport}
        onCancel={() => setPendingFile(null)}
      />

      <ConfirmDialog
        open={confirmReset}
        title="정말 초기화할까요?"
        message="모든 회원·운동·수업·루틴·기록과 모드 설정이 삭제됩니다. 복구할 수 없습니다."
        confirmLabel="초기화"
        danger
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />

      <ConfirmDialog
        open={!!errorMessage}
        title="문제가 발생했습니다"
        message={errorMessage ?? ''}
        confirmLabel="확인"
        hideCancel
        onConfirm={() => setErrorMessage(null)}
        onCancel={() => setErrorMessage(null)}
      />
    </div>
  )
}
