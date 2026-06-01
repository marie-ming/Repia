import { useEffect, useRef, useState } from 'react'
import type { Exercise, ExerciseCategory, Equipment } from '../db/types.ts'
import { BottomSheet } from './BottomSheet.tsx'
import { Select } from './Select.tsx'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import { EXERCISE_CATEGORY_OPTIONS, EQUIPMENT_OPTIONS } from '../constants.ts'
import { fileToResizedDataURL } from '../utils/image.ts'

const MAX_CATEGORIES = 3

export interface ExerciseFormData {
  photos: string[]
  name: string
  categories: ExerciseCategory[]
  equipment: Equipment | null
  grip: string
  description: string
}

interface ExerciseFormSheetProps {
  open: boolean
  exercise: Exercise | null // null = create mode
  onClose: () => void
  onSave: (data: ExerciseFormData) => void
  onDelete: (exercise: Exercise) => void
}

function emptyForm(): ExerciseFormData {
  return {
    photos: [],
    name: '',
    categories: [],
    equipment: null,
    grip: '',
    description: '',
  }
}

export function ExerciseFormSheet({
  open,
  exercise,
  onClose,
  onSave,
  onDelete,
}: ExerciseFormSheetProps) {
  const [form, setForm] = useState<ExerciseFormData>(emptyForm)
  const initRef = useRef<ExerciseFormData>(emptyForm())
  const [confirmClose, setConfirmClose] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const initial: ExerciseFormData = exercise
      ? {
          photos: exercise.photos,
          name: exercise.name,
          categories: exercise.categories,
          equipment: exercise.equipment,
          grip: exercise.grip,
          description: exercise.description,
        }
      : emptyForm()
    setForm(initial)
    initRef.current = initial
    setConfirmClose(false)
  }, [open, exercise])

  const canSave = form.name.trim().length > 0
  const isDirty = JSON.stringify(form) !== JSON.stringify(initRef.current)

  function handleAttemptClose() {
    if (isDirty) setConfirmClose(true)
    else onClose()
  }

  function discardChanges() {
    setConfirmClose(false)
    onClose()
  }

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
      // ignore failed images
    } finally {
      e.target.value = '' // allow re-selecting the same file
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    onSave({ ...form, name: form.name.trim() })
  }

  return (
    <BottomSheet open={open} onClose={handleAttemptClose} title={exercise ? '운동 수정' : '운동 추가'}>
      <form className="exercise-form" onSubmit={handleSubmit}>
        <div className="field">
          <span className="field__label">사진 (첫 장이 대표)</span>
          <div className="photo-editor">
            {form.photos.map((photo, i) => (
              <div
                key={i}
                className={i === 0 ? 'photo-thumb photo-thumb--main' : 'photo-thumb'}
              >
                <img src={photo} alt={`사진 ${i + 1}`} />
                {i === 0 && <span className="photo-thumb__badge">대표</span>}
                <button
                  type="button"
                  className="photo-thumb__remove"
                  onClick={() => removePhoto(i)}
                  aria-label="사진 삭제"
                >
                  ✕
                </button>
                {i !== 0 && (
                  <button
                    type="button"
                    className="photo-thumb__make-main"
                    onClick={() => makeRepresentative(i)}
                  >
                    대표로
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="photo-add"
              onClick={() => fileRef.current?.click()}
              aria-label="사진 추가"
            >
              ＋
            </button>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleFiles}
        />

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
                  className={
                    selected
                      ? 'chip chip--active'
                      : disabled
                        ? 'chip chip--disabled'
                        : 'chip'
                  }
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
          <button type="submit" className="btn btn--primary" disabled={!canSave}>
            저장
          </button>
          {exercise && (
            <button
              type="button"
              className="btn btn--danger-ghost"
              onClick={() => onDelete(exercise)}
            >
              삭제
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={confirmClose}
        title="저장하지 않은 변경사항이 있습니다"
        message="닫으면 변경사항이 사라집니다."
        confirmLabel="닫기"
        cancelLabel="계속 작성"
        danger
        onConfirm={discardChanges}
        onCancel={() => setConfirmClose(false)}
      />
    </BottomSheet>
  )
}
