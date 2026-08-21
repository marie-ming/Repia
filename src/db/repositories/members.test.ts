import { describe, expect, it } from 'vitest'
import { membersRepo } from './members.ts'
import { sessionsRepo } from './sessions.ts'

describe('membersRepo (fake-indexeddb)', () => {
  it('create: 기본값을 채워 저장', async () => {
    const m = await membersRepo.create({ name: '홍길동' })
    expect(m.id).toMatch(/^mem_/)
    expect(m.name).toBe('홍길동')
    expect(m.phone).toBe('')
    expect(m.status).toBe('active')
    expect(m.memo).toBe('')
    expect(m.registeredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(m.createdAt).toBe(m.updatedAt)
  })

  it('create: 입력값이 기본값을 override', async () => {
    const m = await membersRepo.create({
      name: '신짱구',
      phone: '010-1111-2222',
      status: 'ended',
      memo: '테스트',
      registeredAt: '2025-01-01',
    })
    expect(m.phone).toBe('010-1111-2222')
    expect(m.status).toBe('ended')
    expect(m.memo).toBe('테스트')
    expect(m.registeredAt).toBe('2025-01-01')
  })

  it('findById: 저장된 회원 조회', async () => {
    const created = await membersRepo.create({ name: '김철수' })
    const found = await membersRepo.findById(created.id)
    expect(found).toEqual(created)
  })

  it('findById: 없는 id면 undefined', async () => {
    expect(await membersRepo.findById('mem_none')).toBeUndefined()
  })

  it('findAll: 이름순 정렬 기본', async () => {
    await membersRepo.create({ name: '나' })
    await membersRepo.create({ name: '가' })
    await membersRepo.create({ name: '다' })
    const list = await membersRepo.findAll()
    expect(list.map((m) => m.name)).toEqual(['가', '나', '다'])
  })

  it('findAll: createdAt 정렬도 가능', async () => {
    const a = await membersRepo.create({ name: 'a' })
    await new Promise((r) => setTimeout(r, 5))
    const b = await membersRepo.create({ name: 'b' })
    const list = await membersRepo.findAll({ sortBy: 'createdAt' })
    expect(list[0].id).toBe(a.id)
    expect(list[1].id).toBe(b.id)
  })

  it('update: 부분 업데이트 + updatedAt 갱신', async () => {
    const m = await membersRepo.create({ name: '원본' })
    await new Promise((r) => setTimeout(r, 5))
    const upd = await membersRepo.update(m.id, { memo: '변경됨' })
    expect(upd.id).toBe(m.id)
    expect(upd.name).toBe('원본')
    expect(upd.memo).toBe('변경됨')
    expect(upd.updatedAt).not.toBe(m.updatedAt)
    expect(upd.createdAt).toBe(m.createdAt)
  })

  it('update: 없는 id면 에러', async () => {
    await expect(membersRepo.update('mem_none', { name: 'x' })).rejects.toThrow(/not found/)
  })

  it('delete: 삭제 후 findById는 undefined', async () => {
    const m = await membersRepo.create({ name: '삭제대상' })
    await membersRepo.delete(m.id)
    expect(await membersRepo.findById(m.id)).toBeUndefined()
  })

  it('테스트 격리: beforeEach로 DB가 깨끗하게 시작됨', async () => {
    const list = await membersRepo.findAll()
    expect(list).toEqual([])
  })
})

// 수업은 회원 이름을 스냅샷으로 갖는다(회원을 지워도 기록이 남게 하려고).
// 그래서 이름을 고쳐도 과거 수업엔 옛 이름이 남아, 오타를 고치면 과거가 계속 틀렸다.
describe('회원 이름을 바꾸면 과거 수업 이름도 따라온다', () => {
  async function seed(name: string) {
    const m = await membersRepo.create({ name, phone: '010-1111-2222' })
    const s1 = await sessionsRepo.create({
      memberId: m.id,
      memberNameSnapshot: name,
      date: '2026-06-01',
    })
    const s2 = await sessionsRepo.create({
      memberId: m.id,
      memberNameSnapshot: name,
      date: '2026-06-08',
    })
    return { m, s1, s2 }
  }

  it('그 회원의 수업 전부에 새 이름이 반영된다', async () => {
    const { m, s1, s2 } = await seed('홍길똥')

    await membersRepo.update(m.id, { name: '홍길동' })

    expect((await sessionsRepo.findById(s1.id))?.memberNameSnapshot).toBe('홍길동')
    expect((await sessionsRepo.findById(s2.id))?.memberNameSnapshot).toBe('홍길동')
  })

  it('다른 회원의 수업은 건드리지 않는다', async () => {
    const a = await seed('가나다')
    const b = await seed('라마바')

    await membersRepo.update(a.m.id, { name: '가나다라' })

    expect((await sessionsRepo.findById(b.s1.id))?.memberNameSnapshot).toBe('라마바')
  })

  it('이름이 안 바뀌면 수업은 그대로 둔다', async () => {
    const { m, s1 } = await seed('홍길동')
    // 스냅샷이 일부러 다른 경우(과거에 다른 이름으로 기록됨)를 덮어쓰지 않는다
    await sessionsRepo.update(s1.id, { memberNameSnapshot: '옛이름' })

    await membersRepo.update(m.id, { phone: '010-9999-8888' })

    expect((await sessionsRepo.findById(s1.id))?.memberNameSnapshot).toBe('옛이름')
  })

  it('회원 자신의 이름도 바뀐다', async () => {
    const { m } = await seed('홍길똥')
    await membersRepo.update(m.id, { name: '홍길동' })
    expect((await membersRepo.findById(m.id))?.name).toBe('홍길동')
  })

  // 삭제는 여전히 스냅샷을 남겨 기록을 보존한다
  it('회원을 지워도 수업의 이름은 남는다', async () => {
    const { m, s1 } = await seed('홍길동')
    await membersRepo.delete(m.id)

    expect(await membersRepo.findById(m.id)).toBeUndefined()
    expect((await sessionsRepo.findById(s1.id))?.memberNameSnapshot).toBe('홍길동')
  })
})

