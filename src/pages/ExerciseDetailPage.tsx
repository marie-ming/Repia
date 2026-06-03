import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { routineLogsRepo } from '../db/repositories/routineLogs.ts'
import type { Exercise, SetEntry } from '../db/types.ts'
import { useMode } from '../components/ModeContext.tsx'
import { useToast } from '../components/Toast.tsx'
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons.tsx'
import { EXERCISE_CATEGORY_LABELS, EQUIPMENT_LABELS, gripLabel } from '../constants.ts'
import { formatShortDateWithWeekday } from '../utils/date.ts'

interface RecentItem {
  id: string
  date: string
  sets: SetEntry[]
  to: string
}

const RECENT_LIMIT = 5

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { mode } = useMode()
  const showToast = useToast()
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [recent, setRecent] = useState<RecentItem[]>([])
  const [recentTotal, setRecentTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)

  const load = useCallback(async () => {
    if (!id) return
    const ex = await exercisesRepo.findById(id)
    setExercise(ex ?? null)

    // 최근 기록은 개인 모드에서만 (운동 진척 추적 용도)
    if (mode === 'personal') {
      const logs = await routineLogsRepo.findAll()
      const matched = logs
        .filter((l) => l.status === 'completed' && l.exercises.some((r) => r.exerciseId === id))
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      setRecentTotal(matched.length)
      setRecent(
        matched.slice(0, RECENT_LIMIT).map((l) => ({
          id: l.id,
          date: l.date,
          sets: l.exercises.find((r) => r.exerciseId === id)?.sets ?? [],
          to: `/logs/${l.id}`,
        })),
      )
    }

    setLoading(false)
  }, [id, mode])

  useEffect(() => {
    load()
  }, [load])

  function onCarouselScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx !== activePhoto) setActivePhoto(idx)
  }

  if (loading) {
    return <div className="page"><p className="page__placeholder">불러오는 중...</p></div>
  }

  if (!exercise) {
    return (
      <div className="detail">
        <header className="detail__bar">
          <button type="button" className="detail__back" onClick={() => navigate(-1)} aria-label="뒤로">
            <ChevronLeftIcon />
          </button>
          <span className="detail__bar-spacer" />
        </header>
        <div className="empty">
          <p className="empty__title">운동을 찾을 수 없습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="detail">
      <header className="detail__bar">
        <button type="button" className="detail__back" onClick={() => navigate(-1)} aria-label="뒤로">
          <ChevronLeftIcon />
        </button>
        <button type="button" className="detail__edit" onClick={() => navigate(`/exercises/${exercise.id}/edit`)}>
          수정
        </button>
      </header>

      {exercise.photos.length > 0 ? (
        <div className="carousel-wrap">
          <div className="carousel" onScroll={onCarouselScroll}>
            {exercise.photos.map((photo, i) => (
              <div className="carousel__item" key={i}>
                <img src={photo} alt={`${exercise.name} 사진 ${i + 1}`} />
              </div>
            ))}
          </div>
          {exercise.photos.length > 1 && (
            <div className="carousel__dots">
              {exercise.photos.map((_, i) => (
                <span
                  key={i}
                  className={i === activePhoto ? 'carousel__dot carousel__dot--active' : 'carousel__dot'}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="carousel-wrap carousel-wrap--empty">
          <span className="exercise-card__thumb-empty">💪</span>
        </div>
      )}

      <div className="detail__body">
        <h1 className="detail__title">{exercise.name}</h1>

        <dl className="info-list">
          <div className="info-list__row">
            <dt className="info-list__label">카테고리</dt>
            <dd className="info-list__value">
              {exercise.categories.length > 0 ? (
                exercise.categories.map((c) => (
                  <span key={c} className="mini-badge mini-badge--cat">
                    {EXERCISE_CATEGORY_LABELS[c]}
                  </span>
                ))
              ) : (
                <span className="info-list__empty">-</span>
              )}
            </dd>
          </div>
          <div className="info-list__row">
            <dt className="info-list__label">장비</dt>
            <dd className="info-list__value">
              {exercise.equipment ? (
                <span className="mini-badge mini-badge--equip">
                  {EQUIPMENT_LABELS[exercise.equipment]}
                </span>
              ) : (
                <span className="info-list__empty">-</span>
              )}
            </dd>
          </div>
          <div className="info-list__row">
            <dt className="info-list__label">그립</dt>
            <dd className="info-list__value">
              {gripLabel(exercise.grip) || <span className="info-list__empty">-</span>}
            </dd>
          </div>
        </dl>

        {exercise.description && <p className="detail__desc">{exercise.description}</p>}

        {recent.length > 0 && (
          <>
            <div className="exrec-head">
              <h2 className="detail__section">최근 기록</h2>
              {recentTotal > RECENT_LIMIT && (
                <button
                  type="button"
                  className="exrec-more"
                  onClick={() => showToast('전체 기록 보기는 곧 추가됩니다')}
                >
                  더보기
                  <ChevronRightIcon className="exrec-more__icon" />
                </button>
              )}
            </div>
            <ul className="exrec-list">
              {recent.map((r) => (
                <li key={r.id}>
                  <button type="button" className="exrec-item" onClick={() => navigate(r.to)}>
                    <span className="exrec-item__date">{formatShortDateWithWeekday(r.date)}</span>
                    {r.sets.length > 0 && (
                      <span className="exrec-item__sets">
                        {r.sets.map((s) => `${s.weight}kg×${s.reps}`).join(' · ')}
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
