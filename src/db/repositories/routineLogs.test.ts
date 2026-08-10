import { describe, expect, it } from 'vitest'
import { routineLogsRepo } from './routineLogs.ts'

async function seed() {
  const a = await routineLogsRepo.create({
    title: '5월 기록',
    date: '2026-05-20',
    time: '09:00',
    status: 'completed',
    templateId: 'rtt_1',
  })
  const b = await routineLogsRepo.create({
    title: '6월 초',
    date: '2026-06-10',
    time: '10:00',
    status: 'completed',
    templateId: 'rtt_1',
  })
  const c = await routineLogsRepo.create({
    title: '6월 말',
    date: '2026-06-25',
    time: '20:00',
    status: 'planned',
    templateId: 'rtt_2',
  })
  return { a, b, c }
}

const titles = (list: { title: string }[]) => list.map((l) => l.title).sort()

describe('routineLogsRepo (fake-indexeddb)', () => {
  it('create: 기본값 채우고 rtl_ 접두 id 부여', async () => {
    const l = await routineLogsRepo.create({ date: '2026-06-01' })
    expect(l.id).toMatch(/^rtl_/)
    expect(l.title).toBe('')
    expect(l.time).toBe('')
    expect(l.status).toBe('planned')
    expect(l.templateId).toBeNull()
    expect(l.exercises).toEqual([])
    expect(l.memo).toBe('')
    expect(l.createdAt).toBe(l.updatedAt)
  })

  it('findById / findAll', async () => {
    const { b } = await seed()
    expect((await routineLogsRepo.findById(b.id))?.title).toBe('6월 초')
    expect(await routineLogsRepo.findById('rtl_none')).toBeUndefined()
    expect(await routineLogsRepo.findAll()).toHaveLength(3)
  })

  it('findByDate: 해당 날짜만', async () => {
    await seed()
    expect(titles(await routineLogsRepo.findByDate('2026-06-10'))).toEqual(['6월 초'])
    expect(await routineLogsRepo.findByDate('2026-06-11')).toEqual([])
  })

  it('findByDateRange: 시작·끝 포함', async () => {
    await seed()
    expect(titles(await routineLogsRepo.findByDateRange('2026-06-01', '2026-06-30'))).toEqual([
      '6월 말',
      '6월 초',
    ])
    // 경계값이 포함되는지
    expect(titles(await routineLogsRepo.findByDateRange('2026-05-20', '2026-06-10'))).toEqual([
      '5월 기록',
      '6월 초',
    ])
  })

  it('findByTemplate: 템플릿별로 분리', async () => {
    await seed()
    expect(titles(await routineLogsRepo.findByTemplate('rtt_1'))).toEqual(['5월 기록', '6월 초'])
    expect(titles(await routineLogsRepo.findByTemplate('rtt_2'))).toEqual(['6월 말'])
    expect(await routineLogsRepo.findByTemplate('rtt_none')).toEqual([])
  })

  it('lastDateByTemplate: 가장 최근 날짜 (복합 인덱스 역순 커서)', async () => {
    await seed()
    expect(await routineLogsRepo.lastDateByTemplate('rtt_1')).toBe('2026-06-10')
    expect(await routineLogsRepo.lastDateByTemplate('rtt_2')).toBe('2026-06-25')
  })

  it('lastDateByTemplate: 기록이 없으면 null', async () => {
    await seed()
    expect(await routineLogsRepo.lastDateByTemplate('rtt_none')).toBeNull()
  })

  it('update: 변경분만 반영하고 id 유지', async () => {
    const { a } = await seed()
    const updated = await routineLogsRepo.update(a.id, { status: 'cancelled', memo: '취소' })
    expect(updated.id).toBe(a.id)
    expect(updated.status).toBe('cancelled')
    expect(updated.memo).toBe('취소')
    expect(updated.title).toBe('5월 기록') // 건드리지 않은 값은 그대로
    expect(updated.createdAt).toBe(a.createdAt)
  })

  it('update: 없는 id면 에러', async () => {
    await expect(routineLogsRepo.update('rtl_none', { memo: 'x' })).rejects.toThrow(/not found/)
  })

  it('delete', async () => {
    const { a } = await seed()
    await routineLogsRepo.delete(a.id)
    expect(await routineLogsRepo.findById(a.id)).toBeUndefined()
    expect(await routineLogsRepo.findAll()).toHaveLength(2)
  })

  it('슈퍼세트 묶음(groupId)이 저장·조회에서 보존된다', async () => {
    const l = await routineLogsRepo.create({
      date: '2026-06-01',
      exercises: [
        { exerciseId: 'ex_a', sets: [{ weight: 60, reps: 10 }] },
        { exerciseId: 'ex_b', sets: [{ weight: 20, reps: 12 }], groupId: 'grp_1' },
        { exerciseId: 'ex_c', sets: [{ weight: 15, reps: 15 }], groupId: 'grp_1' },
      ],
    })
    const found = await routineLogsRepo.findById(l.id)
    expect(found?.exercises.map((e) => e.groupId)).toEqual([undefined, 'grp_1', 'grp_1'])
  })
})
