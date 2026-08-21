import { describe, expect, it } from 'vitest'
import type { SetEntry } from '../db/types.ts'
import {
  bestSet,
  bestSetLabel,
  formatBestSet,
  isImprovedSet,
  isSameRecord,
  isAssistedWeight,
  isRecordedSet,
  withRecordedSetsOnly,
} from './setStats.ts'

const w = (weight: number, reps = 8): SetEntry => ({ weight, reps })
const rep = (reps: number): SetEntry => ({ weight: 0, reps })
const sec = (seconds: number): SetEntry => ({ weight: 0, reps: 0, seconds })
const dt = (distance: number, seconds = 0): SetEntry => ({ weight: 0, reps: 0, distance, seconds })

describe('bestSet', () => {
  it('빈 세트는 null', () => {
    expect(bestSet('weight_reps', [])).toBeNull()
  })

  it('일반 운동은 가장 무거운 세트', () => {
    expect(bestSet('weight_reps', [w(60), w(80), w(70)])).toEqual(w(80))
  })

  it('횟수는 가장 많은 세트', () => {
    expect(bestSet('reps', [rep(12), rep(20)])).toEqual(rep(20))
  })

  it('시간은 가장 긴 세트', () => {
    expect(bestSet('time', [sec(45), sec(90)])).toEqual(sec(90))
  })

  describe('어시스트(보조 무게)', () => {
    it('보조가 가장 적은 세트', () => {
      expect(bestSet('weight_reps', [w(40), w(30)], true)).toEqual(w(30))
    })

    it('비워둔 세트(0)는 미입력으로 보고 제외', () => {
      expect(bestSet('weight_reps', [w(35), w(0, 0)], true)).toEqual(w(35))
    })

    it('전부 비어 있으면 null', () => {
      expect(bestSet('weight_reps', [w(0, 0)], true)).toBeNull()
    })
  })

  describe('거리 + 시간 — 거리 우선, 같은 거리면 더 빠른 시간', () => {
    it('거리가 다르면 더 먼 쪽', () => {
      expect(bestSet('distance_time', [dt(3, 900), dt(5, 1800)])).toEqual(dt(5, 1800))
    })

    it('느려도 더 멀리 뛴 쪽이 이긴다', () => {
      // 3km 15분(5:00/km)보다 5km 30분(6:00/km)이 최고 기록
      expect(bestSet('distance_time', [dt(3, 900), dt(5, 1800)])).toEqual(dt(5, 1800))
    })

    it('같은 거리면 더 빠른 시간', () => {
      expect(bestSet('distance_time', [dt(5, 1800), dt(5, 1470)])).toEqual(dt(5, 1470))
    })

    it('같은 거리에서 시간이 비어 있으면(0) 기록된 쪽이 이긴다', () => {
      expect(bestSet('distance_time', [dt(5, 0), dt(5, 1800)])).toEqual(dt(5, 1800))
    })
  })
})

describe('isImprovedSet', () => {
  it('일반 운동은 무거워져야 향상', () => {
    expect(isImprovedSet('weight_reps', w(80), w(70))).toBe(true)
    expect(isImprovedSet('weight_reps', w(60), w(70))).toBe(false)
  })

  it('어시스트는 보조가 줄어야 향상', () => {
    expect(isImprovedSet('weight_reps', w(30), w(40), true)).toBe(true)
    expect(isImprovedSet('weight_reps', w(45), w(40), true)).toBe(false)
  })

  it('거리 + 시간: 더 멀리 뛰면 향상', () => {
    expect(isImprovedSet('distance_time', dt(6, 2400), dt(5, 1800))).toBe(true)
  })

  it('거리 + 시간: 같은 거리를 더 빨리 뛰면 향상', () => {
    expect(isImprovedSet('distance_time', dt(5, 1500), dt(5, 1800))).toBe(true)
    expect(isImprovedSet('distance_time', dt(5, 2100), dt(5, 1800))).toBe(false)
  })
})

describe('isSameRecord', () => {
  it('거리·시간이 모두 같으면 같은 기록', () => {
    expect(isSameRecord('distance_time', dt(5, 1800), dt(5, 1800))).toBe(true)
  })

  it('같은 거리라도 시간이 다르면 다른 기록', () => {
    expect(isSameRecord('distance_time', dt(5, 1500), dt(5, 1800))).toBe(false)
  })

  it('같은 무게면 같은 기록', () => {
    expect(isSameRecord('weight_reps', w(80), w(80))).toBe(true)
  })
})

describe('isAssistedWeight', () => {
  it('weight_reps + assisted일 때만 true', () => {
    expect(isAssistedWeight('weight_reps', true)).toBe(true)
    expect(isAssistedWeight('weight_reps', false)).toBe(false)
    expect(isAssistedWeight('weight_reps', undefined)).toBe(false)
    expect(isAssistedWeight('reps', true)).toBe(false)
  })
})

describe('formatBestSet', () => {
  it('측정 방식별 단위', () => {
    expect(formatBestSet('weight_reps', w(80))).toBe('80kg×8')
    expect(formatBestSet('reps', rep(12))).toBe('12회')
    expect(formatBestSet('time', sec(90))).toBe('1:30')
  })

  it('거리 + 시간은 거리와 시간을 함께', () => {
    expect(formatBestSet('distance_time', dt(5, 1470))).toBe('5km 24:30')
  })

  it('시간이 없으면 거리만', () => {
    expect(formatBestSet('distance_time', dt(5, 0))).toBe('5km')
  })
})

describe('bestSetLabel', () => {
  it('빈 배열이면 null', () => {
    expect(bestSetLabel('weight_reps', [])).toBeNull()
  })

  it('무게·횟수는 "최고", 시간·거리는 "최장"', () => {
    expect(bestSetLabel('weight_reps', [w(80), w(120)])).toBe('최고 120kg×8')
    expect(bestSetLabel('reps', [rep(12), rep(20)])).toBe('최고 20회')
    expect(bestSetLabel('time', [sec(45), sec(90)])).toBe('최장 1:30')
    expect(bestSetLabel('distance_time', [dt(3, 900), dt(5, 1800)])).toBe('최장 5km 30:00')
  })

  it('어시스트는 "보조" + 최소값', () => {
    expect(bestSetLabel('weight_reps', [w(40), w(30)], true)).toBe('보조 30kg×8')
  })

  it('어시스트에서 전부 비어 있으면 null', () => {
    expect(bestSetLabel('weight_reps', [w(0, 0)], true)).toBeNull()
  })

  it('무게 × 횟수가 아니면 어시스트를 무시', () => {
    expect(bestSetLabel('reps', [rep(12), rep(20)], true)).toBe('최고 20회')
  })
})

// 「무게 우선, 같으면 더 많은 횟수」 — distance_time의 「거리 우선, 같으면 시간」과 같은 규칙.
// 같은 무게로 8회 → 14회는 명백한 향상인데 무게만 보면 아무 신호가 안 떴다.
describe('무게가 같을 때는 횟수로 가른다', () => {
  it('같은 무게면 횟수가 많은 쪽이 최고', () => {
    expect(bestSet('weight_reps', [w(20, 8), w(20, 14)])).toEqual(w(20, 14))
    expect(bestSet('weight_reps', [w(20, 14), w(20, 8)])).toEqual(w(20, 14))
  })

  it('무게가 다르면 여전히 무게가 우선', () => {
    expect(bestSet('weight_reps', [w(20, 20), w(30, 1)])).toEqual(w(30, 1))
  })

  it('같은 무게로 횟수를 늘리면 향상', () => {
    expect(isImprovedSet('weight_reps', w(20, 14), w(20, 8))).toBe(true)
    expect(isImprovedSet('weight_reps', w(20, 8), w(20, 14))).toBe(false)
  })

  it('무게·횟수가 모두 같아야 동일 기록', () => {
    expect(isSameRecord('weight_reps', w(20, 8), w(20, 8))).toBe(true)
    expect(isSameRecord('weight_reps', w(20, 8), w(20, 14))).toBe(false)
  })

  // 맨몸 운동을 weight_reps로 적으면 무게가 계속 0이라 향상이 영영 안 잡혔다
  it('무게가 0인 맨몸 운동도 횟수로 향상이 잡힌다', () => {
    expect(isImprovedSet('weight_reps', w(0, 12), w(0, 8))).toBe(true)
    expect(bestSet('weight_reps', [w(0, 8), w(0, 12)])).toEqual(w(0, 12))
  })

  it('보조 무게도 보조가 같으면 횟수가 많은 쪽', () => {
    expect(bestSet('weight_reps', [w(30, 8), w(30, 12)], true)).toEqual(w(30, 12))
    expect(isImprovedSet('weight_reps', w(30, 12), w(30, 8), true)).toBe(true)
    // 보조가 적은 쪽이 우선인 건 그대로
    expect(bestSet('weight_reps', [w(30, 1), w(40, 20)], true)).toEqual(w(30, 1))
  })
})

// 계획만 세워두고 건너뛴 운동이 `0kg × 0회`로 남아 최고·지난 기록으로 잡히면,
// 다음에 그 운동을 할 때 실제 직전 기록을 건너뛰고 0과 비교해 늘 ▲가 떴다.
describe('isRecordedSet — 값이 안 들어간 세트는 기록이 아니다', () => {
  it('무게·횟수 둘 다 0이면 기록이 아니다', () => {
    expect(isRecordedSet('weight_reps', w(0, 0))).toBe(false)
  })

  it('맨몸 운동(0kg)이라도 횟수가 있으면 기록이다', () => {
    expect(isRecordedSet('weight_reps', w(0, 10))).toBe(true)
  })

  it('횟수를 안 적었어도 무게가 있으면 기록이다', () => {
    expect(isRecordedSet('weight_reps', w(60, 0))).toBe(true)
  })

  it('측정 방식별 판단', () => {
    expect(isRecordedSet('reps', rep(0))).toBe(false)
    expect(isRecordedSet('reps', rep(10))).toBe(true)
    expect(isRecordedSet('time', sec(0))).toBe(false)
    expect(isRecordedSet('time', sec(30))).toBe(true)
    expect(isRecordedSet('distance_time', dt(0, 0))).toBe(false)
    expect(isRecordedSet('distance_time', dt(5, 0))).toBe(true)
    expect(isRecordedSet('distance_time', dt(0, 600))).toBe(true)
  })

  it('보조 무게는 0이 미입력이다 (맨몸과 다르다)', () => {
    expect(isRecordedSet('weight_reps', w(0, 10), true)).toBe(false)
    expect(isRecordedSet('weight_reps', w(30, 10), true)).toBe(true)
  })

  it('빈 세트는 최고 기록 후보에서 빠진다', () => {
    expect(bestSet('weight_reps', [w(0, 0)])).toBeNull()
    expect(bestSet('weight_reps', [w(0, 0), w(60, 8)])).toEqual(w(60, 8))
    expect(bestSetLabel('weight_reps', [w(0, 0), w(0, 0)])).toBeNull()
  })
})

describe('formatBestSet — 무게와 횟수를 함께', () => {
  it('무게가 있으면 무게×횟수', () => {
    expect(formatBestSet('weight_reps', w(20, 14))).toBe('20kg×14')
  })

  // 「0kg×12」의 0kg은 군더더기다
  it('맨몸(0kg)은 횟수만', () => {
    expect(formatBestSet('weight_reps', w(0, 12))).toBe('12회')
    expect(bestSetLabel('weight_reps', [w(0, 8), w(0, 12)])).toBe('최고 12회')
  })
})

// 편집 화면에는 빈 세트를 남겨두지만, 공유 이미지처럼 밖으로 나가는 곳에는 빼야 한다
describe('withRecordedSetsOnly', () => {
  const exMap = new Map([
    ['w1', { metric: 'weight_reps' as const }],
    ['a1', { metric: 'weight_reps' as const, assisted: true }],
    ['t1', { metric: 'time' as const }],
  ])

  it('값이 안 채워진 세트만 뺀다', () => {
    const out = withRecordedSetsOnly(
      [{ exerciseId: 'w1', sets: [w(60, 8), w(0, 0), w(70, 6)] }],
      exMap,
    )
    expect(out[0].sets).toEqual([w(60, 8), w(70, 6)])
  })

  // 계획만 세워둔 기록을 공유하면 목록이 통째로 비어버린다 — 운동은 남긴다
  it('세트가 전부 비어도 운동 자체는 남긴다', () => {
    const out = withRecordedSetsOnly([{ exerciseId: 'w1', sets: [w(0, 0), w(0, 0)] }], exMap)
    expect(out).toHaveLength(1)
    expect(out[0].sets).toEqual([])
  })

  it('맨몸 운동(0kg)은 남긴다', () => {
    const out = withRecordedSetsOnly([{ exerciseId: 'w1', sets: [w(0, 12)] }], exMap)
    expect(out[0].sets).toEqual([w(0, 12)])
  })

  it('보조 무게는 0을 미입력으로 본다', () => {
    const out = withRecordedSetsOnly([{ exerciseId: 'a1', sets: [w(0, 12), w(30, 8)] }], exMap)
    expect(out[0].sets).toEqual([w(30, 8)])
  })

  it('측정 방식별로 판단한다', () => {
    const out = withRecordedSetsOnly([{ exerciseId: 't1', sets: [sec(0), sec(90)] }], exMap)
    expect(out[0].sets).toEqual([sec(90)])
  })

  it('모르는 운동은 무게×횟수로 본다', () => {
    const out = withRecordedSetsOnly([{ exerciseId: 'unknown', sets: [w(0, 0), w(60, 8)] }], exMap)
    expect(out[0].sets).toEqual([w(60, 8)])
  })

  it('원본을 바꾸지 않는다', () => {
    const items = [{ exerciseId: 'w1', sets: [w(60, 8), w(0, 0)] }]
    withRecordedSetsOnly(items, exMap)
    expect(items[0].sets).toHaveLength(2)
  })

  it('groupId 같은 다른 필드는 그대로 남긴다', () => {
    const out = withRecordedSetsOnly(
      [{ exerciseId: 'w1', sets: [w(0, 0), w(60, 8)], groupId: 'g1' }],
      exMap,
    )
    expect(out[0].groupId).toBe('g1')
  })
})

