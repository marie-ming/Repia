import type { ExerciseMetric, SetEntry } from '../db/types.ts'
import { isAssistedWeight } from './setStats.ts'

// 기록은 계속 쌓이는데 목록으로만 보여줘서, 몇 달에 걸쳐 늘었는지 한눈에 볼 방법이 없었다.
// 세션별 "최고 세트"를 점으로 찍어 추이를 그린다.

// 그래프의 y축으로 쓸 값. 측정 방식마다 다르고, 무게×횟수는 series 전체를 보고 정한다 —
// 맨몸 운동(무게가 계속 0)을 무게로 그리면 평평한 선만 나온다.
export type ChartAxis = 'weight' | 'reps' | 'seconds' | 'distance'

export function pickAxis(metric: ExerciseMetric, bests: SetEntry[]): ChartAxis {
  switch (metric) {
    case 'reps':
      return 'reps'
    case 'time':
      return 'seconds'
    case 'distance_time':
      return 'distance'
    default:
      return bests.some((s) => s.weight > 0) ? 'weight' : 'reps'
  }
}

export function axisValue(axis: ChartAxis, s: SetEntry): number {
  switch (axis) {
    case 'reps':
      return s.reps
    case 'seconds':
      return s.seconds ?? 0
    case 'distance':
      return s.distance ?? 0
    default:
      return s.weight
  }
}

export function chartCaption(
  metric: ExerciseMetric,
  axis: ChartAxis,
  assisted?: boolean,
): string {
  // 보조 무게는 적을수록 잘한 기록이라 위아래를 뒤집는다. 그 사실을 말해줘야 읽을 수 있다.
  if (isAssistedWeight(metric, assisted)) return '보조 무게 추이 (적을수록 위)'
  switch (axis) {
    case 'reps':
      return '최고 횟수 추이'
    case 'seconds':
      return '최장 시간 추이'
    case 'distance':
      return '최장 거리 추이'
    default:
      return '최고 무게 추이'
  }
}

// 점이 이보다 많아지면 x 간격이 2칸 아래로 떨어져(288칸 기준) 국지적 등락이
// 세로 막대처럼 뭉개진다. 기간을 자르는 대신 구간별 최고만 남겨 솎아낸다 —
// 자르면 「몇 년에 걸쳐 늘었나」를 보려고 만든 그래프의 목적이 사라진다.
export const MAX_CHART_POINTS = 120

export function thinToBest(values: number[], max: number, invert = false): number[] {
  if (max < 3 || values.length <= max) return values

  // 첫 점과 끝 점은 날짜 라벨·최신 값 표시와 맞아야 하므로 그대로 둔다
  const first = values[0]
  const last = values[values.length - 1]
  const middle = values.slice(1, -1)
  const buckets = max - 2

  const out: number[] = [first]
  for (let i = 0; i < buckets; i++) {
    const from = Math.floor((middle.length * i) / buckets)
    const to = Math.floor((middle.length * (i + 1)) / buckets)
    if (to <= from) continue
    let pick = middle[from]
    for (let j = from + 1; j < to; j++) {
      if (invert ? middle[j] < pick : middle[j] > pick) pick = middle[j]
    }
    out.push(pick)
  }
  out.push(last)
  return out
}

export interface ChartGeometry {
  points: { x: number; y: number }[]
  min: number
  max: number
}

// 값들을 SVG 좌표로. 어떤 측정 방식이든 "위로 갈수록 더 나은 기록"으로 맞춘다
// (앱이 향상을 ▲로 표시하는 것과 같은 방향이어야 오해가 없다).
export function buildChartGeometry(
  values: number[],
  width: number,
  height: number,
  opts: { invert?: boolean; pad?: number } = {},
): ChartGeometry | null {
  // 점이 하나면 추이가 아니다
  if (values.length < 2) return null

  const pad = opts.pad ?? 6
  // spread(...)는 배열이 아주 길면 인자 한계에 걸린다. 순회로 구한다.
  let min = values[0]
  let max = values[0]
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  const span = max - min
  const innerW = width - pad * 2
  const innerH = height - pad * 2

  const points = values.map((v, i) => {
    // 전부 같은 값이면 가운데 수평선 (0으로 나누지 않게)
    const t = span === 0 ? 0.5 : (v - min) / span
    const better = opts.invert ? 1 - t : t
    return {
      x: pad + (innerW * i) / (values.length - 1),
      y: pad + innerH * (1 - better),
    }
  })

  return { points, min, max }
}
