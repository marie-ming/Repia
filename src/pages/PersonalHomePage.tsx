import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { routineLogsRepo } from '../db/repositories/routineLogs.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import type { RoutineLog, Exercise } from '../db/types.ts'
import { Calendar } from '../components/Calendar.tsx'
import { BottomSheet } from '../components/BottomSheet.tsx'
import { ModeTitleButton } from '../components/ModeTitleButton.tsx'
import { ChevronRightIcon, PlusIcon } from '../components/icons.tsx'
import {
  addDays,
  addMonths,
  formatShortDateWithWeekday,
  parseISODate,
  startOfMonth,
  startOfWeekSunday,
  toISODate,
  todayISODate,
} from '../utils/date.ts'
import { EXERCISE_CATEGORY_LABELS, ROUTINE_LOG_STATUS_LABELS } from '../constants.ts'
import { BALANCE_DAYS, categoryBalance, topCategories } from '../utils/categoryBalance.ts'
import { CategoryBalanceSheet } from '../components/CategoryBalanceSheet.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { useLoader } from '../utils/useLoader.ts'

export function PersonalHomePage() {
  const navigate = useNavigate()
  const today = todayISODate()
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(parseISODate(today)))
  const [logs, setLogs] = useState<RoutineLog[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [sheetDate, setSheetDate] = useState('')
  const [sheetLogs, setSheetLogs] = useState<RoutineLog[] | null>(null)
  const [balanceOpen, setBalanceOpen] = useState(false)
  // 부위 집계는 오늘 기준 4주라, 달을 넘겨봐도 달라지지 않는다 → 캘린더용과 따로 읽는다
  const [recentLogs, setRecentLogs] = useState<RoutineLog[]>([])

  const load = useCallback(async () => {
    const gridStart = startOfWeekSunday(viewMonth)
    const start = toISODate(gridStart)
    const end = toISODate(addDays(gridStart, 41))
    const balanceFrom = toISODate(addDays(parseISODate(today), -(BALANCE_DAYS - 1)))
    const [list, exs, recent] = await Promise.all([
      routineLogsRepo.findByDateRange(start, end),
      exercisesRepo.findAll(),
      routineLogsRepo.findByDateRange(balanceFrom, today),
    ])
    setLogs(list)
    setExercises(exs)
    setRecentLogs(recent)
  }, [viewMonth, today])

  const { error: loadError, retry } = useLoader(load)

  const exerciseNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of exercises) m.set(e.id, e.name)
    return m
  }, [exercises])

  const balance = useMemo(() => {
    const byExercise = new Map(exercises.map((e) => [e.id, e.categories]))
    return categoryBalance(recentLogs, byExercise, today)
  }, [recentLogs, exercises, today])

  const balanceTop = useMemo(() => topCategories(balance.counts), [balance])

  const markedCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of logs) {
      if (l.status === 'cancelled') continue
      m.set(l.date, (m.get(l.date) ?? 0) + 1)
    }
    return m
  }, [logs])

  // 보고 있는 달의 기록만, 최신순
  const monthLogs = useMemo(() => {
    const mm = viewMonth.getMonth()
    const yy = viewMonth.getFullYear()
    return logs
      .filter((l) => {
        const d = parseISODate(l.date)
        return d.getMonth() === mm && d.getFullYear() === yy
      })
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  }, [logs, viewMonth])

  function handleSelectDate(date: string) {
    const found = logs
      .filter((l) => l.date === date)
      .sort((a, b) => a.time.localeCompare(b.time))
    if (found.length === 0) navigate(`/logs/new?date=${date}`)
    else if (found.length === 1) navigate(`/logs/${found[0].id}`)
    else {
      setSheetDate(date)
      setSheetLogs(found)
    }
  }

  function shiftMonth(delta: number) {
    setViewMonth((m) => startOfMonth(addMonths(m, delta)))
  }

  function goToday() {
    setViewMonth(startOfMonth(parseISODate(today)))
  }

  return (
    <div className="home-page">
      <div className="home-page__top">
        <ModeTitleButton title="홈" />
        <Calendar
          viewMonth={viewMonth}
          selectedDate=""
          markedCounts={markedCounts}
          onSelect={handleSelectDate}
          onShiftMonth={shiftMonth}
          onToday={goToday}
        />
      </div>

      {/* 기록이 아예 없으면 보여줄 게 없다 — 빈 앱에 잔소리하지 않는다 */}
      {balance.total > 0 && (
        <button type="button" className="balance-bar" onClick={() => setBalanceOpen(true)}>
          <span className="balance-bar__text">
            최근 {BALANCE_DAYS / 7}주 <strong>{balance.total}회</strong>
            {balanceTop.length > 0 &&
              ` · ${balanceTop
                .map((c) => `${EXERCISE_CATEGORY_LABELS[c.category]} ${c.count}`)
                .join(' ')}`}
          </span>
          <ChevronRightIcon className="balance-bar__chevron" />
        </button>
      )}

      <div className="day-sessions">
        {/* 못 읽은 걸 「기록이 없습니다」로 보여주면 없는 것과 구분이 안 된다 */}
        {loadError ? (
          <LoadError onRetry={retry} />
        ) : monthLogs.length === 0 ? (
          <p className="day-sessions__empty">이번 달 기록이 없습니다.</p>
        ) : (
          <ul className="log-list">
            {monthLogs.map((l) => {
              const exNames = l.exercises
                .map((r) => exerciseNameById.get(r.exerciseId) ?? '(삭제됨)')
                .join(', ')
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    className={
                      l.status === 'cancelled' ? 'log-card log-card--cancelled' : 'log-card'
                    }
                    onClick={() => navigate(`/logs/${l.id}`)}
                  >
                    <span className="log-card__main">
                      <span className="log-card__title">{l.title || '운동 기록'}</span>
                      {exNames && <span className="log-card__exercises">{exNames}</span>}
                    </span>
                    <span className="log-card__meta">
                      <span className={`session-badge session-badge--${l.status}`}>
                        {ROUTINE_LOG_STATUS_LABELS[l.status]}
                      </span>
                      <span className="log-card__when">
                        {formatShortDateWithWeekday(l.date)}
                        {l.time && ` · ${l.time}`}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        className="fab"
        onClick={() => navigate(`/logs/new?date=${today}`)}
        aria-label="운동 추가"
      >
        <PlusIcon />
      </button>

      <BottomSheet
        open={!!sheetLogs}
        onClose={() => setSheetLogs(null)}
        title={sheetDate ? formatShortDateWithWeekday(sheetDate) : ''}
      >
        <ul className="session-list">
          {sheetLogs?.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                className={
                  l.status === 'cancelled'
                    ? 'session-item session-item--cancelled'
                    : 'session-item'
                }
                onClick={() => {
                  setSheetLogs(null)
                  navigate(`/logs/${l.id}`)
                }}
              >
                <span className="session-item__time">{l.time || '–'}</span>
                <span className="session-item__member">{l.title || '운동'}</span>
                <span className={`session-badge session-badge--${l.status}`}>
                  {ROUTINE_LOG_STATUS_LABELS[l.status]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>

      <CategoryBalanceSheet
        open={balanceOpen}
        onClose={() => setBalanceOpen(false)}
        balance={balance}
      />
    </div>
  )
}
