import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { routineLogsRepo } from '../db/repositories/routineLogs.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { routineTemplatesRepo } from '../db/repositories/routineTemplates.ts'
import type { RoutineLog, Exercise } from '../db/types.ts'
import { BottomSheet } from '../components/BottomSheet.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { useToast } from '../components/Toast.tsx'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  CopyIcon,
  MoreIcon,
  PencilIcon,
  TrashIcon,
} from '../components/icons.tsx'
import { ROUTINE_LOG_STATUS_LABELS, formatSet } from '../constants.ts'
import { formatDotDate } from '../utils/date.ts'

export function RoutineLogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const showToast = useToast()
  const [log, setLog] = useState<RoutineLog | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const [l, exs] = await Promise.all([routineLogsRepo.findById(id), exercisesRepo.findAll()])
    setLog(l ?? null)
    setExercises(exs)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  function exerciseName(exId: string): string {
    return exercises.find((e) => e.id === exId)?.name ?? '(삭제된 운동)'
  }

  function metricFor(exId: string) {
    return exercises.find((e) => e.id === exId)?.metric ?? 'weight_reps'
  }

  async function handleMakeTemplate() {
    if (!log) return
    setMenuOpen(false)
    await routineTemplatesRepo.create({
      title: log.title || '새 루틴',
      exercises: log.exercises.map((r) => ({
        exerciseId: r.exerciseId,
        sets: r.sets.map((s) => ({ ...s })),
      })),
      memo: '',
    })
    showToast('루틴으로 저장되었습니다')
  }

  async function handleDelete() {
    if (!log) return
    await routineLogsRepo.delete(log.id)
    setConfirmDel(false)
    showToast('기록이 삭제되었습니다')
    navigate('/', { replace: true })
  }

  if (loading) {
    return <div className="detail"><p className="page__placeholder">불러오는 중...</p></div>
  }

  if (!log) {
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

  const hasExercises = log.exercises.length > 0

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
        <h1 className="detail__title">{log.title || '운동 기록'}</h1>

        <div className="session-detail__meta">
          <span className="session-detail__when">
            {formatDotDate(log.date)}
            {log.time && ` · ${log.time}`}
          </span>
          <span className={`session-badge session-badge--${log.status}`}>
            {ROUTINE_LOG_STATUS_LABELS[log.status]}
          </span>
        </div>

        <h2 className="detail__section">운동</h2>
        {!hasExercises ? (
          <p className="info-list__empty">기록된 운동이 없습니다.</p>
        ) : (
          <ul className="routine-readonly">
            {log.exercises.map((r, ri) => (
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
                        {formatSet(metricFor(r.exerciseId), s)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {log.memo && (
          <>
            <h2 className="detail__section">메모</h2>
            <p className="detail__desc">{log.memo}</p>
          </>
        )}
      </div>

      <BottomSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={log.title || '운동 기록'}
      >
        <ul className="action-menu">
          <li>
            <button
              type="button"
              className="action-menu__item"
              onClick={() => {
                setMenuOpen(false)
                navigate(`/logs/${log.id}/edit`)
              }}
            >
              <PencilIcon className="action-menu__icon" />
              수정
            </button>
          </li>
          {hasExercises && (
            <li>
              <button
                type="button"
                className="action-menu__item"
                onClick={() => {
                  setMenuOpen(false)
                  navigate(`/logs/new?from=${log.id}`)
                }}
              >
                <CopyIcon className="action-menu__icon" />
                이대로 기록 추가
              </button>
            </li>
          )}
          {hasExercises && (
            <li>
              <button type="button" className="action-menu__item" onClick={handleMakeTemplate}>
                <ClipboardListIcon className="action-menu__icon" />
                루틴으로 저장
              </button>
            </li>
          )}
          <li>
            <button
              type="button"
              className="action-menu__item action-menu__item--danger"
              onClick={() => {
                setMenuOpen(false)
                setConfirmDel(true)
              }}
            >
              <TrashIcon className="action-menu__icon" />
              삭제
            </button>
          </li>
        </ul>
      </BottomSheet>

      <ConfirmDialog
        open={confirmDel}
        title="기록을 삭제할까요?"
        confirmLabel="삭제"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDel(false)}
      />
    </div>
  )
}
