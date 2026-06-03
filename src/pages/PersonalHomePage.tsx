import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { routineLogsRepo } from '../db/repositories/routineLogs.ts'
import { exercisesRepo } from '../db/repositories/exercises.ts'
import type { RoutineLog, Exercise } from '../db/types.ts'
import { Calendar } from '../components/Calendar.tsx'
import { BottomSheet } from '../components/BottomSheet.tsx'
import { ModeTitleButton } from '../components/ModeTitleButton.tsx'
import { PlusIcon } from '../components/icons.tsx'
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
import { ROUTINE_LOG_STATUS_LABELS } from '../constants.ts'

export function PersonalHomePage() {
  const navigate = useNavigate()
  const today = todayISODate()
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(parseISODate(today)))
  const [logs, setLogs] = useState<RoutineLog[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [sheetDate, setSheetDate] = useState('')
  const [sheetLogs, setSheetLogs] = useState<RoutineLog[] | null>(null)

  const load = useCallback(async () => {
    const gridStart = startOfWeekSunday(viewMonth)
    const start = toISODate(gridStart)
    const end = toISODate(addDays(gridStart, 41))
    const [list, exs] = await Promise.all([
      routineLogsRepo.findByDateRange(start, end),
      exercisesRepo.findAll(),
    ])
    setLogs(list)
    setExercises(exs)
  }, [viewMonth])

  useEffect(() => {
    load()
  }, [load])

  const exerciseNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of exercises) m.set(e.id, e.name)
    return m
  }, [exercises])

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

      <div className="day-sessions">
        {monthLogs.length === 0 ? (
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
    </div>
  )
}
