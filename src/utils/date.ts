// Today's date as a local YYYY-MM-DD string (not UTC).
export function todayISODate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 현재 시각을 "HH:MM" (로컬)로 반환
export function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// "2026-05-24" -> "2026.05.24"
export function formatDotDate(date: string | null): string {
  if (!date) return ''
  return date.replaceAll('-', '.')
}

// "2026-06-04" -> "26.06.04 수"
export function formatShortDateWithWeekday(date: string): string {
  const d = parseISODate(date)
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd} ${WEEKDAY_LABELS[d.getDay()]}`
}

// Date -> local YYYY-MM-DD
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// "YYYY-MM-DD" -> local Date (avoids UTC parsing pitfalls)
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// Sunday that starts the week containing the given date
export function startOfWeekSunday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

// First day of the month containing the given date
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

// Add months (preserves day where possible)
export function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const
