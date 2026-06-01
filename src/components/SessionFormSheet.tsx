import { useEffect, useRef, useState } from 'react'
import type { Session, SessionStatus, RoutineExercise, Member, Exercise } from '../db/types.ts'
import type { SessionInput } from '../db/repositories/sessions.ts'
import { membersRepo } from '../db/repositories/members.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { BottomSheet } from './BottomSheet.tsx'
import { Select } from './Select.tsx'
import { ExercisePicker } from './ExercisePicker.tsx'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import { SESSION_STATUS_OPTIONS } from '../constants.ts'

interface SessionFormData {
  memberId: string | null
  date: string
  time: string
  status: SessionStatus
  routine: RoutineExercise[]
  memo: string
}

interface SessionFormSheetProps {
  open: boolean
  session: Session | null // null = create
  defaultDate: string
  onClose: () => void
  onSave: (input: SessionInput) => void
  onDelete: (session: Session) => void
}

function emptyForm(date: string): SessionFormData {
  return {
    memberId: null,
    date,
    time: '',
    status: 'reserved',
    routine: [],
    memo: '',
  }
}

export function SessionFormSheet({
  open,
  session,
  defaultDate,
  onClose,
  onSave,
  onDelete,
}: SessionFormSheetProps) {
  const [form, setForm] = useState<SessionFormData>(() => emptyForm(defaultDate))
  const initRef = useRef<SessionFormData>(emptyForm(defaultDate))
  const [confirmClose, setConfirmClose] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.all([membersRepo.findAll({ sortBy: 'name' }), exercisesRepo.findAll()]).then(
      ([m, e]) => {
        setMembers(m)
        setExercises(e)
      },
    )
    const initial: SessionFormData = session
      ? {
          memberId: session.memberId,
          date: session.date,
          time: session.time,
          status: session.status,
          routine: session.routine,
          memo: session.memo,
        }
      : emptyForm(defaultDate)
    setForm(initial)
    initRef.current = initial
    setConfirmClose(false)
  }, [open, session, defaultDate])

  const canSave = !!form.memberId && !!form.date
  const isDirty = JSON.stringify(form) !== JSON.stringify(initRef.current)

  function handleAttemptClose() {
    if (isDirty) setConfirmClose(true)
    else onClose()
  }

  function discardChanges() {
    setConfirmClose(false)
    onClose()
  }

  function exerciseName(id: string): string {
    return exercises.find((e) => e.id === id)?.name ?? '(삭제된 운동)'
  }

  function handlePickerConfirm(ids: string[]) {
    setForm((f) => {
      const existing = new Set(f.routine.map((r) => r.exerciseId))
      const toAdd = ids
        .filter((id) => !existing.has(id))
        .map((id) => ({ exerciseId: id, sets: [{ weight: 0, reps: 0 }] }))
      return { ...f, routine: [...f.routine, ...toAdd] }
    })
    setPickerOpen(false)
  }

  function removeExercise(ri: number) {
    setForm((f) => ({ ...f, routine: f.routine.filter((_, i) => i !== ri) }))
  }

  function addSet(ri: number) {
    setForm((f) => {
      const routine = f.routine.map((r, i) =>
        i === ri ? { ...r, sets: [...r.sets, { weight: 0, reps: 0 }] } : r,
      )
      return { ...f, routine }
    })
  }

  function removeSet(ri: number, si: number) {
    setForm((f) => {
      const routine = f.routine.map((r, i) =>
        i === ri ? { ...r, sets: r.sets.filter((_, j) => j !== si) } : r,
      )
      return { ...f, routine }
    })
  }

  function updateSet(ri: number, si: number, field: 'weight' | 'reps', value: number) {
    setForm((f) => {
      const routine = f.routine.map((r, i) =>
        i === ri
          ? { ...r, sets: r.sets.map((s, j) => (j === si ? { ...s, [field]: value } : s)) }
          : r,
      )
      return { ...f, routine }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave || !form.memberId) return
    const member = members.find((m) => m.id === form.memberId)
    onSave({
      memberId: form.memberId,
      memberNameSnapshot: member?.name ?? '',
      date: form.date,
      time: form.time,
      status: form.status,
      routine: form.routine,
      memo: form.memo,
    })
  }

  const memberOptions = members.map((m) => ({ value: m.id, label: `${m.emoji} ${m.name}` }))

  return (
    <BottomSheet open={open} onClose={handleAttemptClose} title={session ? '수업 수정' : '수업 추가'}>
      <form className="member-form" onSubmit={handleSubmit}>
        <div className="field">
          <span className="field__label">회원 *</span>
          {members.length === 0 ? (
            <p className="field__hint">먼저 회원을 등록해주세요.</p>
          ) : (
            <Select
              value={form.memberId}
              options={memberOptions}
              onChange={(v) => setForm((f) => ({ ...f, memberId: v }))}
              placeholder="회원 선택"
              searchable
              searchPlaceholder="회원 이름 검색"
            />
          )}
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
                className={
                  form.status === opt.value ? 'segmented__item segmented__item--active' : 'segmented__item'
                }
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
                  <button
                    type="button"
                    className="routine-ex__remove"
                    onClick={() => removeExercise(ri)}
                    aria-label="운동 제거"
                  >
                    ✕
                  </button>
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
                    <button
                      type="button"
                      className="set-row__remove"
                      onClick={() => removeSet(ri, si)}
                      aria-label="세트 삭제"
                    >
                      ✕
                    </button>
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
          <button type="submit" className="btn btn--primary" disabled={!canSave}>
            저장
          </button>
          {session && (
            <button
              type="button"
              className="btn btn--danger-ghost"
              onClick={() => onDelete(session)}
            >
              삭제
            </button>
          )}
        </div>
      </form>

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
        onConfirm={discardChanges}
        onCancel={() => setConfirmClose(false)}
      />
    </BottomSheet>
  )
}
