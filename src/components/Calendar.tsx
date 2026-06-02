import { addDays, startOfWeekSunday, toISODate, todayISODate, WEEKDAY_LABELS } from '../utils/date.ts'
import { ChevronLeftIcon, ChevronRightIcon } from './icons.tsx'

interface CalendarProps {
  viewMonth: Date // first day of the month being displayed
  selectedDate: string // YYYY-MM-DD
  markedDates: Set<string> // dates that have sessions
  onSelect: (date: string) => void
  onShiftMonth: (delta: number) => void
  onToday: () => void
}

const MAX_CELLS = 42 // 6 weeks × 7 days

export function Calendar({
  viewMonth,
  selectedDate,
  markedDates,
  onSelect,
  onShiftMonth,
  onToday,
}: CalendarProps) {
  const today = todayISODate()
  const gridStart = startOfWeekSunday(viewMonth)
  // 최대 6주를 만든 뒤, 마지막 주에 현재 월 날짜가 하나도 없으면 그 주를 잘라낸다
  const all = Array.from({ length: MAX_CELLS }, (_, i) => addDays(gridStart, i))
  let days = all
  while (days.length > 28) {
    const lastWeek = days.slice(-7)
    if (lastWeek.every((d) => d.getMonth() !== viewMonth.getMonth())) {
      days = days.slice(0, -7)
    } else break
  }
  const monthLabel = `${viewMonth.getFullYear()}년 ${viewMonth.getMonth() + 1}월`

  return (
    <div className="calendar">
      <div className="calendar__bar">
        <button type="button" className="calendar__nav" onClick={() => onShiftMonth(-1)} aria-label="이전 달">
          <ChevronLeftIcon />
        </button>
        <button type="button" className="calendar__month" onClick={onToday}>
          {monthLabel}
        </button>
        <button type="button" className="calendar__nav" onClick={() => onShiftMonth(1)} aria-label="다음 달">
          <ChevronRightIcon />
        </button>
      </div>

      <div className="calendar__weekdays">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="calendar__weekday">
            {w}
          </span>
        ))}
      </div>

      <div className="calendar__grid">
        {days.map((d) => {
          const iso = toISODate(d)
          const inMonth = d.getMonth() === viewMonth.getMonth()
          const classes = ['calendar__cell']
          if (!inMonth) classes.push('calendar__cell--other')
          if (iso === selectedDate) classes.push('calendar__cell--selected')
          if (iso === today) classes.push('calendar__cell--today')
          return (
            <button
              type="button"
              key={iso}
              className={classes.join(' ')}
              onClick={() => onSelect(iso)}
            >
              <span className="calendar__date">{d.getDate()}</span>
              {markedDates.has(iso) && <span className="calendar__dot" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
