import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { routineTemplatesRepo } from '../db/repositories/routineTemplates.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import type { RoutineTemplate, Exercise } from '../db/types.ts'
import { BottomSheet } from '../components/BottomSheet.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { useToast } from '../components/Toast.tsx'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  MoreIcon,
  PencilIcon,
  TrashIcon,
} from '../components/icons.tsx'
import { EXERCISE_CATEGORY_LABELS } from '../constants.ts'

export function RoutineTemplateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const showToast = useToast()
  const [template, setTemplate] = useState<RoutineTemplate | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const [t, exs] = await Promise.all([
      routineTemplatesRepo.findById(id),
      exercisesRepo.findAll(),
    ])
    setTemplate(t ?? null)
    setExercises(exs)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  function exerciseName(exId: string): string {
    return exercises.find((e) => e.id === exId)?.name ?? '(삭제된 운동)'
  }

  async function handleDelete() {
    if (!template) return
    await routineTemplatesRepo.delete(template.id)
    setConfirmDel(false)
    showToast('루틴이 삭제되었습니다')
    navigate('/routines', { replace: true })
  }

  if (loading) {
    return <div className="detail"><p className="page__placeholder">불러오는 중...</p></div>
  }

  if (!template) {
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

  const hasExercises = template.exercises.length > 0

  return (
    <div className="detail">
      <header className="detail__bar">
        <button type="button" className="detail__back" onClick={() => navigate(-1)} aria-label="뒤로">
          <ChevronLeftIcon />
        </button>
        <button type="button" className="detail__menu" onClick={() => setMenuOpen(true)} aria-label="더보기">
          <MoreIcon />
        </button>
      </header>

      <div className="detail__body">
        <div className="routine-detail__titlerow">
          <h1 className="detail__title">{template.title || '루틴'}</h1>
          {template.categories.map((c) => (
            <span key={c} className="mini-badge mini-badge--cat">
              {EXERCISE_CATEGORY_LABELS[c]}
            </span>
          ))}
        </div>

        <h2 className="detail__section">운동</h2>
        {!hasExercises ? (
          <p className="info-list__empty">등록된 운동이 없습니다.</p>
        ) : (
          <ul className="routine-readonly">
            {template.exercises.map((r, ri) => (
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

        {template.memo && (
          <>
            <h2 className="detail__section">메모</h2>
            <p className="detail__desc">{template.memo}</p>
          </>
        )}
      </div>

      {hasExercises && (
        <div className="detail__footer">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => navigate(`/logs/new?fromTemplate=${template.id}`)}
          >
            이 루틴으로 기록 시작
          </button>
        </div>
      )}

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title={template.title || '루틴'}>
        <ul className="action-menu">
          <li>
            <button
              type="button"
              className="action-menu__item"
              onClick={() => {
                setMenuOpen(false)
                navigate(`/routines/${template.id}/edit`)
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
                  navigate(`/logs/new?fromTemplate=${template.id}`)
                }}
              >
                <CopyIcon className="action-menu__icon" />
                이 루틴으로 기록 시작
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
        title="루틴을 삭제할까요?"
        message="지난 기록은 그대로 유지됩니다."
        confirmLabel="삭제"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDel(false)}
      />
    </div>
  )
}
