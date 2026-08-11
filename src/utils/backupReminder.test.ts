import { describe, expect, it } from 'vitest'
import {
  BACKUP_STALE_DAYS,
  backupStatus,
  backupStatusLabel,
  daysSince,
  needsBackupReminder,
} from './backupReminder.ts'

const NOW = new Date('2026-08-10T12:00:00.000Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

describe('daysSince', () => {
  it('경과 일수를 내림으로', () => {
    expect(daysSince(daysAgo(0), NOW)).toBe(0)
    expect(daysSince(daysAgo(1), NOW)).toBe(1)
    expect(daysSince(daysAgo(30), NOW)).toBe(30)
  })

  it('깨진 값은 무한대로 취급해 "오래됨"이 되게', () => {
    expect(daysSince('not-a-date', NOW)).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('backupStatus', () => {
  it('데이터가 없으면 안내하지 않는다 (빈 앱에 잔소리 금지)', () => {
    expect(backupStatus(null, false, NOW)).toEqual({ kind: 'none' })
    expect(backupStatus(daysAgo(999), false, NOW)).toEqual({ kind: 'none' })
  })

  it('데이터는 있는데 백업한 적 없으면 never', () => {
    expect(backupStatus(null, true, NOW)).toEqual({ kind: 'never' })
  })

  it('기준일 미만이면 fresh', () => {
    expect(backupStatus(daysAgo(BACKUP_STALE_DAYS - 1), true, NOW)).toEqual({
      kind: 'fresh',
      days: BACKUP_STALE_DAYS - 1,
    })
  })

  it('기준일에 도달하면 stale (경계 포함)', () => {
    expect(backupStatus(daysAgo(BACKUP_STALE_DAYS), true, NOW)).toEqual({
      kind: 'stale',
      days: BACKUP_STALE_DAYS,
    })
  })
})

describe('needsBackupReminder', () => {
  it('never와 stale일 때만 안내', () => {
    expect(needsBackupReminder({ kind: 'none' })).toBe(false)
    expect(needsBackupReminder({ kind: 'fresh', days: 3 })).toBe(false)
    expect(needsBackupReminder({ kind: 'never' })).toBe(true)
    expect(needsBackupReminder({ kind: 'stale', days: 20 })).toBe(true)
  })
})

describe('backupStatusLabel', () => {
  it('상태별 문구', () => {
    expect(backupStatusLabel({ kind: 'none' })).toBeNull()
    expect(backupStatusLabel({ kind: 'never' })).toBe('아직 백업한 적 없음')
    expect(backupStatusLabel({ kind: 'stale', days: 20 })).toBe('마지막 백업 20일 전')
    expect(backupStatusLabel({ kind: 'fresh', days: 0 })).toBe('오늘 백업함')
    expect(backupStatusLabel({ kind: 'fresh', days: 3 })).toBe('마지막 백업 3일 전')
  })
})
