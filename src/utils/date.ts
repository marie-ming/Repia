// Today's date as a local YYYY-MM-DD string (not UTC).
export function todayISODate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// "2026-05-24" -> "2026.05.24"
export function formatDotDate(date: string | null): string {
  if (!date) return ''
  return date.replaceAll('-', '.')
}
