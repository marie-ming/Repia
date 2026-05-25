import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import type { Exercise, ExerciseCategory } from '../db/types.ts'
import { ExerciseFormSheet } from '../components/ExerciseFormSheet.tsx'
import type { ExerciseFormData } from '../components/ExerciseFormSheet.tsx'
import { PlusIcon, SearchIcon } from '../components/icons.tsx'
import { EXERCISE_CATEGORY_OPTIONS, EXERCISE_CATEGORY_LABELS, EQUIPMENT_LABELS } from '../constants.ts'

type CategoryFilter = ExerciseCategory | 'all'

export function ExercisesPage() {
  const navigate = useNavigate()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [sheetOpen, setSheetOpen] = useState(false)

  const load = useCallback(async () => {
    const all = await exercisesRepo.findAll()
    setExercises(all)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises.filter((ex) => {
      if (category !== 'all' && !ex.categories.includes(category)) return false
      if (q && !ex.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [exercises, query, category])

  async function handleCreate(data: ExerciseFormData) {
    await exercisesRepo.create(data)
    setSheetOpen(false)
    await load()
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">운동</h1>
      </header>

      {!loading && exercises.length > 0 && (
        <>
          <div className="member-toolbar">
            <div className="search">
              <SearchIcon className="search__icon" />
              <input
                className="search__input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="운동 이름 검색"
              />
            </div>
          </div>
          <div className="chips chips--scroll">
            <button
              type="button"
              className={category === 'all' ? 'chip chip--active' : 'chip'}
              onClick={() => setCategory('all')}
            >
              전체
            </button>
            {EXERCISE_CATEGORY_OPTIONS.map((opt) => (
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
        </>
      )}

      {loading ? (
        <p className="page__placeholder">불러오는 중...</p>
      ) : visible.length === 0 ? (
        <div className="empty">
          <p className="empty__title">
            {exercises.length === 0 ? '등록된 운동이 없습니다' : '해당하는 운동이 없습니다'}
          </p>
          <p className="empty__desc">
            {exercises.length === 0
              ? '아래 + 버튼으로 첫 운동을 추가해보세요.'
              : '검색어나 카테고리를 바꿔보세요.'}
          </p>
        </div>
      ) : (
        <ul className="exercise-list">
          {visible.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                className="exercise-card"
                onClick={() => navigate(`/exercises/${ex.id}`)}
              >
                <span className="exercise-card__thumb">
                  {ex.photos[0] ? (
                    <img src={ex.photos[0]} alt="" />
                  ) : (
                    <span className="exercise-card__thumb-empty">💪</span>
                  )}
                </span>
                <span className="exercise-card__info">
                  <span className="exercise-card__name">{ex.name}</span>
                  <span className="exercise-card__badges">
                    {ex.categories.map((c) => (
                      <span key={c} className="mini-badge mini-badge--cat">
                        {EXERCISE_CATEGORY_LABELS[c]}
                      </span>
                    ))}
                    {ex.equipment && (
                      <span className="mini-badge mini-badge--equip">
                        {EQUIPMENT_LABELS[ex.equipment]}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="fab" onClick={() => setSheetOpen(true)} aria-label="운동 추가">
        <PlusIcon />
      </button>

      <ExerciseFormSheet
        open={sheetOpen}
        exercise={null}
        onClose={() => setSheetOpen(false)}
        onSave={handleCreate}
        onDelete={() => {}}
      />
    </div>
  )
}
