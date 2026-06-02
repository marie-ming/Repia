import { describe, expect, it } from 'vitest'
import { normalize } from './exercises.ts'
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
