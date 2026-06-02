import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type {
  Session,
  SessionStatus,
  RoutineExercise,
  Member,
  Exercise,
} from '../db/types.ts'
import { sessionsRepo } from '../db/repositories/sessions.ts'
import { membersRepo } from '../db/repositories/members.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { Select } from '../components/Select.tsx'
import { ExercisePicker } from '../components/ExercisePicker.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { useToast } from '../components/Toast.tsx'
import { ChevronLeftIcon } from '../components/icons.tsx'
import { SESSION_STATUS_OPTIONS } from '../constants.ts'
import { todayISODate } from '../utils/date.ts'

interface FormData {
  memberId: string | null
  date: string
  time: string
  status: SessionStatus
  routine: RoutineExercise[]
  memo: string
}

function emptyForm(date: string): FormData {
  return { memberId: null, date, time: '', status: 'reserved', routine: [], memo: '' }
}

function fromSession(s: Session): FormData {
  return {
    memberId: s.memberId,
    date: s.date,
    time: s.time,
    status: s.status,
    routine: s.routine,
    memo: s.memo,
  }
}

export function SessionFormPage() {
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const showToast = useToast()
  const isEdit = !!id
  const defaultDate = searchParams.get('date') ?? todayISODate()

  const [form, setForm] = useState<FormData>(() => emptyForm(defaultDate))
  const initRef = useRef<FormData>(emptyForm(defaultDate))
  const [loaded, setLoaded] = useState(!isEdit)
  const [members, setMembers] = useState<Member[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const load = useCallback(async () => {
    const [m, e] = await Promise.all([
      membersRepo.findAll({ sortBy: 'name' }),
      exercisesRepo.findAll(),
    ])
    setMembers(m)
    setExercises(e)
    if (isEdit && id) {
      const s = await sessionsRepo.findById(id)
      if (s) {
        const initial = fromSession(s)
        setForm(initial)
        initRef.current = initial
        setSession(s)
      }
    }
    setLoaded(true)
  }, [id, isEdit])

  useEffect(() => {
    load()
  }, [load])

  const canSave = !!form.memberId && !!form.date
  const isDirty = JSON.stringify(form) !== JSON.stringify(initRef.current)

  function exerciseName(exId: string): string {
    return exercises.find((e) => e.id === exId)?.name ?? '(삭제된 운동)'
  }

  function handlePickerConfirm(ids: string[]) {
    setForm((f) => {
      const existing = new Set(f.routine.map((r) => r.exerciseId))
      const toAdd = ids
        .filter((x) => !existing.has(x))
        .map((x) => ({ exerciseId: x, sets: [{ weight: 0, reps: 0 }] }))
      return { ...f, routine: [...f.routine, ...toAdd] }
    })
    setPickerOpen(false)
  }

  function removeExercise(ri: number) {
    setForm((f) => ({ ...f, routine: f.routine.filter((_, i) => i !== ri) }))
  }
  function addSet(ri: number) {
    setForm((f) => ({
      ...f,
      routine: f.routine.map((r, i) =>
        i === ri ? { ...r, sets: [...r.sets, { weight: 0, reps: 0 }] } : r,
      ),
    }))
  }
  function removeSet(ri: number, si: number) {
    setForm((f) => ({
      ...f,
      routine: f.routine.map((r, i) =>
        i === ri ? { ...r, sets: r.sets.filter((_, j) => j !== si) } : r,
      ),
    }))
  }
  function updateSet(ri: number, si: number, field: 'weight' | 'reps', value: number) {
    setForm((f) => ({
      ...f,
      routine: f.routine.map((r, i) =>
        i === ri
          ? { ...r, sets: r.sets.map((s, j) => (j === si ? { ...s, [field]: value } : s)) }
          : r,
      ),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave || !form.memberId) return
    const member = members.find((m) => m.id === form.memberId)
    const input = {
      memberId: form.memberId,
      memberNameSnapshot: member?.name ?? '',
      date: form.date,
      time: form.time,
      status: form.status,
      routine: form.routine,
      memo: form.memo,
    }
    if (isEdit && id) {
      await sessionsRepo.update(id, input)
      showToast('수업이 수정되었습니다')
    } else {
      await sessionsRepo.create(input)
      showToast('수업이 추가되었습니다')
    }
    navigate(-1)
  }

  function handleBack() {
    if (isDirty) setConfirmClose(true)
    else navigate(-1)
  }

  async function doDelete() {
    if (!id) return
    await sessionsRepo.delete(id)
    showToast('수업이 삭제되었습니다')
    navigate('/', { replace: true })
  }

  if (!loaded) {
    return <div className="detail"><p className="page__placeholder">불러오는 중...</p></div>
  }

  if (isEdit && !session) {
    return (
      <div className="detail">
        <header className="detail__bar">
          <button type="button" className="detail__back" onClick={() => navigate('/')} aria-label="뒤로">
            <ChevronLeftIcon />
          </button>
          <span className="detail__bar-spacer" />
        </header>
        <div className="empty">
          <p className="empty__title">수업을 찾을 수 없습니다</p>
        </div>
      </div>
    )
  }

  const memberOptions = members.map((m) => ({ value: m.id, label: m.name }))

  return (
    <div className="detail">
      <header className="detail__bar">
        <button type="button" className="detail__back" onClick={handleBack} aria-label="뒤로">
          <ChevronLeftIcon />
        </button>
        <h1 className="detail__bar-title">{isEdit ? '수업 수정' : '수업 추가'}</h1>
        <span className="detail__bar-spacer" />
      </header>

      <div className="detail__body">
        <form className="member-form" onSubmit={handleSubmit}>
          <div className="field">
            <span className="field__label">회원 *</span>
            <Select
              value={form.memberId}
              options={memberOptions}
              onChange={(v) => setForm((f) => ({ ...f, memberId: v }))}
              placeholder="회원 선택"
              searchable
              searchPlaceholder="회원 이름 검색"
            />
          </div>

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
              <input
                className="field__input"
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              />
            </label>
          </div>

          <div className="field">
            <span className="field__label">상태</span>
            <div className="segmented">
              {SESSION_STATUS_OPTIONS.map((opt) => (
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
              {form.routine.map((r, ri) => (
                <div className="routine-ex" key={r.exerciseId}>
                  <div className="routine-ex__head">
                    <span className="routine-ex__name">{exerciseName(r.exerciseId)}</span>
                    <button type="button" className="routine-ex__remove" onClick={() => removeExercise(ri)} aria-label="운동 제거">✕</button>
                  </div>
                  {r.sets.map((set, si) => (
                    <div className="set-row" key={si}>
                      <span className="set-row__no">{si + 1}</span>
                      <input
                        className="set-row__input"
                        type="number"
                        inputMode="decimal"
                        value={set.weight || ''}
                        onChange={(e) => updateSet(ri, si, 'weight', Number(e.target.value))}
                        placeholder="0"
                      />
                      <span className="set-row__unit">kg</span>
                      <input
                        className="set-row__input"
                        type="number"
                        inputMode="numeric"
                        value={set.reps || ''}
                        onChange={(e) => updateSet(ri, si, 'reps', Number(e.target.value))}
                        placeholder="0"
                      />
                      <span className="set-row__unit">회</span>
                      <button type="button" className="set-row__remove" onClick={() => removeSet(ri, si)} aria-label="세트 삭제">✕</button>
                    </div>
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
              placeholder="수업 메모"
              rows={2}
            />
          </label>

          <div className="member-form__actions">
            <button type="submit" className="btn btn--primary" disabled={!canSave}>저장</button>
            {isEdit && (
              <button type="button" className="btn btn--danger-ghost" onClick={() => setConfirmDel(true)}>
                삭제
              </button>
            )}
          </div>
        </form>
      </div>

      <ExercisePicker
        open={pickerOpen}
        exercises={exercises}
        excludeIds={form.routine.map((r) => r.exerciseId)}
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

      <ConfirmDialog
        open={confirmDel}
        title="수업을 삭제할까요?"
        confirmLabel="삭제"
        danger
        onConfirm={doDelete}
        onCancel={() => setConfirmDel(false)}
      />
    </div>
  )
}
