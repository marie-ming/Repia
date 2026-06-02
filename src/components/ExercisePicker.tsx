import { useEffect, useMemo, useState } from 'react'
import type { Exercise, ExerciseCategory, Equipment } from '../db/types.ts'
import { CheckIcon, SearchIcon, ChevronLeftIcon } from './icons.tsx'
import {
  EXERCISE_CATEGORY_OPTIONS,
  EXERCISE_CATEGORY_LABELS,
  EQUIPMENT_OPTIONS,
  EQUIPMENT_LABELS,
} from '../constants.ts'

type CategoryFilter = ExerciseCategory | 'all'
type EquipmentFilter = Equipment | 'all'

interface ExercisePickerProps {
  open: boolean
  exercises: Exercise[]
  excludeIds: string[] // already added — hidden from the picker
  onClose: () => void
  onConfirm: (ids: string[]) => void
}

export function ExercisePicker({
  open,
  exercises,
  excludeIds,
  onClose,
  onConfirm,
}: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [equipment, setEquipment] = useState<EquipmentFilter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      setSelected(new Set())
      setQuery('')
      setCategory('all')
      setEquipment('all')
    }
  }, [open])

  const exclude = useMemo(() => new Set(excludeIds), [excludeIds])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises.filter((ex) => {
      if (exclude.has(ex.id)) return false
      if (category !== 'all' && !ex.categories.includes(category)) return false
      if (equipment !== 'all' && ex.equipment !== equipment) return false
      if (q && !ex.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [exercises, exclude, query, category, equipment])

  if (!open) return null

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="picker">
      <header className="picker__bar">
        <button type="button" className="picker__close" onClick={onClose} aria-label="닫기">
          <ChevronLeftIcon />
        </button>
        <span className="picker__title">운동 선택</span>
        <button
          type="button"
          className="picker__confirm"
          disabled={selected.size === 0}
          onClick={() => onConfirm([...selected])}
        >
          추가{selected.size > 0 ? ` ${selected.size}` : ''}
        </button>
      </header>

      <div className="picker__body">
        <div className="picker__sticky">
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
        <div className="chips chips--scroll">
          <button
            type="button"
            className={equipment === 'all' ? 'chip chip--active' : 'chip'}
            onClick={() => setEquipment('all')}
          >
            전체
          </button>
          {EQUIPMENT_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={equipment === opt.value ? 'chip chip--active' : 'chip'}
              onClick={() => setEquipment(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        </div>

        {visible.length === 0 ? (
          <p className="page__placeholder">선택할 운동이 없습니다.</p>
        ) : (
          <ul className="exercise-list">
            {visible.map((ex) => {
              const isSel = selected.has(ex.id)
              return (
                <li key={ex.id}>
                  <button
                    type="button"
                    className={isSel ? 'exercise-card exercise-card--selected' : 'exercise-card'}
                    onClick={() => toggle(ex.id)}
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
                    {isSel && <CheckIcon className="exercise-card__check" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
