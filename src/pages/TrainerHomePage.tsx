import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionsRepo } from '../db/repositories/sessions.ts'
import { membersRepo } from '../db/repositories/members.ts'
import type { Session } from '../db/types.ts'
import { Calendar } from '../components/Calendar.tsx'
import { ModeTitleButton } from '../components/ModeTitleButton.tsx'
import { useToast } from '../components/Toast.tsx'
import { PlusIcon } from '../components/icons.tsx'
import {
  addDays,
  parseISODate,
  startOfWeekSunday,
  toISODate,
  todayISODate,
} from '../utils/date.ts'
import { SESSION_STATUS_LABELS } from '../constants.ts'

export function TrainerHomePage() {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<string>(() => todayISODate())
  const anchorSunday = useMemo(
    () => startOfWeekSunday(parseISODate(selectedDate)),
    [selectedDate],
  )
  const [sessions, setSessions] = useState<Session[]>([])
  const showToast = useToast()

  const load = useCallback(async () => {
    const start = toISODate(anchorSunday)
    const end = toISODate(addDays(anchorSunday, 13))
    const list = await sessionsRepo.findByDateRange(start, end)
    setSessions(list)
  }, [anchorSunday])

  useEffect(() => {
    load()
  }, [load])

  const markedDates = useMemo(
    () => new Set(sessions.filter((s) => s.status !== 'cancelled').map((s) => s.date)),
    [sessions],
  )

  const daySessions = useMemo(
    () =>
      sessions
        .filter((s) => s.date === selectedDate)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [sessions, selectedDate],
  )

  function shift(deltaDays: number) {
    setSelectedDate(toISODate(addDays(parseISODate(selectedDate), deltaDays)))
  }

  function goToday() {
    setSelectedDate(toISODate(new Date()))
  }

  async function handleAddClick() {
    const ms = await membersRepo.findAll({ sortBy: 'name' })
    if (ms.length === 0) {
      showToast('회원을 먼저 추가해주세요')
      return
    }
    navigate(`/sessions/new?date=${selectedDate}`)
  }

  return (
    <div className="home-page">
      <div className="home-page__top">
        <ModeTitleButton title="홈" />
        <Calendar
          anchorSunday={anchorSunday}
          selectedDate={selectedDate}
          markedDates={markedDates}
          onSelect={setSelectedDate}
          onShift={shift}
          onToday={goToday}
        />
      </div>

      <div className="day-sessions">
        {daySessions.length === 0 ? (
          <p className="day-sessions__empty">예정된 수업이 없습니다.</p>
        ) : (
          <ul className="session-list">
            {daySessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={
                    s.status === 'cancelled'
                      ? 'session-item session-item--cancelled'
                      : 'session-item'
                  }
                  onClick={() => navigate(`/sessions/${s.id}`)}
                >
                  <span className="session-item__time">{s.time || '–'}</span>
                  <span className="session-item__member">{s.memberNameSnapshot}</span>
                  <span className={`session-badge session-badge--${s.status}`}>
                    {SESSION_STATUS_LABELS[s.status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" className="fab" onClick={handleAddClick} aria-label="수업 추가">
        <PlusIcon />
      </button>
    </div>
  )
}
