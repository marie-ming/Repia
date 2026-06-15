import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type {
  RoutineTemplate,
  RoutineExercise,
  RoutineLog,
  SetEntry,
  Exercise,
  ExerciseCategory,
} from '../db/types.ts'
import { routineTemplatesRepo } from '../db/repositories/routineTemplates.ts'
import { routineLogsRepo } from '../db/repositories/routineLogs.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { RoutineEditor } from '../components/RoutineEditor.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { useToast } from '../components/Toast.tsx'
import { ChevronLeftIcon } from '../components/icons.tsx'
import { EXERCISE_CATEGORY_OPTIONS } from '../constants.ts'

const MAX_CATEGORIES = 3

interface FormData {
  title: string
  categories: ExerciseCategory[]
  exercises: RoutineExercise[]
  memo: string
}

function emptyForm(): FormData {
  return { title: '', categories: [], exercises: [], memo: '' }
}

function fromTemplate(t: RoutineTemplate): FormData {
  return { title: t.title, categories: t.categories, exercises: t.exercises, memo: t.memo }
}

export function RoutineTemplateFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const showToast = useToast()
  const isEdit = !!id

  const [form, setForm] = useState<FormData>(emptyForm)
  const initRef = useRef<FormData>(emptyForm())
  const [loaded, setLoaded] = useState(!isEdit)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [history, setHistory] = useState<RoutineLog[]>([])
  const [template, setTemplate] = useState<RoutineTemplate | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)

  const load = useCallback(async () => {
    const [exs, allLogs] = await Promise.all([
      exercisesRepo.findAll(),
      routineLogsRepo.findAll(),
    ])
    setExercises(exs)
    setHistory(allLogs)
    if (isEdit && id) {
      const t = await routineTemplatesRepo.findById(id)
      if (t) {
        const initial = fromTemplate(t)
        setForm(initial)
        initRef.current = initial
        setTemplate(t)
      }
    }
    setLoaded(true)
  }, [id, isEdit])

  useEffect(() => {
    load()
  }, [load])

  const isDirty = JSON.stringify(form) !== JSON.stringify(initRef.current)
  const canSave = form.title.trim().length > 0 && (!isEdit || isDirty)

  // 운동별 가장 최근 기록의 세트 구성 (취소 제외)
  const lastSetsByExercise = useMemo(() => {
    const map = new Map<string, SetEntry[]>()
    const sorted = [...history]
      .filter((l) => l.status !== 'cancelled')
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    for (const l of sorted) {
      for (const ex of l.exercises) {
        if (!map.has(ex.exerciseId) && ex.sets.length > 0) {
          map.set(ex.exerciseId, ex.sets)
        }
      }
    }
    return map
  }, [history])


  function toggleCategory(value: ExerciseCategory) {
    setForm((f) => {
      if (f.categories.includes(value)) {
        return { ...f, categories: f.categories.filter((c) => c !== value) }
      }
      if (f.categories.length >= MAX_CATEGORIES) return f
      return { ...f, categories: [...f.categories, value] }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    const input = {
      title: form.title.trim(),
      categories: form.categories,
      exercises: form.exercises,
      memo: form.memo,
    }
    try {
      if (isEdit && id) {
        await routineTemplatesRepo.update(id, input)
        showToast('루틴이 수정되었습니다')
      } else {
        await routineTemplatesRepo.create(input)
        showToast('루틴이 추가되었습니다')
      }
      navigate(-1)
    } catch (err) {
      showToast(err instanceof Error ? `저장 실패: ${err.message}` : '저장에 실패했습니다')
    }
  }

  function handleBack() {
    if (isDirty) setConfirmClose(true)
    else navigate(-1)
  }

  if (!loaded) {
    return <div className="detail"><p className="page__placeholder">불러오는 중...</p></div>
  }

  if (isEdit && !template) {
    return (
      <div className="detail">
        <header className="detail__bar">
          <button type="button" className="detail__back" onClick={() => navigate('/routines')} aria-label="뒤로">
            <ChevronLeftIcon />
          </button>
          <span className="detail__bar-spacer" />
        </header>
        <div className="empty">
          <p className="empty__title">루틴을 찾을 수 없습니다</p>
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
        <h1 className="detail__bar-title">{isEdit ? '루틴 수정' : '루틴 추가'}</h1>
        <span className="detail__bar-spacer" />
      </header>

      <div className="detail__body">
        <form className="member-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">제목 *</span>
            <input
              className="field__input"
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="제목 입력 (예: 하체 루틴)"
            />
          </label>

          <div className="field">
            <span className="field__label">카테고리 (최대 {MAX_CATEGORIES}개)</span>
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
            <span className="field__label">운동</span>
            <RoutineEditor
              value={form.exercises}
              onChange={(exercisesList) => setForm((f) => ({ ...f, exercises: exercisesList }))}
              exercises={exercises}
              lastSetsByExercise={lastSetsByExercise}
            />
          </div>

          <label className="field">
            <span className="field__label">메모</span>
            <textarea
              className="field__input field__textarea"
              value={form.memo}
              onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
              placeholder="루틴 설명, 주의사항 등"
              rows={2}
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
