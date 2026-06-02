import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addDays,
  addMonths,
  formatDotDate,
  parseISODate,
  startOfMonth,
  startOfWeekSunday,
  toISODate,
  todayISODate,
  WEEKDAY_LABELS,
} from './date.ts'

describe('todayISODate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('현재 로컬 날짜를 YYYY-MM-DD로 반환', () => {
    vi.setSystemTime(new Date(2026, 5, 2, 15, 30)) // 2026-06-02 15:30 local
    expect(todayISODate()).toBe('2026-06-02')
  })

  it('한 자리 월/일도 0 패딩', () => {
    vi.setSystemTime(new Date(2026, 0, 5))
    expect(todayISODate()).toBe('2026-01-05')
  })
})

describe('formatDotDate', () => {
  it('하이픈을 점으로 치환', () => {
    expect(formatDotDate('2026-06-02')).toBe('2026.06.02')
  })
  it('null/빈 값은 빈 문자열', () => {
    expect(formatDotDate(null)).toBe('')
    expect(formatDotDate('')).toBe('')
  })
})

describe('toISODate / parseISODate', () => {
  it('toISODate: Date → YYYY-MM-DD (로컬)', () => {
    expect(toISODate(new Date(2026, 5, 2))).toBe('2026-06-02')
    expect(toISODate(new Date(2026, 0, 1))).toBe('2026-01-01')
  })

  it('parseISODate: YYYY-MM-DD → 로컬 자정 Date', () => {
    const d = parseISODate('2026-06-02')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(5)
    expect(d.getDate()).toBe(2)
  })

  it('parseISODate ↔ toISODate 왕복 일치', () => {
    const iso = '2026-12-31'
    expect(toISODate(parseISODate(iso))).toBe(iso)
  })
})

describe('addDays', () => {
  it('양수 — 다음 날', () => {
    expect(toISODate(addDays(new Date(2026, 5, 2), 1))).toBe('2026-06-03')
  })

  it('월말을 넘어 다음 달로', () => {
    expect(toISODate(addDays(new Date(2026, 5, 30), 1))).toBe('2026-07-01')
  })

  it('음수 — 이전 날', () => {
    expect(toISODate(addDays(new Date(2026, 5, 2), -1))).toBe('2026-06-01')
  })

  it('월초에서 음수: 이전 달로', () => {
    expect(toISODate(addDays(new Date(2026, 5, 1), -1))).toBe('2026-05-31')
  })

  it('원본 Date를 변형하지 않음 (불변성)', () => {
    const d = new Date(2026, 5, 2)
    const snap = d.getTime()
    addDays(d, 5)
    expect(d.getTime()).toBe(snap)
  })
})

describe('startOfWeekSunday', () => {
  it('일요일 기준: 해당 주의 일요일을 반환', () => {
    // 2026-06-02는 화요일
    const sun = startOfWeekSunday(new Date(2026, 5, 2))
    expect(toISODate(sun)).toBe('2026-05-31') // 그 전 일요일
    expect(sun.getDay()).toBe(0)
  })

  it('일요일을 넣으면 그날 그대로', () => {
    const d = new Date(2026, 4, 31) // 일요일
    expect(toISODate(startOfWeekSunday(d))).toBe('2026-05-31')
  })

  it('시간은 자정으로 초기화', () => {
    const d = startOfWeekSunday(new Date(2026, 5, 2, 15, 30, 45))
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
  })
})

describe('startOfMonth', () => {
  it('해당 월의 1일을 반환', () => {
    expect(toISODate(startOfMonth(new Date(2026, 5, 15)))).toBe('2026-06-01')
    expect(toISODate(startOfMonth(new Date(2026, 0, 31)))).toBe('2026-01-01')
  })
})

describe('addMonths', () => {
  it('양수 — 다음 달', () => {
    expect(toISODate(addMonths(new Date(2026, 5, 15), 1))).toBe('2026-07-15')
  })

  it('음수 — 이전 달', () => {
    expect(toISODate(addMonths(new Date(2026, 5, 15), -1))).toBe('2026-05-15')
  })

  it('연도 경계: 12월 + 1 → 다음 해 1월', () => {
    expect(toISODate(addMonths(new Date(2026, 11, 15), 1))).toBe('2027-01-15')
  })

  it('연도 경계: 1월 - 1 → 전년 12월', () => {
    expect(toISODate(addMonths(new Date(2026, 0, 15), -1))).toBe('2025-12-15')
  })

  it('1월 31일 + 1 → 2월 마지막 일이 아닌 3월 3일 (JS Date 표준 동작)', () => {
    // Date.setMonth는 day overflow 시 다음 달로 넘김
    expect(toISODate(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-03-03')
  })
})

describe('WEEKDAY_LABELS', () => {
  it('일요일부터 토요일까지 한글 라벨', () => {
    expect(WEEKDAY_LABELS).toEqual(['일', '월', '화', '수', '목', '금', '토'])
  })
})
