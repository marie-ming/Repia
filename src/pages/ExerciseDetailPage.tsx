import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import type { Exercise } from '../db/types.ts'
import { ChevronLeftIcon } from '../components/icons.tsx'
import { EXERCISE_CATEGORY_LABELS, EQUIPMENT_LABELS, gripLabel } from '../constants.ts'

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)

  const load = useCallback(async () => {
    if (!id) return
    const ex = await exercisesRepo.findById(id)
    setExercise(ex ?? null)
    setLoading(false)
  }, [id])

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
      </div>
    </div>
  )
}
