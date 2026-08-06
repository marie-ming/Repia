import type { ExerciseMetric, SetEntry } from '../db/types.ts'
import { formatDuration } from '../constants.ts'

// 어시스트(보조 무게)는 적을수록 잘한 것 — 최소값이 최고 기록이 된다.
// 비워둔 세트의 0이 "보조 0kg"으로 최고가 되어버리므로 0은 미입력으로 보고 제외한다.
// (보조 없이 성공한 경우는 어시스트 머신이 아니라 맨몸 운동으로 기록하는 게 맞다)
export function isAssistedWeight(metric: ExerciseMetric, assisted?: boolean): boolean {
  return !!assisted && metric === 'weight_reps'
}

// 측정 방식별 "최고" 수치 (없으면 null)
export function bestValue(
  metric: ExerciseMetric,
  sets: SetEntry[],
  assisted?: boolean,
): number | null {
  if (sets.length === 0) return null
  if (isAssistedWeight(metric, assisted)) {
    const weights = sets.map((s) => s.weight).filter((w) => w > 0)
    return weights.length ? Math.min(...weights) : null
  }
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

// 이전 기록 대비 향상 여부 (어시스트는 줄어야 향상)
export function isImproved(
  metric: ExerciseMetric,
  cur: number,
  prev: number,
  assisted?: boolean,
): boolean {
  return isAssistedWeight(metric, assisted) ? cur < prev : cur > prev
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
