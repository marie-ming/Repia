import type { ExerciseMetric, SetEntry } from '../db/types.ts'
import { formatDuration } from '../constants.ts'

// 측정 방식별 "최고" 수치 (없으면 null)
export function bestValue(metric: ExerciseMetric, sets: SetEntry[]): number | null {
  if (sets.length === 0) return null
  const v = (s: SetEntry) =>
    metric === 'reps'
      ? s.reps
      : metric === 'time'
        ? s.seconds ?? 0
        : metric === 'distance_time'
          ? s.distance ?? 0
          : s.weight
  return Math.max(...sets.map(v))
}

// "최고" 수치를 단위 포함 문자열로
export function formatBest(metric: ExerciseMetric, val: number): string {
  switch (metric) {
    case 'reps':
      return `${val}회`
    case 'time':
      return formatDuration(val)
    case 'distance_time':
      return `${val}km`
    default:
      return `${val}kg`
  }
}
