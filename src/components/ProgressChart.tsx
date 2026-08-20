import type { ExerciseMetric, SetEntry } from '../db/types.ts'
import { formatBestSet, isAssistedWeight } from '../utils/setStats.ts'
import { formatShortDate } from '../utils/date.ts'
import {
  MAX_CHART_POINTS,
  axisValue,
  buildChartGeometry,
  chartCaption,
  pickAxis,
  thinToBest,
} from '../utils/progressChart.ts'

const W = 288
const H = 96

// 점이 촘촘해지면 서로 겹쳐 지저분해진다. 그 이상은 선만 보여준다.
const MAX_DOTS = 20

interface ProgressChartProps {
  metric: ExerciseMetric
  assisted?: boolean
  // 오래된 것 → 최신 순. 각 항목은 그 날의 최고 세트.
  entries: { date: string; best: SetEntry }[]
}

export function ProgressChart({ metric, assisted, entries }: ProgressChartProps) {
  const bests = entries.map((e) => e.best)
  const axis = pickAxis(metric, bests)
  const invert = isAssistedWeight(metric, assisted)
  const geo = buildChartGeometry(
    thinToBest(bests.map((s) => axisValue(axis, s)), MAX_CHART_POINTS, invert),
    W,
    H,
    { invert },
  )

  // 기록이 하나뿐이면 추이가 없다
  if (!geo) return null

  const latest = entries[entries.length - 1]
  const line = geo.points.map((p) => `${p.x},${p.y}`).join(' ')
  const showDots = geo.points.length <= MAX_DOTS

  return (
    <div className="progress-chart">
      <div className="progress-chart__head">
        <span className="progress-chart__caption">{chartCaption(metric, axis, assisted)}</span>
        <span className="progress-chart__latest">{formatBestSet(metric, latest.best)}</span>
      </div>

      <svg
        className="progress-chart__svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${formatShortDate(entries[0].date)}부터 ${formatShortDate(latest.date)}까지 기록 ${entries.length}개의 추이`}
      >
        {[6, H / 2, H - 6].map((y) => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} className="progress-chart__grid" />
        ))}
        <polyline points={line} className="progress-chart__line" />
        {showDots &&
          geo.points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === geo.points.length - 1 ? 4 : 3}
              className={
                i === geo.points.length - 1
                  ? 'progress-chart__dot progress-chart__dot--last'
                  : 'progress-chart__dot'
              }
            />
          ))}
      </svg>

      <div className="progress-chart__axis">
        <span>{formatShortDate(entries[0].date)}</span>
        <span>{formatShortDate(latest.date)}</span>
      </div>
    </div>
  )
}
