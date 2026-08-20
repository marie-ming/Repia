import { describe, expect, it } from 'vitest'
import type { SetEntry } from '../db/types.ts'
import {
  MAX_CHART_POINTS,
  axisValue,
  buildChartGeometry,
  chartCaption,
  pickAxis,
  thinToBest,
} from './progressChart.ts'

const w = (weight: number, reps = 8): SetEntry => ({ weight, reps })
const sec = (seconds: number): SetEntry => ({ weight: 0, reps: 0, seconds })
const dt = (distance: number, seconds: number): SetEntry => ({
  weight: 0,
  reps: 0,
  distance,
  seconds,
})

describe('pickAxis', () => {
  it('측정 방식별 축', () => {
    expect(pickAxis('reps', [w(0, 12)])).toBe('reps')
    expect(pickAxis('time', [sec(60)])).toBe('seconds')
    expect(pickAxis('distance_time', [dt(5, 1800)])).toBe('distance')
  })

  it('무게×횟수는 무게로 그린다', () => {
    expect(pickAxis('weight_reps', [w(60), w(70)])).toBe('weight')
  })

  // 맨몸 운동은 무게가 계속 0이라 무게로 그리면 평평한 선만 나온다
  it('무게가 전부 0이면 횟수로 그린다', () => {
    expect(pickAxis('weight_reps', [w(0, 8), w(0, 12)])).toBe('reps')
  })

  it('한 번이라도 무게가 있으면 무게로 그린다', () => {
    expect(pickAxis('weight_reps', [w(0, 8), w(5, 8)])).toBe('weight')
  })
})

describe('axisValue', () => {
  it('축에 해당하는 값을 꺼낸다', () => {
    expect(axisValue('weight', w(60, 8))).toBe(60)
    expect(axisValue('reps', w(60, 8))).toBe(8)
    expect(axisValue('seconds', sec(90))).toBe(90)
    expect(axisValue('distance', dt(5, 1800))).toBe(5)
  })

  it('없는 값은 0으로', () => {
    expect(axisValue('seconds', w(60))).toBe(0)
    expect(axisValue('distance', w(60))).toBe(0)
  })
})

describe('chartCaption', () => {
  it('축별 문구', () => {
    expect(chartCaption('weight_reps', 'weight')).toBe('최고 무게 추이')
    expect(chartCaption('weight_reps', 'reps')).toBe('최고 횟수 추이')
    expect(chartCaption('time', 'seconds')).toBe('최장 시간 추이')
    expect(chartCaption('distance_time', 'distance')).toBe('최장 거리 추이')
  })

  // 위아래가 뒤집혀 있다는 걸 말해줘야 읽을 수 있다
  it('보조 무게는 뒤집힌 걸 알려준다', () => {
    expect(chartCaption('weight_reps', 'weight', true)).toBe('보조 무게 추이 (적을수록 위)')
  })
})

describe('buildChartGeometry', () => {
  it('점이 2개 미만이면 그리지 않는다', () => {
    expect(buildChartGeometry([], 100, 100)).toBeNull()
    expect(buildChartGeometry([60], 100, 100)).toBeNull()
  })

  it('x는 균등 간격으로 좌우 끝까지', () => {
    const g = buildChartGeometry([1, 2, 3], 100, 100, { pad: 10 })!
    expect(g.points.map((p) => p.x)).toEqual([10, 50, 90])
  })

  // 앱이 향상을 ▲로 표시하니 그래프도 위가 더 나은 기록이어야 한다
  it('값이 큰 쪽이 위로 간다', () => {
    const g = buildChartGeometry([60, 80], 100, 100, { pad: 10 })!
    expect(g.points[0].y).toBe(90) // 60 → 아래
    expect(g.points[1].y).toBe(10) // 80 → 위
  })

  it('invert면 값이 작은 쪽이 위로 간다 (보조 무게)', () => {
    const g = buildChartGeometry([40, 30], 100, 100, { pad: 10, invert: true })!
    expect(g.points[0].y).toBe(90) // 보조 40 → 아래
    expect(g.points[1].y).toBe(10) // 보조 30 → 위
  })

  it('전부 같은 값이면 가운데 수평선 (0으로 나누지 않는다)', () => {
    const g = buildChartGeometry([60, 60, 60], 100, 100, { pad: 10 })!
    expect(g.points.map((p) => p.y)).toEqual([50, 50, 50])
  })

  it('최소·최대를 함께 돌려준다', () => {
    const g = buildChartGeometry([70, 60, 80], 100, 100)!
    expect(g.min).toBe(60)
    expect(g.max).toBe(80)
  })

  it('모든 점이 그림 안에 들어온다', () => {
    const g = buildChartGeometry([1, 50, 100, 20], 288, 96, { pad: 6 })!
    for (const p of g.points) {
      expect(p.x).toBeGreaterThanOrEqual(6)
      expect(p.x).toBeLessThanOrEqual(282)
      expect(p.y).toBeGreaterThanOrEqual(6)
      expect(p.y).toBeLessThanOrEqual(90)
    }
  })
})

// 점이 촘촘해지면 x 간격이 2칸 아래로 떨어져 국지적 등락이 세로 막대처럼 뭉개진다.
// 기간을 자르지 않고 구간별 최고만 남겨 솎아낸다.
describe('thinToBest', () => {
  const seq = (n: number) => Array.from({ length: n }, (_, i) => i)

  it('한계 이하면 그대로 둔다', () => {
    expect(thinToBest([1, 2, 3], 10)).toEqual([1, 2, 3])
    expect(thinToBest(seq(10), 10)).toEqual(seq(10))
  })

  it('한계까지 줄인다', () => {
    expect(thinToBest(seq(1000), 120)).toHaveLength(120)
    expect(thinToBest(seq(500), 10)).toHaveLength(10)
  })

  // 왼쪽 끝은 첫 기록 날짜, 오른쪽 끝은 「최신 값」 표시와 맞아야 한다
  it('첫 점과 끝 점은 원래 값을 지킨다', () => {
    const v = seq(1000)
    const out = thinToBest(v, 120)
    expect(out[0]).toBe(0)
    expect(out[out.length - 1]).toBe(999)
  })

  it('구간에서 최고를 고른다 (평균이 아니다)', () => {
    // 10개를 4개로: 첫/끝 고정 + 중간 8개를 2구간으로
    const out = thinToBest([0, 1, 9, 2, 3, 4, 8, 5, 6, 7], 4)
    expect(out).toEqual([0, 9, 8, 7])
  })

  it('invert면 구간에서 최소를 고른다 (보조 무게)', () => {
    const out = thinToBest([9, 8, 1, 7, 6, 5, 2, 4, 3, 0], 4, true)
    expect(out).toEqual([9, 1, 2, 0])
  })

  it('전체 기간을 유지한다 (뒤쪽만 남기지 않는다)', () => {
    const out = thinToBest(seq(1000), 120)
    // 앞쪽 값이 살아 있어야 「몇 년에 걸쳐 늘었나」가 보인다
    expect(out[1]).toBeLessThan(50)
  })

  it('max가 너무 작으면 손대지 않는다', () => {
    expect(thinToBest(seq(100), 2)).toHaveLength(100)
  })

  it('솎아낸 뒤 x 간격이 2칸 이상 벌어진다', () => {
    const g = buildChartGeometry(thinToBest(seq(5000), MAX_CHART_POINTS), 288, 96, { pad: 6 })!
    const gap = g.points[1].x - g.points[0].x
    expect(gap).toBeGreaterThanOrEqual(2)
  })
})

describe('아주 많은 기록', () => {
  it('spread 인자 한계에 걸리지 않는다', () => {
    const many = Array.from({ length: 200_000 }, (_, i) => i % 97)
    expect(() => buildChartGeometry(many, 288, 96)).not.toThrow()
    const g = buildChartGeometry(many, 288, 96)!
    expect(g.min).toBe(0)
    expect(g.max).toBe(96)
  })
})

