import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type {
  Session,
  SessionStatus,
  RoutineExercise,
  ExerciseMetric,
  Member,
  Exercise,
} from '../db/types.ts'
import { sessionsRepo } from '../db/repositories/sessions.ts'
import { membersRepo } from '../db/repositories/members.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { Select } from '../components/Select.tsx'
import { RoutineEditor } from '../components/RoutineEditor.tsx'
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

  const isDirty = JSON.stringify(form) !== JSON.stringify(initRef.current)
  const canSave = !!form.memberId && !!form.date && (!isEdit || isDirty)

  async function handleCreateExercise(name: string, metric: ExerciseMetric) {
    const ex = await exercisesRepo.create({ name, metric })
    setExercises((prev) => [...prev, ex])
    return ex
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
    try {
      if (isEdit && id) {
        await sessionsRepo.update(id, input)
        showToast('수업이 수정되었습니다')
      } else {
        await sessionsRepo.create(input)
        showToast('수업이 추가되었습니다')
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

  // 수업종료 회원은 숨김. 단, 수정 모드에서 이미 선택된 회원이 종료된 경우 그 옵션은 유지.
  const memberOptions = members
    .filter((m) => m.status !== 'ended' || m.id === form.memberId)
    .map((m) => ({ value: m.id, label: m.name }))

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
            <RoutineEditor
              value={form.routine}
              onChange={(routine) => setForm((f) => ({ ...f, routine }))}
              exercises={exercises}
              onCreateExercise={handleCreateExercise}
            />
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
