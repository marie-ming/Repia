import type {
  MemberStatus,
  ExerciseCategory,
  Equipment,
  SessionStatus,
  RoutineLogStatus,
  ExerciseMetric,
  SetEntry,
} from './db/types.ts'

export const MEMBER_STATUS_OPTIONS: { value: MemberStatus; label: string }[] = [
  { value: 'active', label: '진행중' },
  { value: 'ended', label: '수업종료' },
]

export const SESSION_STATUS_OPTIONS: { value: SessionStatus; label: string }[] = [
  { value: 'reserved', label: '예약' },
  { value: 'completed', label: '완료' },
  { value: 'cancelled', label: '취소' },
]

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  reserved: '예약',
  completed: '완료',
  cancelled: '취소',
}

export const ROUTINE_LOG_STATUS_OPTIONS: { value: RoutineLogStatus; label: string }[] = [
  { value: 'planned', label: '예정' },
  { value: 'completed', label: '완료' },
  { value: 'cancelled', label: '취소' },
]

export const ROUTINE_LOG_STATUS_LABELS: Record<RoutineLogStatus, string> = {
  planned: '예정',
  completed: '완료',
  cancelled: '취소',
}

export const EXERCISE_CATEGORY_OPTIONS: { value: ExerciseCategory; label: string }[] = [
  { value: 'upper', label: '상체' },
  { value: 'lower', label: '하체' },
  { value: 'back', label: '등' },
  { value: 'shoulder', label: '어깨' },
  { value: 'chest', label: '가슴' },
  { value: 'biceps', label: '이두' },
  { value: 'triceps', label: '삼두' },
  { value: 'forearm', label: '전완' },
  { value: 'core', label: '코어' },
  { value: 'full', label: '전신' },
  { value: 'cardio', label: '유산소' },
]

// Includes legacy 'arm' for display fallback of existing records.
export const EXERCISE_CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  ...Object.fromEntries(EXERCISE_CATEGORY_OPTIONS.map((o) => [o.value, o.label])),
  arm: '팔',
} as Record<ExerciseCategory, string>

export const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'bodyweight', label: '맨몸' },
  { value: 'barbell', label: '바벨' },
  { value: 'dumbbell', label: '덤벨' },
  { value: 'kettlebell', label: '케틀벨' },
  { value: 'machine', label: '머신' },
  { value: 'cable', label: '케이블' },
  { value: 'band', label: '밴드' },
  { value: 'etc', label: '기타' },
]

export const EQUIPMENT_LABELS = Object.fromEntries(
  EQUIPMENT_OPTIONS.map((o) => [o.value, o.label]),
) as Record<Equipment, string>

export const EXERCISE_METRIC_OPTIONS: { value: ExerciseMetric; label: string }[] = [
  { value: 'weight_reps', label: '무게 × 횟수' },
  { value: 'reps', label: '횟수' },
  { value: 'time', label: '시간' },
  { value: 'distance_time', label: '거리 + 시간' },
]

export const EXERCISE_METRIC_LABELS = Object.fromEntries(
  EXERCISE_METRIC_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ExerciseMetric, string>

// 초 → "m:ss"
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// 세트 한 줄 표시 (측정 방식별)
export function formatSet(metric: ExerciseMetric, s: SetEntry): string {
  switch (metric) {
    case 'reps':
      return `${s.reps}회`
    case 'time':
      return formatDuration(s.seconds ?? 0)
    case 'distance_time':
      return `${s.distance ?? 0}km · ${formatDuration(s.seconds ?? 0)}`
    default:
      return `${s.weight}kg × ${s.reps}회`
  }
}

// 세트 축약 표시 (같은 운동 칩처럼 단위 생략해도 되는 곳)
export function formatSetShort(metric: ExerciseMetric, s: SetEntry): string {
  switch (metric) {
    case 'reps':
      return `${s.reps}회`
    case 'time':
      return formatDuration(s.seconds ?? 0)
    case 'distance_time':
      return `${s.distance ?? 0}km·${formatDuration(s.seconds ?? 0)}`
    default:
      return `${s.weight}kg×${s.reps}`
  }
}

// 여러 세트 중 측정 방식별 "최고 기록" 한 줄 (없으면 null)
export function bestSetLabel(metric: ExerciseMetric, sets: SetEntry[]): string | null {
  if (sets.length === 0) return null
  switch (metric) {
    case 'reps':
      return `최고 ${Math.max(...sets.map((s) => s.reps))}회`
    case 'time':
      return `최장 ${formatDuration(Math.max(...sets.map((s) => s.seconds ?? 0)))}`
    case 'distance_time':
      return `최장 ${Math.max(...sets.map((s) => s.distance ?? 0))}km`
    default:
      return `최고 ${Math.max(...sets.map((s) => s.weight))}kg`
  }
}

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
