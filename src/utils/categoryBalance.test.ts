import { describe, expect, it } from 'vitest'
import type { ExerciseCategory } from '../db/types.ts'
import { BALANCE_DAYS, categoryBalance, topCategories } from './categoryBalance.ts'

const TODAY = '2026-08-20'

const log = (date: string, exerciseIds: string[], status = 'completed') => ({
  date,
  status,
  exercises: exerciseIds.map((exerciseId) => ({ exerciseId })),
})

const cats = (entries: [string, ExerciseCategory[]][]) => new Map(entries)

const BASIC = cats([
  ['back1', ['back']],
  ['chest1', ['chest']],
  ['big', ['back', 'lower', 'core']], // 복합 운동
])

describe('categoryBalance', () => {
  it('기록이 없으면 전부 0', () => {
    const r = categoryBalance([], BASIC, TODAY)
    expect(r.total).toBe(0)
    expect(r.counts.every((c) => c.count === 0)).toBe(true)
  })

  it('부위별로 기록 수를 센다', () => {
    const r = categoryBalance(
      [log(TODAY, ['back1']), log('2026-08-19', ['back1']), log('2026-08-18', ['chest1'])],
      BASIC,
      TODAY,
    )
    expect(r.total).toBe(3)
    expect(r.counts.find((c) => c.category === 'back')?.count).toBe(2)
    expect(r.counts.find((c) => c.category === 'chest')?.count).toBe(1)
  })

  // 운동 하나에 부위가 3개까지 붙는다 — 복합 운동이면 여러 부위가 올라가는 게 맞다
  it('복합 운동은 붙은 부위 전부에 올라간다', () => {
    const r = categoryBalance([log(TODAY, ['big'])], BASIC, TODAY)
    expect(r.total).toBe(1)
    expect(r.counts.find((c) => c.category === 'back')?.count).toBe(1)
    expect(r.counts.find((c) => c.category === 'lower')?.count).toBe(1)
    expect(r.counts.find((c) => c.category === 'core')?.count).toBe(1)
  })

  // 세는 단위는 "기록 수"다. 한 기록에서 등 운동을 3개 해도 등은 1회.
  it('한 기록 안에서 같은 부위가 겹쳐도 1회', () => {
    const r = categoryBalance([log(TODAY, ['back1', 'big'])], BASIC, TODAY)
    expect(r.counts.find((c) => c.category === 'back')?.count).toBe(1)
    expect(r.total).toBe(1)
  })

  it('완료가 아닌 기록은 세지 않는다 (안 한 운동을 했다고 셀 수 없다)', () => {
    const r = categoryBalance(
      [log(TODAY, ['back1'], 'planned'), log(TODAY, ['chest1'], 'cancelled')],
      BASIC,
      TODAY,
    )
    expect(r.total).toBe(0)
  })

  it('기간 밖의 기록은 세지 않는다', () => {
    const inRange = '2026-07-24' // 오늘 - 27일 (28일 창의 첫날)
    const outOfRange = '2026-07-23' // 하루 더 과거
    expect(categoryBalance([log(inRange, ['back1'])], BASIC, TODAY).total).toBe(1)
    expect(categoryBalance([log(outOfRange, ['back1'])], BASIC, TODAY).total).toBe(0)
  })

  it('미래 날짜도 세지 않는다', () => {
    expect(categoryBalance([log('2026-08-21', ['back1'])], BASIC, TODAY).total).toBe(0)
  })

  it('기간 길이를 바꿀 수 있다', () => {
    // 7일 창은 오늘을 포함해 08-14~08-20 → 08-13은 빠진다
    const logs = [log(TODAY, ['back1']), log('2026-08-13', ['chest1'])]
    expect(categoryBalance(logs, BASIC, TODAY, 7).total).toBe(1)
    expect(categoryBalance(logs, BASIC, TODAY, BALANCE_DAYS).total).toBe(2)
  })

  it('창의 경계는 오늘을 포함한 N일 (28일이면 27일 전까지)', () => {
    expect(categoryBalance([log('2026-08-14', ['back1'])], BASIC, TODAY, 7).total).toBe(1)
    expect(categoryBalance([log('2026-08-13', ['back1'])], BASIC, TODAY, 7).total).toBe(0)
  })

  it('많은 순으로 정렬하고 0인 부위도 함께 돌려준다', () => {
    const r = categoryBalance(
      [log(TODAY, ['chest1']), log('2026-08-19', ['chest1']), log('2026-08-18', ['back1'])],
      BASIC,
      TODAY,
    )
    expect(r.counts[0]).toEqual({ category: 'chest', count: 2 })
    expect(r.counts[1]).toEqual({ category: 'back', count: 1 })
    // 빠뜨린 부위를 보려는 기능이라 0도 목록에 남는다
    expect(r.counts.some((c) => c.category === 'shoulder' && c.count === 0)).toBe(true)
  })

  it('카테고리가 없는 운동은 어디에도 안 올라가지만 기록 수에는 든다', () => {
    const r = categoryBalance([log(TODAY, ['unknown'])], BASIC, TODAY)
    expect(r.total).toBe(1)
    expect(r.counts.every((c) => c.count === 0)).toBe(true)
  })
})

describe('topCategories', () => {
  it('0인 부위는 빼고 앞에서 몇 개만', () => {
    const counts = [
      { category: 'back' as const, count: 4 },
      { category: 'chest' as const, count: 3 },
      { category: 'lower' as const, count: 1 },
      { category: 'core' as const, count: 0 },
    ]
    expect(topCategories(counts, 3)).toHaveLength(3)
    expect(topCategories(counts, 3).map((c) => c.category)).toEqual(['back', 'chest', 'lower'])
  })

  it('전부 0이면 빈 배열', () => {
    expect(topCategories([{ category: 'back', count: 0 }])).toEqual([])
  })
})

// 「팔」은 예전 카테고리로, 지금은 이두/삼두/전완으로 쪼개졌지만 기존 기록에는 남아 있다.
// 선택 목록에만 의존해 집계표를 만들면 그 운동을 해도 요약에 안 나온다.
describe('레거시 카테고리', () => {
  const legacy = cats([['arm1', ['arm']]])

  it('선택 목록에 없는 카테고리도 집계에 실린다', () => {
    const r = categoryBalance([log(TODAY, ['arm1'])], legacy, TODAY)
    expect(r.total).toBe(1)
    expect(r.counts.find((c) => c.category === 'arm')?.count).toBe(1)
  })

  it('쓰이지 않았으면 목록에 끼워넣지 않는다', () => {
    const r = categoryBalance([log(TODAY, ['back1'])], BASIC, TODAY)
    expect(r.counts.some((c) => c.category === 'arm')).toBe(false)
  })

  it('많은 순 정렬에 함께 섞인다', () => {
    const mixed = cats([
      ['arm1', ['arm']],
      ['back1', ['back']],
    ])
    const r = categoryBalance(
      [log(TODAY, ['arm1']), log('2026-08-19', ['arm1']), log('2026-08-18', ['back1'])],
      mixed,
      TODAY,
    )
    expect(r.counts[0]).toEqual({ category: 'arm', count: 2 })
  })
})

describe('topCategories 기본값', () => {
  it('기본 3개까지', () => {
    const counts = [
      { category: 'back' as const, count: 5 },
      { category: 'chest' as const, count: 4 },
      { category: 'lower' as const, count: 3 },
      { category: 'core' as const, count: 2 },
    ]
    expect(topCategories(counts)).toHaveLength(3)
  })
})

