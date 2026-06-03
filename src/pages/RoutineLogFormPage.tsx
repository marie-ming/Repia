import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type {
  RoutineLog,
  RoutineLogStatus,
  RoutineExercise,
  SetEntry,
  ExerciseMetric,
  Exercise,
} from '../db/types.ts'
import { routineLogsRepo } from '../db/repositories/routineLogs.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { ExercisePicker } from '../components/ExercisePicker.tsx'
import { SetRow } from '../components/SetRow.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { useToast } from '../components/Toast.tsx'
import { routineTemplatesRepo } from '../db/repositories/routineTemplates.ts'
import { ChevronLeftIcon } from '../components/icons.tsx'
import { ROUTINE_LOG_STATUS_OPTIONS } from '../constants.ts'
import { nowHHMM, todayISODate } from '../utils/date.ts'

interface FormData {
  title: string
  date: string
  time: string
  status: RoutineLogStatus
  exercises: RoutineExercise[]
  memo: string
  templateId: string | null
}

function emptyForm(date: string): FormData {
  return { title: '', date, time: nowHHMM(), status: 'planned', exercises: [], memo: '', templateId: null }
}

function fromLog(l: RoutineLog): FormData {
  return {
    title: l.title,
    date: l.date,
    time: l.time,
    status: l.status,
    exercises: l.exercises,
    memo: l.memo,
    templateId: l.templateId,
  }
}

export function RoutineLogFormPage() {
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const showToast = useToast()
  const isEdit = !!id
  const defaultDate = searchParams.get('date') ?? todayISODate()
  const fromId = searchParams.get('from')
  const fromTemplateId = searchParams.get('fromTemplate')

  const [form, setForm] = useState<FormData>(() => emptyForm(defaultDate))
  const initRef = useRef<FormData>(emptyForm(defaultDate))
  const [loaded, setLoaded] = useState(!isEdit)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [history, setHistory] = useState<RoutineLog[]>([])
  const [log, setLog] = useState<RoutineLog | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)

  const load = useCallback(async () => {
    const [exs, allLogs] = await Promise.all([
      exercisesRepo.findAll(),
      routineLogsRepo.findAll(),
    ])
    setExercises(exs)
    setHistory(allLogs)
    if (isEdit && id) {
      const l = await routineLogsRepo.findById(id)
      if (l) {
        const initial = fromLog(l)
        setForm(initial)
        initRef.current = initial
        setLog(l)
      }
    } else if (fromId) {
      // 다른 기록을 그대로 복제해 오늘 신규로 (세트 값 포함)
      const src = await routineLogsRepo.findById(fromId)
      if (src) {
        const initial: FormData = {
          title: src.title,
          date: defaultDate,
          time: nowHHMM(),
          status: 'planned',
          exercises: src.exercises.map((r) => ({
            exerciseId: r.exerciseId,
            sets: r.sets.map((s) => ({ ...s })),
          })),
          memo: '',
          templateId: null,
        }
        setForm(initial)
        initRef.current = initial
      }
    } else if (fromTemplateId) {
      // 루틴 템플릿으로 기록 시작
      const tpl = await routineTemplatesRepo.findById(fromTemplateId)
      if (tpl) {
        const initial: FormData = {
          title: tpl.title,
          date: defaultDate,
          time: nowHHMM(),
          status: 'planned',
          exercises: tpl.exercises.map((r) => ({
            exerciseId: r.exerciseId,
            sets: r.sets.map((s) => ({ ...s })),
          })),
          memo: '',
          templateId: tpl.id,
        }
        setForm(initial)
        initRef.current = initial
      }
    }
    setLoaded(true)
  }, [id, isEdit, fromId, fromTemplateId, defaultDate])

  useEffect(() => {
    load()
  }, [load])

  const isDirty = JSON.stringify(form) !== JSON.stringify(initRef.current)
  const canSave = !!form.date && (!isEdit || isDirty)

  // 운동별 가장 최근 기록의 세트 구성 전체 (현재 편집 중인 기록·취소 제외)
  const lastSetsByExercise = useMemo(() => {
    const map = new Map<string, SetEntry[]>()
    const sorted = [...history]
      .filter((l) => l.id !== id && l.status !== 'cancelled')
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    for (const l of sorted) {
      for (const ex of l.exercises) {
        if (!map.has(ex.exerciseId) && ex.sets.length > 0) {
          map.set(ex.exerciseId, ex.sets)
        }
      }
    }
    return map
  }, [history, id])

  function exerciseName(exId: string): string {
    return exercises.find((e) => e.id === exId)?.name ?? '(삭제된 운동)'
  }

  function handlePickerConfirm(ids: string[]) {
    setForm((f) => {
      const toAdd = ids.map((x) => {
        const prev = lastSetsByExercise.get(x)
        return {
          exerciseId: x,
          sets: prev ? prev.map((s) => ({ ...s })) : [{ weight: 0, reps: 0 }],
        }
      })
      return { ...f, exercises: [...f.exercises, ...toAdd] }
    })
    setPickerOpen(false)
  }

  function removeExercise(ri: number) {
    setForm((f) => ({ ...f, exercises: f.exercises.filter((_, i) => i !== ri) }))
  }
  function addSet(ri: number) {
    setForm((f) => ({
      ...f,
      exercises: f.exercises.map((r, i) => {
        if (i !== ri) return r
        const last = r.sets[r.sets.length - 1]
        const next = last ? { ...last } : { weight: 0, reps: 0 }
        return { ...r, sets: [...r.sets, next] }
      }),
    }))
  }
  function removeSet(ri: number, si: number) {
    setForm((f) => ({
      ...f,
      exercises: f.exercises.map((r, i) =>
        i === ri ? { ...r, sets: r.sets.filter((_, j) => j !== si) } : r,
      ),
    }))
  }
  function updateSet(ri: number, si: number, patch: Partial<SetEntry>) {
    setForm((f) => ({
      ...f,
      exercises: f.exercises.map((r, i) =>
        i === ri
          ? { ...r, sets: r.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) }
          : r,
      ),
    }))
  }

  function metricFor(exId: string): ExerciseMetric {
    return exercises.find((e) => e.id === exId)?.metric ?? 'weight_reps'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    const input = {
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      status: form.status,
      exercises: form.exercises,
      memo: form.memo,
      templateId: form.templateId,
    }
    if (isEdit && id) {
      await routineLogsRepo.update(id, input)
      showToast('기록이 수정되었습니다')
    } else {
      await routineLogsRepo.create(input)
      showToast('기록이 추가되었습니다')
    }
    navigate(-1)
  }

  function handleBack() {
    if (isDirty) setConfirmClose(true)
    else navigate(-1)
  }

  if (!loaded) {
    return <div className="detail"><p className="page__placeholder">불러오는 중...</p></div>
  }

  if (isEdit && !log) {
    return (
      <div className="detail">
        <header className="detail__bar">
          <button type="button" className="detail__back" onClick={() => navigate('/')} aria-label="뒤로">
            <ChevronLeftIcon />
          </button>
          <span className="detail__bar-spacer" />
        </header>
        <div className="empty">
          <p className="empty__title">기록을 찾을 수 없습니다</p>
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
        <h1 className="detail__bar-title">{isEdit ? '기록 수정' : '기록 추가'}</h1>
        <span className="detail__bar-spacer" />
      </header>

      <div className="detail__body">
        <form className="member-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">제목</span>
            <input
              className="field__input"
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="제목 입력 (예: 하체 데이)"
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span className="field__label">날짜</span>
              <input
                className="field__input"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </label>
            <label className="field">
              <span className="field__label">시간</span>
              <span className="time-input">
                <input
                  className="field__input"
                  type="time"
                  value={form.time}
                  data-empty={form.time ? undefined : 'true'}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                />
                {!form.time && <span className="time-input__placeholder">시간 선택</span>}
              </span>
            </label>
          </div>

          <div className="field">
            <span className="field__label">상태</span>
            <div className="segmented">
              {ROUTINE_LOG_STATUS_OPTIONS.filter((o) => o.value !== 'cancelled').map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className={form.status === opt.value ? 'segmented__item segmented__item--active' : 'segmented__item'}
                  onClick={() => setForm((f) => ({ ...f, status: opt.value }))}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field__label">운동</span>
            <div className="routine-editor">
              {form.exercises.map((r, ri) => (
                <div className="routine-ex" key={ri}>
                  <div className="routine-ex__head">
                    <span className="routine-ex__name">{exerciseName(r.exerciseId)}</span>
                    <button type="button" className="routine-ex__remove" onClick={() => removeExercise(ri)} aria-label="운동 제거">✕</button>
                  </div>
                  {r.sets.map((set, si) => (
                    <SetRow
                      key={si}
                      index={si}
                      metric={metricFor(r.exerciseId)}
                      set={set}
                      onChange={(patch) => updateSet(ri, si, patch)}
                      onRemove={() => removeSet(ri, si)}
                    />
                  ))}
                  <button type="button" className="routine-ex__add-set" onClick={() => addSet(ri)}>
                    + 세트 추가
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="add-exercise-btn"
                onClick={() => setPickerOpen(true)}
                disabled={exercises.length === 0}
              >
                + 운동 추가
              </button>
            </div>
          </div>

          <label className="field">
            <span className="field__label">메모</span>
            <textarea
              className="field__input field__textarea"
              value={form.memo}
              onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
              placeholder="컨디션, 기록 등"
              rows={2}
            />
          </label>

          <div className="member-form__actions">
            <button type="submit" className="btn btn--primary" disabled={!canSave}>저장</button>
          </div>
        </form>
      </div>

      <ExercisePicker
        open={pickerOpen}
        exercises={exercises}
        excludeIds={[]}
        onClose={() => setPickerOpen(false)}
        onConfirm={handlePickerConfirm}
      />

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
