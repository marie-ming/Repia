import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { routineLogsRepo } from '../db/repositories/routineLogs.ts'
import type { Exercise, SetEntry } from '../db/types.ts'
import { ChevronLeftIcon } from '../components/icons.tsx'
import { formatSetShort } from '../constants.ts'
import { bestSet, bestSetLabel } from '../utils/setStats.ts'
import { ProgressChart } from '../components/ProgressChart.tsx'
import { formatShortDate } from '../utils/date.ts'
import { LoadError } from '../components/LoadError.tsx'
import { useLoader } from '../utils/useLoader.ts'

interface HistoryItem {
  id: string
  date: string
  sets: SetEntry[]
}

export function ExerciseHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    const [ex, logs] = await Promise.all([exercisesRepo.findById(id), routineLogsRepo.findAll()])
    setExercise(ex ?? null)
    setItems(
      logs
        .filter((l) => l.status === 'completed' && l.exercises.some((r) => r.exerciseId === id))
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
        .map((l) => ({
          id: l.id,
          date: l.date,
          sets: l.exercises.find((r) => r.exerciseId === id)?.sets ?? [],
        })),
    )
    setLoading(false)
  }, [id])

  const { error: loadError, retry } = useLoader(load)

  const best = useMemo(() => {
    if (!exercise) return null
    const allSets = items.flatMap((i) => i.sets)
    return bestSetLabel(exercise.metric, allSets, exercise.assisted)
  }, [exercise, items])

  // 그래프는 오래된 것 → 최신 순. 값이 안 채워진 기록은 점으로 찍을 게 없어 빠진다.
  const chartEntries = useMemo(() => {
    if (!exercise) return []
    return items
      .map((it) => ({
        date: it.date,
        best: bestSet(exercise.metric, it.sets, exercise.assisted),
      }))
      .filter((e): e is { date: string; best: SetEntry } => e.best !== null)
      .reverse()
  }, [exercise, items])

  if (loadError) {
    return <div className="detail"><LoadError onRetry={retry} /></div>
  }

  if (loading) {
    return <div className="detail"><p className="page__placeholder">불러오는 중...</p></div>
  }

  return (
    <div className="detail">
      <header className="detail__bar">
        <button type="button" className="detail__back" onClick={() => navigate(-1)} aria-label="뒤로">
          <ChevronLeftIcon />
        </button>
        <h1 className="detail__bar-title">{exercise ? exercise.name : '기록'}</h1>
        <span className="detail__bar-spacer" />
      </header>

      <div className="detail__body">
        {items.length === 0 ? (
          <div className="empty">
            <p className="empty__title">기록이 없습니다</p>
            <p className="empty__desc">완료한 기록이 쌓이면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <>
            {exercise && chartEntries.length >= 2 && (
              <ProgressChart
                metric={exercise.metric}
                assisted={exercise.assisted}
                entries={chartEntries}
              />
            )}
            <p className="exrec-summary">
              총 {items.length}회{best ? ` · ${best}` : ''}
            </p>
            <ul className="exrec-list">
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    className="exrec-item"
                    onClick={() => navigate(`/logs/${it.id}`)}
                  >
                    <span className="exrec-item__date">{formatShortDate(it.date)}</span>
                    {it.sets.length > 0 && exercise && (
                      <span className="exrec-item__sets">
                        {it.sets.map((s, i) => (
                          <span key={i} className="exrec-chip">
                            {formatSetShort(exercise.metric, s)}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
