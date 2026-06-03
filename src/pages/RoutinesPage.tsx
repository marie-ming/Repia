import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { routineTemplatesRepo } from '../db/repositories/routineTemplates.ts'
import { routineLogsRepo } from '../db/repositories/routineLogs.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import type { RoutineTemplate, ExerciseCategory, Exercise } from '../db/types.ts'
import { PlusIcon } from '../components/icons.tsx'
import { EXERCISE_CATEGORY_OPTIONS, EXERCISE_CATEGORY_LABELS } from '../constants.ts'
import { formatDotDate } from '../utils/date.ts'

type CategoryFilter = ExerciseCategory | 'all'

export function RoutinesPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<RoutineTemplate[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [lastByTemplate, setLastByTemplate] = useState<Map<string, string>>(new Map())
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [tpls, exs, logs] = await Promise.all([
      routineTemplatesRepo.findAll({ sortBy: 'updatedAt' }),
      exercisesRepo.findAll(),
      routineLogsRepo.findAll(),
    ])
    const last = new Map<string, string>()
    for (const l of logs) {
      if (!l.templateId || l.status === 'cancelled') continue
      const cur = last.get(l.templateId)
      if (!cur || l.date > cur) last.set(l.templateId, l.date)
    }
    setTemplates(tpls)
    setExercises(exs)
    setLastByTemplate(last)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const nameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of exercises) m.set(e.id, e.name)
    return m
  }, [exercises])

  const usedCategories = useMemo(() => {
    const set = new Set<ExerciseCategory>()
    for (const t of templates) for (const c of t.categories) set.add(c)
    return set
  }, [templates])

  const visible = useMemo(
    () => templates.filter((t) => category === 'all' || t.categories.includes(category)),
    [templates, category],
  )

  return (
    <div className="page">
      <div className="page__sticky">
        <header className="page__header">
          <h1 className="page__title">루틴</h1>
        </header>

        {!loading && usedCategories.size > 0 && (
          <div className="chips chips--scroll">
            <button
              type="button"
              className={category === 'all' ? 'chip chip--active' : 'chip'}
              onClick={() => setCategory('all')}
            >
              전체
            </button>
            {EXERCISE_CATEGORY_OPTIONS.filter((o) => usedCategories.has(o.value)).map((opt) => (
              <button
                type="button"
                key={opt.value}
                className={category === opt.value ? 'chip chip--active' : 'chip'}
                onClick={() => setCategory(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="page__placeholder">불러오는 중...</p>
      ) : templates.length === 0 ? (
        <div className="empty">
          <p className="empty__title">저장된 루틴이 없습니다</p>
          <p className="empty__desc">
            자주 하는 운동 구성을 루틴으로 저장하면 빠르게 기록할 수 있어요.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <p className="empty__title">해당하는 루틴이 없습니다</p>
        </div>
      ) : (
        <ul className="log-list">
          {visible.map((t) => {
            const exNames = t.exercises
              .map((r) => nameById.get(r.exerciseId) ?? '(삭제됨)')
              .join(', ')
            const last = lastByTemplate.get(t.id)
            return (
              <li key={t.id}>
                <button
                  type="button"
                  className="log-card"
                  onClick={() => navigate(`/routines/${t.id}`)}
                >
                  <span className="log-card__main">
                    <span className="log-card__titlerow">
                      <span className="log-card__title">{t.title || '루틴'}</span>
                      {t.categories.map((c) => (
                        <span key={c} className="mini-badge mini-badge--cat">
                          {EXERCISE_CATEGORY_LABELS[c]}
                        </span>
                      ))}
                    </span>
                    {exNames && <span className="log-card__exercises">{exNames}</span>}
                  </span>
                  {last && (
                    <span className="log-card__meta">
                      <span className="log-card__when">최근 {formatDotDate(last)}</span>
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <button
        type="button"
        className="fab"
        onClick={() => navigate('/routines/new')}
        aria-label="루틴 추가"
      >
        <PlusIcon />
      </button>
    </div>
  )
}
