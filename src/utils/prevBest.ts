import type { Exercise, RoutineExercise, SetEntry } from '../db/types.ts'
import { bestSet } from './setStats.ts'

// 기록(RoutineLog)과 수업(Session)은 필드명이 다를 뿐(exercises / routine) 진척 비교 방식은 같다.
// 두 페이지가 같은 로직을 복붙하지 않도록 공통 형태로 받는다.
export interface ProgressEntry {
  id: string
  date: string
  time: string
  status: string // 'completed'인 것만 비교 대상
  items: RoutineExercise[]
}

// 현재 기록의 각 운동에 대해, 같은 운동을 포함한 "직전 완료 기록"의 최고 세트를 구한다.
// history에는 비교 대상이 될 기록만 넣는다(수업이면 같은 회원 것만).
export function prevBestByExercise(
  current: ProgressEntry,
  history: ProgressEntry[],
  exercises: Map<string, Exercise>,
): Map<string, SetEntry | null> {
  const map = new Map<string, SetEntry | null>()
  const curKey = current.date + current.time

  // 완료된 것 중 현재보다 앞선 기록만, 최신순으로
  const earlier = history
    .filter((h) => h.id !== current.id && h.status === 'completed' && h.date + h.time < curKey)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))

  for (const r of current.items) {
    const ex = exercises.get(r.exerciseId)
    const prev = earlier.find((h) => h.items.some((e) => e.exerciseId === r.exerciseId))
    const prevSets = prev?.items.find((e) => e.exerciseId === r.exerciseId)?.sets ?? []
    map.set(r.exerciseId, bestSet(ex?.metric ?? 'weight_reps', prevSets, ex?.assisted))
  }
  return map
}
