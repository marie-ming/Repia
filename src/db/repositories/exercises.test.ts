import { describe, expect, it } from 'vitest'
import { exercisesRepo, normalize } from './exercises.ts'
import { sessionsRepo } from './sessions.ts'
import type { Exercise } from '../types.ts'

function makeBase(): Partial<Exercise> {
  return {
    id: 'ex_1',
    name: '데드리프트',
    equipment: 'barbell',
    description: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('normalize (exercises 레거시 데이터 마이그레이션)', () => {
  it('photos가 배열이면 그대로 유지', () => {
    const ex = { ...makeBase(), photos: ['a.jpg', 'b.jpg'], categories: ['back'], grip: '' } as Exercise
    expect(normalize(ex).photos).toEqual(['a.jpg', 'b.jpg'])
  })

  it('레거시 photo(string) → photos 배열로 변환', () => {
    const ex = { ...makeBase(), photo: 'old.jpg', categories: [], grip: '' } as never
    const out = normalize(ex)
    expect(out.photos).toEqual(['old.jpg'])
    expect('photo' in out).toBe(false)
  })

  it('레거시 photo가 null이면 빈 배열', () => {
    const ex = { ...makeBase(), photo: null, categories: [], grip: '' } as never
    expect(normalize(ex).photos).toEqual([])
  })

  it('photos도 photo도 없으면 빈 배열', () => {
    const ex = { ...makeBase(), categories: [], grip: '' } as never
    expect(normalize(ex).photos).toEqual([])
  })

  it('categories가 배열이면 그대로 유지', () => {
    const ex = { ...makeBase(), photos: [], categories: ['back', 'biceps'], grip: '' } as Exercise
    expect(normalize(ex).categories).toEqual(['back', 'biceps'])
  })

  it('레거시 category(single) → categories 배열로 변환', () => {
    const ex = { ...makeBase(), photos: [], category: 'arm', grip: '' } as never
    const out = normalize(ex)
    expect(out.categories).toEqual(['arm'])
    expect('category' in out).toBe(false)
  })

  it('레거시 category가 없으면 빈 배열', () => {
    const ex = { ...makeBase(), photos: [], grip: '' } as never
    expect(normalize(ex).categories).toEqual([])
  })

  it('grip이 string이 아니면 빈 문자열로', () => {
    const ex = { ...makeBase(), photos: [], categories: [] } as never
    expect(normalize(ex).grip).toBe('')
  })

  it('grip이 string이면 그대로', () => {
    const ex = { ...makeBase(), photos: [], categories: [], grip: '오버핸드' } as Exercise
    expect(normalize(ex).grip).toBe('오버핸드')
  })

  it('완전한 레거시 레코드 한번에 변환', () => {
    const legacy = {
      ...makeBase(),
      photo: 'legacy.jpg',
      category: 'arm',
    } as never
    const out = normalize(legacy)
    expect(out.photos).toEqual(['legacy.jpg'])
    expect(out.categories).toEqual(['arm'])
    expect(out.grip).toBe('')
    expect('photo' in out).toBe(false)
    expect('category' in out).toBe(false)
  })
})

describe('exercisesRepo (fake-indexeddb)', () => {
  it('create: 기본값 채워 저장', async () => {
    const ex = await exercisesRepo.create({ name: '데드리프트' })
    expect(ex.id).toMatch(/^ex_/)
    expect(ex.name).toBe('데드리프트')
    expect(ex.categories).toEqual([])
    expect(ex.equipment).toBeNull()
    expect(ex.grip).toBe('')
    expect(ex.photos).toEqual([])
    expect(ex.description).toBe('')
  })

  it('create: 입력값이 기본값을 override', async () => {
    const ex = await exercisesRepo.create({
      name: '벤치프레스',
      categories: ['chest'],
      equipment: 'barbell',
      grip: '오버핸드',
      photos: ['a.jpg'],
      description: '주의사항',
    })
    expect(ex.categories).toEqual(['chest'])
    expect(ex.equipment).toBe('barbell')
    expect(ex.grip).toBe('오버핸드')
    expect(ex.photos).toEqual(['a.jpg'])
  })

  it('findAll: 이름순 정렬', async () => {
    await exercisesRepo.create({ name: '나' })
    await exercisesRepo.create({ name: '가' })
    await exercisesRepo.create({ name: '다' })
    const list = await exercisesRepo.findAll()
    expect(list.map((e) => e.name)).toEqual(['가', '나', '다'])
  })

  it('findById: 저장된 운동 조회', async () => {
    const ex = await exercisesRepo.create({ name: 'x' })
    expect(await exercisesRepo.findById(ex.id)).toEqual(ex)
  })

  it('update: 부분 변경 + updatedAt 갱신', async () => {
    const ex = await exercisesRepo.create({ name: 'orig' })
    await new Promise((r) => setTimeout(r, 5))
    const upd = await exercisesRepo.update(ex.id, { name: 'new' })
    expect(upd.name).toBe('new')
    expect(upd.updatedAt).not.toBe(ex.updatedAt)
  })

  it('update: 없는 id면 에러', async () => {
    await expect(exercisesRepo.update('ex_none', {})).rejects.toThrow(/not found/)
  })

  it('delete: 사용 중이 아니면 삭제 가능', async () => {
    const ex = await exercisesRepo.create({ name: '삭제될' })
    await exercisesRepo.delete(ex.id)
    expect(await exercisesRepo.findById(ex.id)).toBeUndefined()
  })

  it('delete: 세션에서 사용 중이면 에러', async () => {
    const ex = await exercisesRepo.create({ name: '사용중' })
    await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: 'x',
      date: '2026-06-01',
      routine: [{ exerciseId: ex.id, sets: [{ weight: 50, reps: 10 }] }],
    })
    await expect(exercisesRepo.delete(ex.id)).rejects.toThrow(/사용 중/)
    expect(await exercisesRepo.findById(ex.id)).toBeDefined() // 삭제되지 않음
  })
})
