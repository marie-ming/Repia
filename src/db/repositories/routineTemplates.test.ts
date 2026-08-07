import { describe, expect, it } from 'vitest'
import { routineTemplatesRepo } from './routineTemplates.ts'
import { getDB } from '../index.ts'
import { STORES } from '../schema.ts'
import type { RoutineTemplate } from '../types.ts'

// updatedAt 정렬을 확인하려면 생성 순서만으로는 부족해(같은 ms) 값을 직접 지정한다
async function seedWithTimes() {
  const a = await routineTemplatesRepo.create({ title: '가슴 루틴' })
  const b = await routineTemplatesRepo.create({ title: '나중 루틴' })
  const c = await routineTemplatesRepo.create({ title: '다리 루틴' })
  await routineTemplatesRepo.update(a.id, { updatedAt: '2026-06-01T00:00:00.000Z' })
  await routineTemplatesRepo.update(b.id, { updatedAt: '2026-06-20T00:00:00.000Z' })
  await routineTemplatesRepo.update(c.id, { updatedAt: '2026-06-10T00:00:00.000Z' })
  return { a, b, c }
}

describe('routineTemplatesRepo (fake-indexeddb)', () => {
  it('create: 기본값 채우고 rtt_ 접두 id 부여', async () => {
    const t = await routineTemplatesRepo.create({ title: '새 루틴' })
    expect(t.id).toMatch(/^rtt_/)
    expect(t.title).toBe('새 루틴')
    expect(t.categories).toEqual([])
    expect(t.exercises).toEqual([])
    expect(t.memo).toBe('')
    expect(t.createdAt).toBe(t.updatedAt)
  })

  it('findById / 없는 id', async () => {
    const t = await routineTemplatesRepo.create({ title: '조회용' })
    expect((await routineTemplatesRepo.findById(t.id))?.title).toBe('조회용')
    expect(await routineTemplatesRepo.findById('rtt_none')).toBeUndefined()
  })

  it('findAll 기본: updatedAt 최신순', async () => {
    await seedWithTimes()
    const list = await routineTemplatesRepo.findAll()
    expect(list.map((t) => t.title)).toEqual(['나중 루틴', '다리 루틴', '가슴 루틴'])
  })

  it('findAll({ sortBy: "title" }): 제목 오름차순', async () => {
    await seedWithTimes()
    const list = await routineTemplatesRepo.findAll({ sortBy: 'title' })
    expect(list.map((t) => t.title)).toEqual(['가슴 루틴', '나중 루틴', '다리 루틴'])
  })

  it('update: 변경분만 반영하고 id·createdAt 유지', async () => {
    const t = await routineTemplatesRepo.create({ title: '원본', memo: '메모' })
    const updated = await routineTemplatesRepo.update(t.id, { title: '수정됨' })
    expect(updated.id).toBe(t.id)
    expect(updated.title).toBe('수정됨')
    expect(updated.memo).toBe('메모')
    expect(updated.createdAt).toBe(t.createdAt)
  })

  it('update: 없는 id면 에러', async () => {
    await expect(routineTemplatesRepo.update('rtt_none', { title: 'x' })).rejects.toThrow(
      /not found/,
    )
  })

  it('delete', async () => {
    const t = await routineTemplatesRepo.create({ title: '삭제될' })
    await routineTemplatesRepo.delete(t.id)
    expect(await routineTemplatesRepo.findById(t.id)).toBeUndefined()
  })

  it('레거시 레코드: categories가 없으면 빈 배열로 보정', async () => {
    // categories 필드가 아예 없던 시절의 레코드를 직접 넣어 재현
    const db = await getDB()
    const legacy = {
      id: 'rtt_legacy',
      title: '옛 루틴',
      exercises: [],
      memo: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } as unknown as RoutineTemplate
    await db.put(STORES.ROUTINE_TEMPLATES, legacy)

    expect((await routineTemplatesRepo.findById('rtt_legacy'))?.categories).toEqual([])
    const all = await routineTemplatesRepo.findAll({ sortBy: 'title' })
    expect(all.find((t) => t.id === 'rtt_legacy')?.categories).toEqual([])
  })

  it('슈퍼세트 묶음(groupId)이 저장·조회에서 보존된다', async () => {
    const t = await routineTemplatesRepo.create({
      title: '슈퍼세트 루틴',
      exercises: [
        { exerciseId: 'ex_a', sets: [{ weight: 60, reps: 10 }], groupId: 'grp_1' },
        { exerciseId: 'ex_b', sets: [{ weight: 20, reps: 12 }], groupId: 'grp_1' },
      ],
    })
    const found = await routineTemplatesRepo.findById(t.id)
    expect(found?.exercises.map((e) => e.groupId)).toEqual(['grp_1', 'grp_1'])
  })
})
