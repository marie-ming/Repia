import { addDays, parseISODate, toISODate, todayISODate, WEEKDAY_LABELS } from '../utils/date.ts'
import { ChevronLeftIcon, ChevronRightIcon } from './icons.tsx'

interface CalendarProps {
  anchorSunday: Date // first day (Sunday) of the 2-week window
  selectedDate: string // YYYY-MM-DD
  markedDates: Set<string> // dates that have sessions
  onSelect: (date: string) => void
  onShift: (deltaDays: number) => void
  onToday: () => void
}

export function Calendar({
  anchorSunday,
  selectedDate,
  markedDates,
  onSelect,
  onShift,
  onToday,
}: CalendarProps) {
  const today = todayISODate()
  const days = Array.from({ length: 14 }, (_, i) => addDays(anchorSunday, i))
  // 라벨은 선택일이 속한 월을 따라가도록 (anchor가 5월 마지막 일요일이고 selectedDate가 6월일 때 6월로 표기)
  const labelDate = parseISODate(selectedDate)
  const monthLabel = `${labelDate.getFullYear()}년 ${labelDate.getMonth() + 1}월`

  return (
    <div className="calendar">
      <div className="calendar__bar">
        <button type="button" className="calendar__nav" onClick={() => onShift(-14)} aria-label="이전 2주">
          <ChevronLeftIcon />
        </button>
        <button type="button" className="calendar__month" onClick={onToday}>
          {monthLabel}
        </button>
        <button type="button" className="calendar__nav" onClick={() => onShift(14)} aria-label="다음 2주">
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
          const classes = ['calendar__cell']
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
