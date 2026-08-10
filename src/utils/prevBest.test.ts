import { describe, expect, it } from 'vitest'
import type { Exercise } from '../db/types.ts'
import { prevBestByExercise, type ProgressEntry } from './prevBest.ts'

const exMap = new Map<string, Exercise>([
  ['ex_w', { id: 'ex_w', name: '벤치', metric: 'weight_reps' } as Exercise],
  ['ex_a', { id: 'ex_a', name: '어시스트풀업', metric: 'weight_reps', assisted: true } as Exercise],
])

function entry(
  id: string,
  date: string,
  status: string,
  sets: { exerciseId: string; weight: number }[],
  time = '10:00',
): ProgressEntry {
  return {
    id,
    date,
    time,
    status,
    items: sets.map((s) => ({ exerciseId: s.exerciseId, sets: [{ weight: s.weight, reps: 8 }] })),
  }
}

describe('prevBestByExercise', () => {
  it('직전 완료 기록의 최고 세트를 운동별로 돌려준다', () => {
    const cur = entry('c', '2026-06-10', 'completed', [{ exerciseId: 'ex_w', weight: 80 }])
    const history = [cur, entry('p', '2026-06-01', 'completed', [{ exerciseId: 'ex_w', weight: 60 }])]
    expect(prevBestByExercise(cur, history, exMap).get('ex_w')?.weight).toBe(60)
  })

  it('여러 개면 가장 최근 것', () => {
    const cur = entry('c', '2026-06-10', 'completed', [{ exerciseId: 'ex_w', weight: 80 }])
    const history = [
      cur,
      entry('p1', '2026-06-01', 'completed', [{ exerciseId: 'ex_w', weight: 50 }]),
      entry('p2', '2026-06-05', 'completed', [{ exerciseId: 'ex_w', weight: 70 }]),
    ]
    expect(prevBestByExercise(cur, history, exMap).get('ex_w')?.weight).toBe(70)
  })

  it('같은 날짜면 시간으로 앞뒤를 가른다', () => {
    const cur = entry('c', '2026-06-10', 'completed', [{ exerciseId: 'ex_w', weight: 80 }], '18:00')
    const history = [
      cur,
      entry('p', '2026-06-10', 'completed', [{ exerciseId: 'ex_w', weight: 65 }], '09:00'),
      // 같은 날 더 늦은 기록은 "직전"이 아니다
      entry('later', '2026-06-10', 'completed', [{ exerciseId: 'ex_w', weight: 99 }], '20:00'),
    ]
    expect(prevBestByExercise(cur, history, exMap).get('ex_w')?.weight).toBe(65)
  })

  it('완료가 아닌 기록은 비교 대상에서 제외', () => {
    const cur = entry('c', '2026-06-10', 'completed', [{ exerciseId: 'ex_w', weight: 80 }])
    const history = [
      cur,
      entry('planned', '2026-06-05', 'reserved', [{ exerciseId: 'ex_w', weight: 70 }]),
      entry('done', '2026-06-01', 'completed', [{ exerciseId: 'ex_w', weight: 60 }]),
    ]
    expect(prevBestByExercise(cur, history, exMap).get('ex_w')?.weight).toBe(60)
  })

  it('자기 자신은 제외', () => {
    const cur = entry('c', '2026-06-10', 'completed', [{ exerciseId: 'ex_w', weight: 80 }])
    expect(prevBestByExercise(cur, [cur], exMap).get('ex_w')).toBeNull()
  })

  it('그 운동이 없는 기록은 건너뛴다', () => {
    const cur = entry('c', '2026-06-10', 'completed', [{ exerciseId: 'ex_w', weight: 80 }])
    const history = [
      cur,
      entry('other', '2026-06-05', 'completed', [{ exerciseId: 'ex_a', weight: 30 }]),
      entry('match', '2026-06-01', 'completed', [{ exerciseId: 'ex_w', weight: 55 }]),
    ]
    expect(prevBestByExercise(cur, history, exMap).get('ex_w')?.weight).toBe(55)
  })

  it('이전 기록이 없으면 null', () => {
    const cur = entry('c', '2026-06-10', 'completed', [{ exerciseId: 'ex_w', weight: 80 }])
    expect(prevBestByExercise(cur, [cur], exMap).get('ex_w')).toBeNull()
  })

  it('어시스트 운동은 최소값을 최고 기록으로', () => {
    const cur = entry('c', '2026-06-10', 'completed', [{ exerciseId: 'ex_a', weight: 25 }])
    const history: ProgressEntry[] = [
      cur,
      {
        id: 'p',
        date: '2026-06-01',
        time: '10:00',
        status: 'completed',
        items: [
          {
            exerciseId: 'ex_a',
            sets: [
              { weight: 40, reps: 8 },
              { weight: 35, reps: 8 },
            ],
          },
        ],
      },
    ]
    expect(prevBestByExercise(cur, history, exMap).get('ex_a')?.weight).toBe(35)
  })
})
