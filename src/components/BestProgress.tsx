import type { ExerciseMetric, SetEntry } from '../db/types.ts'
import {
  bestSet,
  formatBestSet,
  isAssistedWeight,
  isImprovedSet,
  isSameRecord,
} from '../utils/setStats.ts'

interface BestProgressProps {
  metric: ExerciseMetric
  sets: SetEntry[]
  prev: SetEntry | null // 직전 완료 기록의 최고 세트 (없으면 null)
  assisted?: boolean
}

// 운동명 옆의 "최고 X ▲ 지난 Y" 배지. 기록 상세와 수업 상세가 함께 쓴다.
export function BestProgress({ metric, sets, prev, assisted }: BestProgressProps) {
  const cur = bestSet(metric, sets, assisted)
  if (!cur) return null

  // 어시스트는 보조가 줄어야 향상이라 문구도 "최고" 대신 "보조"
  const label = isAssistedWeight(metric, assisted) ? '보조' : '최고'
  const up = prev !== null && isImprovedSet(metric, cur, prev, assisted)
  const changed = prev !== null && !isSameRecord(metric, cur, prev, assisted)

  return (
    <span className="routine-readonly__progress">
      <span className="routine-readonly__best">
        {label} {formatBestSet(metric, cur)}
      </span>
      {changed && (
        <span
          className={
            up
              ? 'routine-readonly__delta routine-readonly__delta--up'
              : 'routine-readonly__delta routine-readonly__delta--down'
          }
        >
          {up ? '▲' : '▼'} 지난 {formatBestSet(metric, prev)}
        </span>
      )}
    </span>
  )
}
