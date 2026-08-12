// 데이터가 전부 브라우저(IndexedDB)에만 있어 백업을 안 하면 복구할 방법이 없다.
// 사용자가 스스로 기억해서 누르길 기대하는 대신, 오래됐으면 설정에서 알려준다.

export const BACKUP_STALE_DAYS = 14

export type BackupStatus =
  | { kind: 'none' } // 백업할 데이터가 아직 없음 — 안내하지 않는다
  | { kind: 'never' } // 기록은 있는데 한 번도 백업한 적 없음
  | { kind: 'stale'; days: number } // 마지막 백업이 오래됨
  | { kind: 'fresh'; days: number }

export function daysSince(iso: string, now: Date): number {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY
  return Math.floor((now.getTime() - then) / 86_400_000)
}

// hasData: 회원·운동·기록 등이 하나라도 있는지. 빈 앱에 백업하라고 하면 잔소리만 된다.
export function backupStatus(
  lastBackupAt: string | null,
  hasData: boolean,
  now: Date = new Date(),
): BackupStatus {
  if (!hasData) return { kind: 'none' }
  if (!lastBackupAt) return { kind: 'never' }
  const days = daysSince(lastBackupAt, now)
  return days >= BACKUP_STALE_DAYS ? { kind: 'stale', days } : { kind: 'fresh', days }
}

export function needsBackupReminder(status: BackupStatus): boolean {
  return status.kind === 'never' || status.kind === 'stale'
}

// 설정 화면 등에 보여줄 한 줄
export function backupStatusLabel(status: BackupStatus): string | null {
  switch (status.kind) {
    case 'none':
      return null
    case 'never':
      return '아직 백업한 적 없음'
    case 'stale':
      return `마지막 백업 ${status.days}일 전`
    case 'fresh':
      return status.days === 0 ? '오늘 백업함' : `마지막 백업 ${status.days}일 전`
  }
}
