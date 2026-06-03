import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Exercise, ExerciseCategory, Equipment, ExerciseMetric } from '../db/types.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { Select } from '../components/Select.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { useToast } from '../components/Toast.tsx'
import { ChevronLeftIcon } from '../components/icons.tsx'
import {
  EXERCISE_CATEGORY_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXERCISE_METRIC_OPTIONS,
  EXERCISE_METRIC_LABELS,
} from '../constants.ts'
import { fileToResizedDataURL } from '../utils/image.ts'

const MAX_CATEGORIES = 3

interface FormData {
  photos: string[]
  name: string
  categories: ExerciseCategory[]
  equipment: Equipment | null
  grip: string
  metric: ExerciseMetric
  description: string
}

function emptyForm(): FormData {
  return {
    photos: [],
    name: '',
    categories: [],
    equipment: null,
    grip: '',
    metric: 'weight_reps',
    description: '',
  }
}

function fromExercise(ex: Exercise): FormData {
  return {
    photos: ex.photos,
    name: ex.name,
    categories: ex.categories,
    equipment: ex.equipment,
    grip: ex.grip,
    metric: ex.metric,
    description: ex.description,
  }
}

export function ExerciseFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const showToast = useToast()
  const isEdit = !!id

  const [form, setForm] = useState<FormData>(emptyForm)
  const initRef = useRef<FormData>(emptyForm())
  const [loaded, setLoaded] = useState(!isEdit)
  const [confirmClose, setConfirmClose] = useState(false)
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [metricLocked, setMetricLocked] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!id) return
    const ex = await exercisesRepo.findById(id)
    if (ex) {
      const initial = fromExercise(ex)
      setForm(initial)
      initRef.current = initial
      setExercise(ex)
      setMetricLocked(await exercisesRepo.isInUse(id))
    }
    setLoaded(true)
  }, [id])

  useEffect(() => {
    if (isEdit) load()
  }, [isEdit, load])

  const isDirty = JSON.stringify(form) !== JSON.stringify(initRef.current)
  const canSave = form.name.trim().length > 0 && (!isEdit || isDirty)

  function toggleCategory(value: ExerciseCategory) {
    setForm((f) => {
      if (f.categories.includes(value)) {
        return { ...f, categories: f.categories.filter((c) => c !== value) }
      }
      if (f.categories.length >= MAX_CATEGORIES) return f
      return { ...f, categories: [...f.categories, value] }
    })
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    try {
      const dataUrls = await Promise.all(files.map((f) => fileToResizedDataURL(f)))
      setForm((f) => ({ ...f, photos: [...f.photos, ...dataUrls] }))
    } catch {
      // ignore
    } finally {
      e.target.value = ''
    }
  }

  function removePhoto(index: number) {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== index) }))
  }

  function makeRepresentative(index: number) {
    setForm((f) => {
      if (index === 0) return f
      const next = [...f.photos]
      const [picked] = next.splice(index, 1)
      next.unshift(picked)
      return { ...f, photos: next }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    const data = { ...form, name: form.name.trim() }
    if (isEdit && id) {
      await exercisesRepo.update(id, data)
      showToast('운동이 수정되었습니다')
      navigate(-1)
    } else {
      await exercisesRepo.create(data)
      showToast('운동이 추가되었습니다')
      navigate('/exercises', { replace: true })
    }
  }

  function handleBack() {
    if (isDirty) setConfirmClose(true)
    else navigate(-1)
  }

  if (isEdit && !loaded) {
    return (
      <div className="detail">
        <p className="page__placeholder">불러오는 중...</p>
      </div>
    )
  }

  if (isEdit && !exercise) {
    return (
      <div className="detail">
        <header className="detail__bar">
          <button type="button" className="detail__back" onClick={() => navigate('/exercises')} aria-label="뒤로">
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
        <button type="button" className="detail__back" onClick={handleBack} aria-label="뒤로">
          <ChevronLeftIcon />
        </button>
        <h1 className="detail__bar-title">{isEdit ? '운동 수정' : '운동 추가'}</h1>
        <span className="detail__bar-spacer" />
      </header>

      <div className="detail__body">
        <form className="member-form" onSubmit={handleSubmit}>
          <div className="field">
            <span className="field__label">사진 (첫 장이 대표)</span>
            <div className="photo-editor">
              {form.photos.map((photo, i) => (
                <div key={i} className={i === 0 ? 'photo-thumb photo-thumb--main' : 'photo-thumb'}>
                  <img src={photo} alt={`사진 ${i + 1}`} />
                  {i === 0 && <span className="photo-thumb__badge">대표</span>}
                  <button type="button" className="photo-thumb__remove" onClick={() => removePhoto(i)} aria-label="사진 삭제">✕</button>
                  {i !== 0 && (
                    <button type="button" className="photo-thumb__make-main" onClick={() => makeRepresentative(i)}>
                      대표로
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="photo-add" onClick={() => fileRef.current?.click()} aria-label="사진 추가">＋</button>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleFiles} />

          <label className="field">
            <span className="field__label">이름 *</span>
            <input
              className="field__input"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="운동 입력"
              autoFocus
            />
          </label>

          <div className="field">
            <span className="field__label">카테고리 (최대 3개)</span>
            <div className="chips chips--wrap">
              {EXERCISE_CATEGORY_OPTIONS.map((opt) => {
                const selected = form.categories.includes(opt.value)
                const disabled = !selected && form.categories.length >= MAX_CATEGORIES
                return (
                  <button
                    type="button"
                    key={opt.value}
                    className={selected ? 'chip chip--active' : disabled ? 'chip chip--disabled' : 'chip'}
                    onClick={() => toggleCategory(opt.value)}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="field">
            <span className="field__label">장비</span>
            <Select
              value={form.equipment}
              options={EQUIPMENT_OPTIONS}
              onChange={(v) => setForm((f) => ({ ...f, equipment: v }))}
              placeholder="장비 선택"
            />
          </div>

          <div className="field">
            <span className="field__label">측정 방식</span>
            {metricLocked ? (
              <p className="field__locked">
                {EXERCISE_METRIC_LABELS[form.metric]}
                <span className="field__locked-hint">기록이 있어 변경할 수 없습니다</span>
              </p>
            ) : (
              <Select
                value={form.metric}
                options={EXERCISE_METRIC_OPTIONS}
                onChange={(v) => setForm((f) => ({ ...f, metric: v }))}
              />
            )}
          </div>

          <label className="field">
            <span className="field__label">그립</span>
            <input
              className="field__input"
              type="text"
              value={form.grip}
              onChange={(e) => setForm((f) => ({ ...f, grip: e.target.value }))}
              placeholder="그립 입력"
            />
          </label>

          <label className="field">
            <span className="field__label">설명</span>
            <textarea
              className="field__input field__textarea"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="자세, 주의사항 등"
              rows={3}
            />
          </label>

          <div className="member-form__actions">
            <button type="submit" className="btn btn--primary" disabled={!canSave}>저장</button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmClose}
        title="저장하지 않은 변경사항이 있습니다"
        message="닫으면 변경사항이 사라집니다."
        confirmLabel="닫기"
        cancelLabel="계속 작성"
        danger
        onConfirm={() => { setConfirmClose(false); navigate(-1) }}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  )
}
