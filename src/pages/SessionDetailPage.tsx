import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { sessionsRepo } from '../db/repositories/sessions.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import type { Session, Exercise } from '../db/types.ts'
import { ChevronLeftIcon, MoreIcon, PencilIcon, ShareIcon } from '../components/icons.tsx'
import { BottomSheet } from '../components/BottomSheet.tsx'
import { useToast } from '../components/Toast.tsx'
import { SESSION_STATUS_LABELS } from '../constants.ts'
import { formatDotDate } from '../utils/date.ts'
import { RoutineReadonly } from '../components/RoutineReadonly.tsx'
import { generateWorkoutShareImage } from '../utils/shareImage.ts'

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const showToast = useToast()
  const [session, setSession] = useState<Session | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

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

  async function handleShare() {
    if (!session) return
    setMenuOpen(false)
    try {
      const name = session.title || session.memberNameSnapshot || '수업'
      const blob = await generateWorkoutShareImage(
        { title: name, date: session.date, time: session.time, items: session.routine, memo: session.memo },
        exercises,
      )
      const file = new File([blob], `${name}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${name}.png`
        a.click()
        URL.revokeObjectURL(url)
        showToast('이미지를 저장했습니다')
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      showToast('공유할 수 없습니다')
    }
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
          <span className="detail__bar-spacer" />
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
        <button
          type="button"
          className="detail__menu"
          onClick={() => setMenuOpen(true)}
          aria-label="더보기"
        >
          <MoreIcon />
        </button>
      </header>

      <div className="detail__body">
        <button
          type="button"
          className="detail__title detail__title--link"
          onClick={() => navigate(`/members/${session.memberId}`)}
        >
          {session.memberNameSnapshot}
        </button>

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
          <RoutineReadonly
            items={session.routine}
            exercises={exercises}
            onExerciseClick={(exId) => navigate(`/exercises/${exId}`)}
          />
        )}

        {session.memo && (
          <>
            <h2 className="detail__section">메모</h2>
            <p className="detail__desc">{session.memo}</p>
          </>
        )}
      </div>

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title={session.memberNameSnapshot}>
        <ul className="action-menu">
          <li>
            <button
              type="button"
              className="action-menu__item"
              onClick={() => {
                setMenuOpen(false)
                navigate(`/sessions/${session.id}/edit`)
              }}
            >
              <PencilIcon className="action-menu__icon" />
              수정
            </button>
          </li>
          <li>
            <button type="button" className="action-menu__item" onClick={handleShare}>
              <ShareIcon className="action-menu__icon" />
              이미지로 공유
            </button>
          </li>
        </ul>
      </BottomSheet>
    </div>
  )
}
