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

// 값이 하나도 안 들어간 세트는 기록이 아니다.
// 계획만 세워두고 건너뛴 운동이 `0kg × 0회`로 남아 최고·지난 기록으로 잡히면,
// 다음에 그 운동을 할 때 실제 직전 기록을 건너뛰고 0과 비교해 늘 ▲가 뜬다.
// 다만 맨몸 운동의 `0kg × 10회`는 진짜 기록이라 "무게가 0"만으로 버리면 안 된다.
export function isRecordedSet(
  metric: ExerciseMetric,
  s: SetEntry,
  assisted?: boolean,
): boolean {
  // 어시스트는 보조 무게가 0이면 미입력이다
  // (보조 없이 성공했다면 어시스트 머신이 아니라 맨몸 운동으로 기록하는 게 맞다)
  if (isAssistedWeight(metric, assisted)) return s.weight > 0

  switch (metric) {
    case 'reps':
      return s.reps > 0
    case 'time':
      return (s.seconds ?? 0) > 0
    case 'distance_time':
      return (s.distance ?? 0) > 0 || (s.seconds ?? 0) > 0
    default:
      return s.weight > 0 || s.reps > 0
  }
}

// a가 b보다 나은 기록인가
function isBetterSet(
  metric: ExerciseMetric,
  a: SetEntry,
  b: SetEntry,
  assisted?: boolean,
): boolean {
  // 보조는 적을수록 낫고, 보조가 같으면 더 많이 한 쪽
  if (isAssistedWeight(metric, assisted)) {
    if (a.weight !== b.weight) return a.weight < b.weight
    return a.reps > b.reps
  }

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
    // 무게 우선, 같은 무게면 더 많은 횟수.
    // 같은 무게로 8회 → 14회는 명백한 향상인데 무게만 보면 신호가 안 뜬다.
    // (distance_time의 "거리 우선, 같으면 시간"과 같은 규칙)
    default:
      if (a.weight !== b.weight) return a.weight > b.weight
      return a.reps > b.reps
  }
}

// 여러 세트 중 가장 나은 세트 (없으면 null)
export function bestSet(
  metric: ExerciseMetric,
  sets: SetEntry[],
  assisted?: boolean,
): SetEntry | null {
  const candidates = sets.filter((s) => isRecordedSet(metric, s, assisted))
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
    // 횟수까지 비교에 쓰므로 표시도 두 축을 다 보여준다.
    // 아니면 「최고 20kg ▲ 지난 20kg」처럼 같은 숫자에 화살표만 뜬다.
    // 맨몸(0kg)은 무게를 빼고 횟수만 — 「0kg×12」의 0kg은 군더더기다.
    default:
      return s.weight > 0 ? `${s.weight}kg×${s.reps}` : `${s.reps}회`
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
