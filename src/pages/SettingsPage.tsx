import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRightIcon } from '../components/icons.tsx'
import { appConfigRepo } from '../db/repositories/appConfig.ts'
import { membersRepo } from '../db/repositories/members.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { routineLogsRepo } from '../db/repositories/routineLogs.ts'
import { sessionsRepo } from '../db/repositories/sessions.ts'
import {
  backupStatus,
  backupStatusLabel,
  needsBackupReminder,
  type BackupStatus,
} from '../utils/backupReminder.ts'

interface MenuItem {
  label: string
  desc?: string
  to: string
}

const ITEMS: MenuItem[] = [
  { label: '데이터 관리', desc: '백업 · 복원', to: '/settings/data' },
  { label: '업데이트 내역', desc: '버전별 변경 사항', to: '/settings/updates' },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const [backup, setBackup] = useState<BackupStatus>({ kind: 'none' })

  const load = useCallback(async () => {
    const [lastBackupAt, members, exercises, logs, sessions] = await Promise.all([
      appConfigRepo.getLastBackupAt(),
      membersRepo.findAll(),
      exercisesRepo.findAll(),
      routineLogsRepo.findAll(),
      sessionsRepo.findAll(),
    ])
    const hasData =
      members.length > 0 || exercises.length > 0 || logs.length > 0 || sessions.length > 0
    setBackup(backupStatus(lastBackupAt, hasData))
  }, [])

  useEffect(() => {
    // 여기서만 실패를 삼킨다. 백업 안내는 부가 정보인데 이걸 못 읽었다고 메뉴를
    // 에러 화면으로 덮으면, 정작 복구에 필요한 「데이터 관리」로 들어갈 수 없다.
    load().catch(() => setBackup({ kind: 'none' }))
  }, [load])

  const remind = needsBackupReminder(backup)

  return (
    <div className="page page--settings">
      <header className="page__header">
        <h1 className="page__title">설정</h1>
      </header>

      <ul className="menu-list">
        {ITEMS.map((it) => {
          // 데이터 관리 항목에만 백업 상태를 덧붙인다
          const isData = it.to === '/settings/data'
          const statusLabel = isData ? backupStatusLabel(backup) : null
          return (
            <li key={it.to}>
              <button type="button" className="menu-list__item" onClick={() => navigate(it.to)}>
                <span className="menu-list__body">
                  <span className="menu-list__label">
                    {it.label}
                    {isData && remind && <span className="menu-list__dot" aria-label="백업 필요" />}
                  </span>
                  {statusLabel ? (
                    <span
                      className={
                        remind ? 'menu-list__desc menu-list__desc--warn' : 'menu-list__desc'
                      }
                    >
                      {statusLabel}
                    </span>
                  ) : (
                    it.desc && <span className="menu-list__desc">{it.desc}</span>
                  )}
                </span>
                <ChevronRightIcon className="menu-list__chevron" />
              </button>
            </li>
          )
        })}
      </ul>

      <p className="settings__version">v{__APP_VERSION__}</p>
    </div>
  )
}
