import type { ExerciseCategory } from '../db/types.ts'
import { EXERCISE_CATEGORY_OPTIONS } from '../constants.ts'
import { addDays, parseISODate, toISODate } from './date.ts'

// 어느 부위를 빠뜨렸는지 알아채기 위한 집계.
//
// 기간을 「이번 달」로 하지 않은 이유: 월초에는 무엇이든 낮게 나와서 밸런스 판단이
// 안 된다. 오늘을 포함한 최근 4주를 굴려서 본다.
export const BALANCE_DAYS = 28

export interface CategoryCount {
  category: ExerciseCategory
  count: number
}

export interface BalanceResult {
  total: number // 기간 안의 완료 기록 수
  counts: CategoryCount[] // 많은 순, 0인 부위는 뒤에 (빠뜨린 걸 보려는 기능이라 함께 보여준다)
}

interface BalanceLog {
  date: string
  status: string
  exercises: { exerciseId: string }[]
}

// 세는 단위는 "기록 수"다. 한 기록에 같은 부위가 여러 번 나와도 1회로 센다 —
// 세트 수로 세면 숫자가 커져서 한눈에 안 읽힌다.
// 운동 하나에 부위가 3개까지 붙으므로 한 번 운동해도 여러 부위가 올라간다(복합 운동).
export function categoryBalance(
  logs: BalanceLog[],
  categoriesByExercise: Map<string, ExerciseCategory[]>,
  today: string,
  days = BALANCE_DAYS,
): BalanceResult {
  const from = toISODate(addDays(parseISODate(today), -(days - 1)))

  // 계획만 해둔 기록은 세지 않는다. 안 한 운동을 했다고 셀 수는 없다.
  const inWindow = logs.filter(
    (l) => l.status === 'completed' && l.date >= from && l.date <= today,
  )

  const tally = new Map<ExerciseCategory, number>()
  for (const log of inWindow) {
    const seen = new Set<ExerciseCategory>()
    for (const r of log.exercises) {
      for (const c of categoriesByExercise.get(r.exerciseId) ?? []) seen.add(c)
    }
    for (const c of seen) tally.set(c, (tally.get(c) ?? 0) + 1)
  }

  // 레거시 카테고리('arm')는 선택 목록에 없지만 기존 기록에는 남아 있다.
  // 목록을 선택지로만 만들면 그 운동을 해도 요약에 안 나온다 — 집계된 건 함께 싣는다.
  const known = EXERCISE_CATEGORY_OPTIONS.map((o) => o.value)
  const legacy = [...tally.keys()].filter((c) => !known.includes(c))

  const counts = [...known, ...legacy]
    .map((category) => ({ category, count: tally.get(category) ?? 0 }))
    .sort((a, b) => b.count - a.count)

  return { total: inWindow.length, counts }
}

// 홈 한 줄에 들어갈 요약 — 많이 한 부위 몇 개만
export function topCategories(counts: CategoryCount[], limit = 3): CategoryCount[] {
  return counts.filter((c) => c.count > 0).slice(0, limit)
}
