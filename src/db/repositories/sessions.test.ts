import { describe, expect, it } from 'vitest'
import { sessionsRepo } from './sessions.ts'

async function seed() {
  const a = await sessionsRepo.create({
    memberId: 'm1',
    memberNameSnapshot: '회원1',
    date: '2026-06-10',
    time: '10:00',
    status: 'reserved',
  })
  const b = await sessionsRepo.create({
    memberId: 'm1',
    memberNameSnapshot: '회원1',
    date: '2026-06-15',
    time: '11:00',
    status: 'completed',
  })
  const c = await sessionsRepo.create({
    memberId: 'm2',
    memberNameSnapshot: '회원2',
    date: '2026-06-20',
    time: '14:00',
    status: 'completed',
  })
  const d = await sessionsRepo.create({
    memberId: 'm1',
    memberNameSnapshot: '회원1',
    date: '2026-05-20',
    status: 'cancelled',
  })
  return { a, b, c, d }
}

describe('sessionsRepo (fake-indexeddb)', () => {
  it('create: 기본값 채워 저장', async () => {
    const s = await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: '홍길동',
      date: '2026-06-01',
    })
    expect(s.id).toMatch(/^ses_/)
    expect(s.status).toBe('reserved')
    expect(s.routine).toEqual([])
    expect(s.time).toBe('')
    expect(s.memo).toBe('')
  })

  it('findByDate: 해당 날짜의 수업만', async () => {
    await seed()
    const list = await sessionsRepo.findByDate('2026-06-10')
    expect(list).toHaveLength(1)
    expect(list[0].date).toBe('2026-06-10')
  })

  it('findByDateRange: 범위 inclusive', async () => {
    await seed()
    const list = await sessionsRepo.findByDateRange('2026-06-01', '2026-06-30')
    expect(list.map((s) => s.date).sort()).toEqual([
      '2026-06-10',
      '2026-06-15',
      '2026-06-20',
    ])
  })

  it('findByMember: 특정 회원의 수업만', async () => {
    await seed()
    const list = await sessionsRepo.findByMember('m1')
    expect(list).toHaveLength(3)
    expect(list.every((s) => s.memberId === 'm1')).toBe(true)
  })

  it('findByStatus: 상태별 조회', async () => {
    await seed()
    const completed = await sessionsRepo.findByStatus('completed')
    expect(completed).toHaveLength(2)
  })

  it('countCompletedByMember', async () => {
    await seed()
    expect(await sessionsRepo.countCompletedByMember('m1')).toBe(1)
    expect(await sessionsRepo.countCompletedByMember('m2')).toBe(1)
    expect(await sessionsRepo.countCompletedByMember('mNone')).toBe(0)
  })

  it('lastDateByMember: 회원의 가장 최근 수업 날짜', async () => {
    await seed()
    expect(await sessionsRepo.lastDateByMember('m1')).toBe('2026-06-15')
    expect(await sessionsRepo.lastDateByMember('mNone')).toBeNull()
  })

  it('update: 변경 + updatedAt 갱신', async () => {
    const s = await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: 'x',
      date: '2026-06-01',
    })
    await new Promise((r) => setTimeout(r, 5))
    const upd = await sessionsRepo.update(s.id, { status: 'completed', memo: '잘함' })
    expect(upd.status).toBe('completed')
    expect(upd.memo).toBe('잘함')
    expect(upd.updatedAt).not.toBe(s.updatedAt)
  })

  it('update: 없는 id면 에러', async () => {
    await expect(sessionsRepo.update('ses_none', {})).rejects.toThrow(/not found/)
  })

  it('delete: 삭제 후 조회 불가', async () => {
    const s = await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: 'x',
      date: '2026-06-01',
    })
    await sessionsRepo.delete(s.id)
    expect(await sessionsRepo.findById(s.id)).toBeUndefined()
  })
})
