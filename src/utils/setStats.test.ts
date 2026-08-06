import { describe, expect, it } from 'vitest'
import { bestValue, formatBest, isImproved, isAssistedWeight } from './setStats.ts'

describe('bestValue', () => {
  it('빈 세트는 null', () => {
    expect(bestValue('weight_reps', [])).toBeNull()
  })

  it('일반 운동은 최대값', () => {
    expect(
      bestValue('weight_reps', [
        { weight: 60, reps: 10 },
        { weight: 80, reps: 6 },
      ]),
    ).toBe(80)
  })

  describe('어시스트(보조 무게)', () => {
    it('보조가 가장 적은 값이 최고 기록', () => {
      expect(
        bestValue(
          'weight_reps',
          [
            { weight: 40, reps: 8 },
            { weight: 30, reps: 6 },
          ],
          true,
        ),
      ).toBe(30)
    })

    it('비워둔 세트(0)가 "보조 0kg"으로 최고가 되지 않는다', () => {
      expect(
        bestValue(
          'weight_reps',
          [
            { weight: 35, reps: 8 },
            { weight: 0, reps: 0 },
          ],
          true,
        ),
      ).toBe(35)
    })

    it('전부 비어 있으면 기록 없음(null)', () => {
      expect(bestValue('weight_reps', [{ weight: 0, reps: 0 }], true)).toBeNull()
    })

    it('무게 × 횟수가 아니면 어시스트 플래그를 무시', () => {
      expect(bestValue('reps', [{ weight: 0, reps: 12 }], true)).toBe(12)
    })
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

describe('isImproved', () => {
  it('일반 운동은 늘어야 향상', () => {
    expect(isImproved('weight_reps', 80, 70)).toBe(true)
    expect(isImproved('weight_reps', 60, 70)).toBe(false)
  })

  it('어시스트는 보조가 줄어야 향상', () => {
    expect(isImproved('weight_reps', 30, 40, true)).toBe(true)
    expect(isImproved('weight_reps', 45, 40, true)).toBe(false)
  })
})

describe('formatBest', () => {
  it('측정 방식별 단위', () => {
    expect(formatBest('weight_reps', 80)).toBe('80kg')
    expect(formatBest('reps', 12)).toBe('12회')
    expect(formatBest('time', 90)).toBe('1:30')
    expect(formatBest('distance_time', 5)).toBe('5km')
  })
})
