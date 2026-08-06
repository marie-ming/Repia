import { describe, expect, it } from 'vitest'
import type { SetEntry } from '../db/types.ts'
import {
  bestSet,
  bestSetLabel,
  formatBestSet,
  isImprovedSet,
  isSameRecord,
  isAssistedWeight,
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
    expect(formatBestSet('weight_reps', w(80))).toBe('80kg')
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
    expect(bestSetLabel('weight_reps', [w(80), w(120)])).toBe('최고 120kg')
    expect(bestSetLabel('reps', [rep(12), rep(20)])).toBe('최고 20회')
    expect(bestSetLabel('time', [sec(45), sec(90)])).toBe('최장 1:30')
    expect(bestSetLabel('distance_time', [dt(3, 900), dt(5, 1800)])).toBe('최장 5km 30:00')
  })

  it('어시스트는 "보조" + 최소값', () => {
    expect(bestSetLabel('weight_reps', [w(40), w(30)], true)).toBe('보조 30kg')
  })

  it('어시스트에서 전부 비어 있으면 null', () => {
    expect(bestSetLabel('weight_reps', [w(0, 0)], true)).toBeNull()
  })

  it('무게 × 횟수가 아니면 어시스트를 무시', () => {
    expect(bestSetLabel('reps', [rep(12), rep(20)], true)).toBe('최고 20회')
  })
})
