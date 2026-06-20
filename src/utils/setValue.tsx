import type { ExerciseMetric, SetEntry } from '../db/types.ts'
import { formatDuration } from '../constants.ts'

// 세트 값을 숫자/단위로 나눠 렌더 (숫자 강조, 단위는 <em>로 죽임).
// routine-readonly 목록에서 숫자/단위 대비 스타일이 적용된다.
export function renderSetValue(metric: ExerciseMetric, s: SetEntry) {
  switch (metric) {
    case 'reps':
      return (
        <>
          {s.reps}
          <em>회</em>
        </>
      )
    case 'time':
      return <>{formatDuration(s.seconds ?? 0)}</>
    case 'distance_time':
      return (
        <>
          {s.distance ?? 0}
          <em>km · </em>
          {formatDuration(s.seconds ?? 0)}
        </>
      )
    default:
      return (
        <>
          {s.weight}
          <em>kg × </em>
          {s.reps}
          <em>회</em>
        </>
      )
  }
}
