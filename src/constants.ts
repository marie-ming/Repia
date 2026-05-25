import type { MemberStatus } from './db/types.ts'

export const MEMBER_STATUS_OPTIONS: { value: MemberStatus; label: string }[] = [
  { value: 'active', label: '진행중' },
  { value: 'ended', label: '수업종료' },
]

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  active: '진행중',
  ended: '수업종료',
}
