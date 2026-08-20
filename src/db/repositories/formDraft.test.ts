import { describe, expect, it } from 'vitest'
import { appConfigRepo } from './appConfig.ts'
import {
  DRAFT_EXPIRE_DAYS,
  isDraftExpired,
  isRoutineItems,
  makeDraftRepo,
} from './formDraft.ts'

interface Toy {
  name: string
  items: { exerciseId: string; sets: unknown[] }[]
}

const spec = {
  key: 'toyDraft',
  isWorthKeeping: (f: Toy) => f.name.trim() !== '' || f.items.length > 0,
  isShape: (f: unknown): f is Toy => {
    if (!f || typeof f !== 'object') return false
    const o = f as Record<string, unknown>
    return typeof o.name === 'string' && isRoutineItems(o.items)
  },
}

const repo = makeDraftRepo<Toy>(spec)
const toy = (over: Partial<Toy> = {}): Toy => ({ name: '', items: [], ...over })
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

describe('isDraftExpired', () => {
  it('기준일에 도달하면 만료', () => {
    expect(isDraftExpired({ savedAt: daysAgo(DRAFT_EXPIRE_DAYS) })).toBe(true)
    expect(isDraftExpired({ savedAt: daysAgo(DRAFT_EXPIRE_DAYS - 1) })).toBe(false)
  })

  it('깨진 날짜는 만료로 본다', () => {
    expect(isDraftExpired({ savedAt: 'not-a-date' })).toBe(true)
  })

  // 초안 객체를 그대로 넘길 수 있어야 한다
  it('form이 함께 있어도 된다', () => {
    expect(isDraftExpired({ savedAt: daysAgo(0), form: toy() })).toBe(false)
  })
})

describe('makeDraftRepo', () => {
  it('내용이 있으면 저장하고 읽는다', async () => {
    await repo.save(toy({ name: '작성 중' }))
    expect((await repo.get())?.form.name).toBe('작성 중')
  })

  it('내용이 없으면 저장하지 않는다 (화면만 열었다 나간 경우)', async () => {
    await repo.save(toy({ name: '작성 중' }))
    await repo.save(toy())
    expect(await repo.get()).toBeNull()
  })

  it('clear 후에는 없다', async () => {
    await repo.save(toy({ name: 'x' }))
    await repo.clear()
    expect(await repo.get()).toBeNull()
  })

  it('하나만 유지된다 (새로 저장하면 덮어씀)', async () => {
    await repo.save(toy({ name: '첫번째' }))
    await repo.save(toy({ name: '두번째' }))
    expect((await repo.get())?.form.name).toBe('두번째')
  })

  it('만료된 초안은 없는 것으로 보고 정리한다', async () => {
    await repo.save(toy({ name: '오래된' }))
    const future = new Date(Date.now() + (DRAFT_EXPIRE_DAYS + 1) * 86_400_000)
    expect(await repo.get(future)).toBeNull()
    expect(await repo.get()).toBeNull()
  })

  // 백업 복원은 appConfig 행을 파일에 있는 그대로 넣는다
  it('모양이 어긋난 초안은 없는 것으로 보고 지운다', async () => {
    await appConfigRepo.set('toyDraft', {
      savedAt: new Date().toISOString(),
      form: { name: '망가짐' }, // items 없음
    })
    expect(await repo.get()).toBeNull()
    expect(await appConfigRepo.get('toyDraft')).toBeNull()
  })

  it('모양이 어긋나도 예외를 던지지 않는다', async () => {
    await appConfigRepo.set('toyDraft', { savedAt: new Date().toISOString(), form: { items: 3 } })
    await expect(repo.get()).resolves.toBeNull()
  })

  // 폼마다 키가 달라야 서로 덮어쓰지 않는다
  it('키가 다르면 서로 간섭하지 않는다', async () => {
    const other = makeDraftRepo<Toy>({ ...spec, key: 'otherDraft' })
    await repo.save(toy({ name: '내 것' }))
    await other.save(toy({ name: '남의 것' }))

    expect((await repo.get())?.form.name).toBe('내 것')
    expect((await other.get())?.form.name).toBe('남의 것')

    await repo.clear()
    expect(await repo.get()).toBeNull()
    expect((await other.get())?.form.name).toBe('남의 것')
  })
})

describe('isRoutineItems', () => {
  it('운동 항목 배열인지', () => {
    expect(isRoutineItems([])).toBe(true)
    expect(isRoutineItems([{ exerciseId: 'e1', sets: [] }])).toBe(true)
  })

  it('배열이 아니거나 모양이 어긋나면 거부', () => {
    expect(isRoutineItems(null)).toBe(false)
    expect(isRoutineItems('운동')).toBe(false)
    expect(isRoutineItems([{ exerciseId: 'e1' }])).toBe(false)
    expect(isRoutineItems([{ exerciseId: 1, sets: [] }])).toBe(false)
    expect(isRoutineItems([null])).toBe(false)
  })
})
