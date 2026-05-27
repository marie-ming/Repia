import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { sessionsRepo } from '../db/repositories/sessions.ts'
import type { SessionInput } from '../db/repositories/sessions.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import type { Session, Exercise } from '../db/types.ts'
import { SessionFormSheet } from '../components/SessionFormSheet.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { useToast } from '../components/Toast.tsx'
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons.tsx'
import { SESSION_STATUS_LABELS } from '../constants.ts'
import { formatDotDate } from '../utils/date.ts'

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const showToast = useToast()
  const [session, setSession] = useState<Session | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const [s, exs] = await Promise.all([sessionsRepo.findById(id), exercisesRepo.findAll()])
    setSession(s ?? null)
    setExercises(exs)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  function exerciseName(exId: string): string {
    return exercises.find((e) => e.id === exId)?.name ?? '(삭제된 운동)'
  }

  async function handleSave(input: SessionInput) {
    if (!session) return
    await sessionsRepo.update(session.id, input)
    setEditOpen(false)
    showToast('수업이 수정되었습니다')
    await load()
  }

  async function confirmDelete() {
    if (!session) return
    await sessionsRepo.delete(session.id)
    setConfirmDel(false)
    showToast('수업이 삭제되었습니다')
    navigate('/')
  }

  if (loading) {
    return <div className="detail"><p className="page__placeholder">불러오는 중...</p></div>
  }

  if (!session) {
    return (
      <div className="detail">
        <header className="detail__bar">
          <button type="button" className="detail__back" onClick={() => navigate('/')} aria-label="뒤로">
            <ChevronLeftIcon />
          </button>
        </header>
        <div className="empty">
          <p className="empty__title">수업을 찾을 수 없습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="detail">
      <header className="detail__bar">
        <button type="button" className="detail__back" onClick={() => navigate(-1)} aria-label="뒤로">
          <ChevronLeftIcon />
        </button>
        <button type="button" className="detail__edit" onClick={() => setEditOpen(true)}>
          수정
        </button>
      </header>

      <div className="detail__body">
        <h1 className="detail__title">{session.memberNameSnapshot}</h1>

        <div className="session-detail__meta">
          <span className="session-detail__when">
            {formatDotDate(session.date)}
            {session.time && ` · ${session.time}`}
          </span>
          <span className={`session-badge session-badge--${session.status}`}>
            {SESSION_STATUS_LABELS[session.status]}
          </span>
        </div>

        <h2 className="detail__section">운동</h2>
        {session.routine.length === 0 ? (
          <p className="info-list__empty">기록된 운동이 없습니다.</p>
        ) : (
          <ul className="routine-readonly">
            {session.routine.map((r, ri) => (
              <li key={ri} className="routine-readonly__ex">
                <div className="routine-readonly__head">
                  <h3 className="routine-readonly__name">{exerciseName(r.exerciseId)}</h3>
                  <button
                    type="button"
                    className="routine-readonly__link"
                    onClick={() => navigate(`/exercises/${r.exerciseId}`)}
                    aria-label="운동 상세 보기"
                  >
                    <ChevronRightIcon className="routine-readonly__chevron" />
                  </button>
                </div>
                <ul className="routine-readonly__sets">
                  {r.sets.map((s, si) => (
                    <li key={si} className="routine-readonly__set">
                      <span className="routine-readonly__set-no">{si + 1}</span>
                      <span className="routine-readonly__set-val">
                        {s.weight} <em>kg</em> × {s.reps} <em>회</em>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {session.memo && (
          <>
            <h2 className="detail__section">메모</h2>
            <p className="detail__desc">{session.memo}</p>
          </>
        )}
      </div>

      <SessionFormSheet
        open={editOpen}
        session={session}
        defaultDate={session.date}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        onDelete={() => {
          setEditOpen(false)
          setConfirmDel(true)
        }}
      />

      <ConfirmDialog
        open={confirmDel}
        title="수업을 삭제할까요?"
        message={`${session.memberNameSnapshot} · ${formatDotDate(session.date)}`}
        confirmLabel="삭제"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDel(false)}
      />
    </div>
  )
}
