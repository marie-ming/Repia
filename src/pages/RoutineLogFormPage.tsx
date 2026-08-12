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
import { RoutineEditor } from '../components/RoutineEditor.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { useToast } from '../components/Toast.tsx'
import { routineTemplatesRepo } from '../db/repositories/routineTemplates.ts'
import { ChevronLeftIcon } from '../components/icons.tsx'
import { ROUTINE_LOG_STATUS_OPTIONS } from '../constants.ts'
import { formatDotDate, nowHHMM, todayISODate } from '../utils/date.ts'
import { logDraftRepo, type LogDraft } from '../db/repositories/logDraft.ts'

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
  const [confirmClose, setConfirmClose] = useState(false)
  // 기록을 "추가"하는 경로는 전부 초안을 남긴다(빈 폼·복제·루틴으로 시작).
  // 셋 다 create를 호출하는 신규 작성이라 같게 다루는 게 맞다.
  // 수정은 제외 — 이미 저장된 기록이 있어 원본과 초안 중 무엇을 보여줄지 애매해진다.
  const draftEnabled = !isEdit
  const [pendingDraft, setPendingDraft] = useState<LogDraft | null>(null)

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
          // ...r로 복사해 슈퍼세트 묶음(groupId)까지 그대로 가져온다
          exercises: src.exercises.map((r) => ({ ...r, sets: r.sets.map((s) => ({ ...s })) })),
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
          exercises: tpl.exercises.map((r) => ({ ...r, sets: r.sets.map((s) => ({ ...s })) })),
          memo: '',
          templateId: tpl.id,
        }
        setForm(initial)
        initRef.current = initial
      }
    }
    // 신규 작성이면 어느 경로로 들어왔든 작성 중이던 게 있는지 확인한다.
    // 복제·루틴으로 시작은 이미 프리필됐으므로, 「새로 시작」을 고르면 그 내용이 그대로 남는다.
    if (draftEnabled) {
      const draft = await logDraftRepo.get()
      if (draft) setPendingDraft(draft)
    }
    setLoaded(true)
  }, [id, isEdit, fromId, fromTemplateId, defaultDate, draftEnabled])

  useEffect(() => {
    load()
  }, [load])

  const isDirty = JSON.stringify(form) !== JSON.stringify(initRef.current)
  const canSave = !!form.date && (!isEdit || isDirty)

  // 작성 중인 내용을 계속 남겨둔다. 매 입력마다 쓰지 않도록 잠깐 모아서 저장.
  // 복구 여부를 묻는 중(pendingDraft)에는 빈 폼으로 덮어쓰지 않도록 멈춘다.
  useEffect(() => {
    // 손대지 않았으면 초안을 만들지 않는다. 루틴으로 시작했다가 그냥 나간 경우
    // 프리필된 내용이 초안으로 남아 다음에 뜬금없이 물어보는 걸 막는다.
    if (!draftEnabled || !loaded || pendingDraft || !isDirty) return
    const t = setTimeout(() => {
      logDraftRepo.save(form).catch(() => {
        /* 초안 저장 실패는 사용자를 막을 일이 아니라 조용히 넘긴다 */
      })
    }, 500)
    return () => clearTimeout(t)
  }, [form, draftEnabled, loaded, pendingDraft, isDirty])

  // 디바운스만 두면 마지막 몇 백 ms의 입력이 날아간다. 정작 이 기능이 막으려는 상황
  // (전화가 와서 앱이 백그라운드로 가거나 그대로 종료)이 바로 그 순간에 일어난다.
  // 화면이 가려지거나 페이지가 떠날 때 즉시 한 번 더 저장한다.
  const formRef = useRef(form)
  formRef.current = form
  const dirtyRef = useRef(isDirty)
  dirtyRef.current = isDirty
  useEffect(() => {
    if (!draftEnabled || !loaded || pendingDraft) return
    const flush = () => {
      if (!dirtyRef.current) return
      logDraftRepo.save(formRef.current).catch(() => {})
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [draftEnabled, loaded, pendingDraft])

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

  async function handleCreateExercise(name: string, metric: ExerciseMetric) {
    const ex = await exercisesRepo.create({ name, metric })
    setExercises((prev) => [...prev, ex])
    return ex
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
    try {
      if (isEdit && id) {
        await routineLogsRepo.update(id, input)
        showToast('기록이 수정되었습니다')
      } else {
        await routineLogsRepo.create(input)
        showToast('기록이 추가되었습니다')
      }
      // 저장됐으니 초안은 더 필요 없다 (실패 시에는 남겨둔다)
      if (draftEnabled) await logDraftRepo.clear()
      navigate(-1)
    } catch (err) {
      showToast(err instanceof Error ? `저장 실패: ${err.message}` : '저장에 실패했습니다')
    }
  }

  async function handleBack() {
    if (!isDirty) {
      navigate(-1)
      return
    }
    // 새 기록은 초안이 남으므로 "사라집니다" 경고가 거짓이 된다.
    // 경고 대신 임시 저장됐다고 알리고 그냥 나간다(다음에 이어쓸지 물어본다).
    if (draftEnabled) {
      // 디바운스가 아직 안 돌았을 수 있으니 지금 확실히 저장하고 나간다
      await logDraftRepo.save(form).catch(() => {})
      showToast('작성 중인 내용을 임시 저장했습니다')
      navigate(-1)
      return
    }
    // 수정·복제·루틴으로 시작은 초안을 남기지 않으므로 경고가 맞다
    setConfirmClose(true)
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
            <RoutineEditor
              value={form.exercises}
              onChange={(exercisesList) => setForm((f) => ({ ...f, exercises: exercisesList }))}
              exercises={exercises}
              lastSetsByExercise={lastSetsByExercise}
              onCreateExercise={handleCreateExercise}
            />
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

      {/* 작성 중이던 기록 복구. 배경 클릭으로 닫히면 초안을 잃을 수 있어 dismissible=false */}
      <ConfirmDialog
        open={!!pendingDraft}
        dismissible={false}
        title="작성 중이던 기록이 있어요"
        message={
          pendingDraft
            ? `${formatDotDate(pendingDraft.form.date)} · 운동 ${pendingDraft.form.exercises.length}개`
            : undefined
        }
        confirmLabel="이어쓰기"
        cancelLabel="새로 시작"
        onConfirm={() => {
          if (pendingDraft) {
            setForm(pendingDraft.form)
            initRef.current = pendingDraft.form
          }
          setPendingDraft(null)
        }}
        onCancel={() => {
          setPendingDraft(null)
          logDraftRepo.clear()
        }}
      />
    </div>
  )
}
