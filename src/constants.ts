import type { MemberStatus, ExerciseCategory, Equipment } from './db/types.ts'

export const MEMBER_STATUS_OPTIONS: { value: MemberStatus; label: string }[] = [
  { value: 'active', label: '진행중' },
  { value: 'ended', label: '수업종료' },
]

export const EXERCISE_CATEGORY_OPTIONS: { value: ExerciseCategory; label: string }[] = [
  { value: 'upper', label: '상체' },
  { value: 'lower', label: '하체' },
  { value: 'back', label: '등' },
  { value: 'shoulder', label: '어깨' },
  { value: 'chest', label: '가슴' },
  { value: 'arm', label: '팔' },
  { value: 'core', label: '코어' },
  { value: 'full', label: '전신' },
  { value: 'cardio', label: '유산소' },
]

export const EXERCISE_CATEGORY_LABELS = Object.fromEntries(
  EXERCISE_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ExerciseCategory, string>

export const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'bodyweight', label: '맨몸' },
  { value: 'barbell', label: '바벨' },
  { value: 'dumbbell', label: '덤벨' },
  { value: 'kettlebell', label: '케틀벨' },
  { value: 'machine', label: '머신' },
  { value: 'band', label: '밴드' },
  { value: 'etc', label: '기타' },
]

export const EQUIPMENT_LABELS = Object.fromEntries(
  EQUIPMENT_OPTIONS.map((o) => [o.value, o.label]),
) as Record<Equipment, string>

// Legacy grip codes → Korean labels (grip is now free text).
const GRIP_LEGACY_LABELS: Record<string, string> = {
  none: '',
  overhand: '오버핸드',
  underhand: '언더핸드',
  neutral: '뉴트럴',
  etc: '기타',
}

export function gripLabel(grip: string): string {
  return GRIP_LEGACY_LABELS[grip] ?? grip
}
