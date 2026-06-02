import { describe, expect, it } from 'vitest'
import { membersRepo } from './members.ts'

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
