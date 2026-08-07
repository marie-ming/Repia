import type { ExerciseMetric, SetEntry } from '../db/types.ts'
import { formatDuration } from '../constants.ts'

// 기록 비교는 세트 단위로 한다. 값 하나로는 `거리 + 시간`처럼 두 축을 가진 기록을
// 표현할 수 없기 때문(5km 25분 vs 5km 30분은 숫자 하나로 구분되지 않는다).

// 어시스트(보조 무게)는 적을수록 잘한 것 — 최소값이 최고 기록이 된다.
// 비워둔 세트의 0이 "보조 0kg"으로 최고가 되어버리므로 0은 미입력으로 보고 제외한다.
// (보조 없이 성공한 경우는 어시스트 머신이 아니라 맨몸 운동으로 기록하는 게 맞다)
export function isAssistedWeight(metric: ExerciseMetric, assisted?: boolean): boolean {
  return !!assisted && metric === 'weight_reps'
}

// a가 b보다 나은 기록인가
function isBetterSet(
  metric: ExerciseMetric,
  a: SetEntry,
  b: SetEntry,
  assisted?: boolean,
): boolean {
  if (isAssistedWeight(metric, assisted)) return a.weight < b.weight

  switch (metric) {
    case 'reps':
      return a.reps > b.reps
    case 'time':
      return (a.seconds ?? 0) > (b.seconds ?? 0)
    // 거리 우선, 같은 거리면 더 빠른 시간. 시간 0은 미입력으로 보고 기록된 쪽에 밀린다
    case 'distance_time': {
      const da = a.distance ?? 0
      const db = b.distance ?? 0
      if (da !== db) return da > db
      const ta = a.seconds ?? 0
      const tb = b.seconds ?? 0
      if (ta === 0) return false
      if (tb === 0) return true
      return ta < tb
    }
    default:
      return a.weight > b.weight
  }
}

// 여러 세트 중 가장 나은 세트 (없으면 null)
export function bestSet(
  metric: ExerciseMetric,
  sets: SetEntry[],
  assisted?: boolean,
): SetEntry | null {
  // 어시스트는 최소값을 뽑으므로 비워둔 0이 최고가 되지 않게 먼저 걸러낸다
  const candidates = isAssistedWeight(metric, assisted)
    ? sets.filter((s) => s.weight > 0)
    : sets
  if (candidates.length === 0) return null
  return candidates.reduce((best, s) => (isBetterSet(metric, s, best, assisted) ? s : best))
}

// 이전 기록 대비 향상 여부
export function isImprovedSet(
  metric: ExerciseMetric,
  cur: SetEntry,
  prev: SetEntry,
  assisted?: boolean,
): boolean {
  return isBetterSet(metric, cur, prev, assisted)
}

// 우열을 가릴 수 없는(같은) 기록인가 — ▲▼를 숨길지 판단용
export function isSameRecord(
  metric: ExerciseMetric,
  a: SetEntry,
  b: SetEntry,
  assisted?: boolean,
): boolean {
  return !isBetterSet(metric, a, b, assisted) && !isBetterSet(metric, b, a, assisted)
}

// "최고" 기록을 단위 포함 문자열로
export function formatBestSet(metric: ExerciseMetric, s: SetEntry): string {
  switch (metric) {
    case 'reps':
      return `${s.reps}회`
    case 'time':
      return formatDuration(s.seconds ?? 0)
    case 'distance_time': {
      const t = s.seconds ?? 0
      return t ? `${s.distance ?? 0}km ${formatDuration(t)}` : `${s.distance ?? 0}km`
    }
    default:
      return `${s.weight}kg`
  }
}

// 여러 세트 중 측정 방식별 "최고 기록" 한 줄 (없으면 null)
export function bestSetLabel(
  metric: ExerciseMetric,
  sets: SetEntry[],
  assisted?: boolean,
): string | null {
  const best = bestSet(metric, sets, assisted)
  if (!best) return null
  if (isAssistedWeight(metric, assisted)) return `보조 ${formatBestSet(metric, best)}`
  const prefix = metric === 'time' || metric === 'distance_time' ? '최장' : '최고'
  return `${prefix} ${formatBestSet(metric, best)}`
}
