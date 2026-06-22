import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { routineLogsRepo } from '../db/repositories/routineLogs.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import { routineTemplatesRepo } from '../db/repositories/routineTemplates.ts'
import type { RoutineLog, Exercise, ExerciseCategory } from '../db/types.ts'
import { BottomSheet } from '../components/BottomSheet.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { useToast } from '../components/Toast.tsx'
import {
  ChevronLeftIcon,
  ClipboardListIcon,
  CopyIcon,
  MoreIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
} from '../components/icons.tsx'
import { ROUTINE_LOG_STATUS_LABELS, EXERCISE_CATEGORY_LABELS } from '../constants.ts'
import { formatDotDate } from '../utils/date.ts'
import { RoutineReadonly } from '../components/RoutineReadonly.tsx'
import { generateWorkoutShareImage } from '../utils/shareImage.ts'
import { bestValue, formatBest } from '../utils/setStats.ts'

export function RoutineLogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const showToast = useToast()
  const [log, setLog] = useState<RoutineLog | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [allLogs, setAllLogs] = useState<RoutineLog[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const [l, exs, logs] = await Promise.all([
      routineLogsRepo.findById(id),
      exercisesRepo.findAll(),
      routineLogsRepo.findAll(),
    ])
    setLog(l ?? null)
    setExercises(exs)
    setAllLogs(logs)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const exMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  // D: 기록 내 운동들의 첫 번째 카테고리만 모아 부위 태그로 (중복 제거)
  const bodyTags = useMemo(() => {
    if (!log) return [] as ExerciseCategory[]
    const seen = new Set<ExerciseCategory>()
    const out: ExerciseCategory[] = []
    for (const r of log.exercises) {
      const c = exMap.get(r.exerciseId)?.categories[0]
      if (c && !seen.has(c)) {
        seen.add(c)
        out.push(c)
      }
    }
    return out
  }, [log, exMap])

  // C: 운동별 직전 완료 기록의 최고치 (이전 기록 대비용)
  const prevBest = useMemo(() => {
    const map = new Map<string, number | null>()
    if (!log) return map
    const cur = log.date + log.time
    for (const r of log.exercises) {
      const metric = exMap.get(r.exerciseId)?.metric ?? 'weight_reps'
      const prev = allLogs
        .filter(
          (l) =>
            l.id !== log.id &&
            l.status === 'completed' &&
            l.date + l.time < cur &&
            l.exercises.some((e) => e.exerciseId === r.exerciseId),
        )
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0]
      const prevSets = prev?.exercises.find((e) => e.exerciseId === r.exerciseId)?.sets ?? []
      map.set(r.exerciseId, bestValue(metric, prevSets))
    }
    return map
  }, [log, allLogs, exMap])

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

  async function handleShare() {
    if (!log) return
    setMenuOpen(false)
    try {
      const name = log.title || '운동 기록'
      const blob = await generateWorkoutShareImage(
        { title: name, date: log.date, time: log.time, items: log.exercises, memo: log.memo },
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
      if ((err as Error)?.name === 'AbortError') return // 사용자가 공유 취소
      showToast('공유할 수 없습니다')
    }
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

      <div className="detail__body detail__body--stickyhead">
        <div className="logdetail__head">
          <div className="logdetail__titlerow">
            <h1 className="detail__title">{log.title || '운동 기록'}</h1>
            {bodyTags.length > 0 && (
              <div className="logdetail__tags">
                {bodyTags.map((c) => (
                  <span key={c} className="mini-badge mini-badge--cat">
                    {EXERCISE_CATEGORY_LABELS[c]}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="session-detail__meta">
            <span className="session-detail__when">
              {formatDotDate(log.date)}
              {log.time && ` · ${log.time}`}
            </span>
            <span className={`session-badge session-badge--${log.status}`}>
              {ROUTINE_LOG_STATUS_LABELS[log.status]}
            </span>
          </div>
        </div>

        <h2 className="detail__section">운동</h2>
        {!hasExercises ? (
          <p className="info-list__empty">기록된 운동이 없습니다.</p>
        ) : (
          <RoutineReadonly
            items={log.exercises}
            exercises={exercises}
            onExerciseClick={(exId) => navigate(`/exercises/${exId}`)}
            renderMeta={(r, metric) => {
              const cur = bestValue(metric, r.sets)
              if (cur === null) return null
              const prev = prevBest.get(r.exerciseId) ?? null
              return (
                <span className="routine-readonly__progress">
                  <span className="routine-readonly__best">최고 {formatBest(metric, cur)}</span>
                  {prev !== null && cur !== prev && (
                    <span
                      className={
                        cur > prev
                          ? 'routine-readonly__delta routine-readonly__delta--up'
                          : 'routine-readonly__delta routine-readonly__delta--down'
                      }
                    >
                      {cur > prev ? '▲' : '▼'} 지난 {formatBest(metric, prev)}
                    </span>
                  )}
                </span>
              )
            }}
          />
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
            <button type="button" className="action-menu__item" onClick={handleShare}>
              <ShareIcon className="action-menu__icon" />
              이미지로 공유
            </button>
          </li>
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
