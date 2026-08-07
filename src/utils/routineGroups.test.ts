import { describe, expect, it } from 'vitest'
import type { RoutineExercise } from '../db/types.ts'
import {
  toBlocks,
  isSuperset,
  normalizeGroups,
  isGroupedWithAbove,
  linkWithAbove,
  unlinkFromGroup,
  moveBlock,
  moveWithinGroup,
  roundCount,
  addRound,
  removeRound,
} from './routineGroups.ts'

function ex(id: string, sets = 1, groupId?: string): RoutineExercise {
  const item: RoutineExercise = {
    exerciseId: id,
    sets: Array.from({ length: sets }, (_, i) => ({ weight: 10 * (i + 1), reps: 5 })),
  }
  if (groupId) item.groupId = groupId
  return item
}

const ids = (items: RoutineExercise[]) => items.map((r) => r.exerciseId)
const groups = (items: RoutineExercise[]) => items.map((r) => r.groupId)

describe('toBlocks', () => {
  it('groupId 없으면 각각 단독 블록', () => {
    const blocks = toBlocks([ex('a'), ex('b'), ex('c')])
    expect(blocks.map((b) => b.indices)).toEqual([[0], [1], [2]])
    expect(blocks.every((b) => !isSuperset(b))).toBe(true)
  })

  it('연속된 같은 groupId는 한 블록(슈퍼세트)', () => {
    const blocks = toBlocks([ex('a'), ex('b', 1, 'g1'), ex('c', 1, 'g1'), ex('d')])
    expect(blocks.map((b) => b.indices)).toEqual([[0], [1, 2], [3]])
    expect(blocks.map(isSuperset)).toEqual([false, true, false])
  })

  it('같은 groupId라도 연속이 아니면 별개 블록', () => {
    const blocks = toBlocks([ex('b', 1, 'g1'), ex('x'), ex('c', 1, 'g1')])
    expect(blocks.map((b) => b.indices)).toEqual([[0], [1], [2]])
  })
})

describe('normalizeGroups', () => {
  it('혼자 남은 묶음은 groupId를 떼어낸다', () => {
    expect(groups(normalizeGroups([ex('a', 1, 'g1'), ex('b')]))).toEqual([undefined, undefined])
  })

  it('2개 이상인 묶음은 유지', () => {
    expect(groups(normalizeGroups([ex('a', 1, 'g1'), ex('b', 1, 'g1')]))).toEqual(['g1', 'g1'])
  })
})

describe('isGroupedWithAbove', () => {
  it('바로 위와 같은 묶음일 때만 true', () => {
    const items = [ex('a'), ex('b', 1, 'g1'), ex('c', 1, 'g1')]
    expect(isGroupedWithAbove(items, 0)).toBe(false)
    expect(isGroupedWithAbove(items, 1)).toBe(false) // 위(a)는 묶음이 아님
    expect(isGroupedWithAbove(items, 2)).toBe(true)
  })
})

describe('linkWithAbove', () => {
  it('둘 다 묶음이 아니면 새 묶음을 만들어 함께 넣는다', () => {
    const next = linkWithAbove([ex('a'), ex('b'), ex('c')], 1)
    const g = groups(next)
    expect(g[0]).toBeDefined()
    expect(g[0]).toBe(g[1]) // a+b 한 묶음
    expect(g[2]).toBeUndefined()
    expect(ids(next)).toEqual(['a', 'b', 'c']) // 순서는 그대로
  })

  it('위가 이미 묶음이면 그 묶음에 합류(트라이세트)', () => {
    const next = linkWithAbove([ex('a', 1, 'g1'), ex('b', 1, 'g1'), ex('c')], 2)
    expect(groups(next)).toEqual(['g1', 'g1', 'g1'])
  })

  it('첫 운동은 위가 없어 변화 없음', () => {
    const items = [ex('a'), ex('b')]
    expect(linkWithAbove(items, 0)).toBe(items)
  })
})

describe('unlinkFromGroup', () => {
  it('2개 묶음에서 하나를 빼면 묶음이 해체된다', () => {
    const next = unlinkFromGroup([ex('a', 1, 'g1'), ex('b', 1, 'g1')], 1)
    expect(groups(next)).toEqual([undefined, undefined])
  })

  it('3개 묶음에서 마지막을 빼면 남은 둘은 묶음 유지', () => {
    const next = unlinkFromGroup([ex('a', 1, 'g1'), ex('b', 1, 'g1'), ex('c', 1, 'g1')], 2)
    expect(groups(next)).toEqual(['g1', 'g1', undefined])
  })
})

describe('moveBlock', () => {
  it('슈퍼세트를 통째로 위로 옮긴다(찢어지지 않음)', () => {
    // [a] [b+c] → [b+c] [a]
    const items = [ex('a'), ex('b', 1, 'g1'), ex('c', 1, 'g1')]
    const next = moveBlock(items, 1, -1)
    expect(ids(next)).toEqual(['b', 'c', 'a'])
    expect(groups(next)).toEqual(['g1', 'g1', undefined])
  })

  it('단독 운동은 묶음을 건너뛰어 이동', () => {
    // [a] [b+c] [d] — d를 위로 → [a] [d] [b+c]
    const items = [ex('a'), ex('b', 1, 'g1'), ex('c', 1, 'g1'), ex('d')]
    const next = moveBlock(items, 2, -1)
    expect(ids(next)).toEqual(['a', 'd', 'b', 'c'])
    expect(groups(next)).toEqual([undefined, undefined, 'g1', 'g1'])
  })

  it('범위를 벗어나면 그대로', () => {
    const items = [ex('a'), ex('b')]
    expect(moveBlock(items, 0, -1)).toBe(items)
    expect(moveBlock(items, 1, 1)).toBe(items)
  })
})

describe('moveWithinGroup', () => {
  it('묶음 안에서만 순서를 바꾼다', () => {
    const items = [ex('a'), ex('b', 1, 'g1'), ex('c', 1, 'g1')]
    const next = moveWithinGroup(items, 2, -1)
    expect(ids(next)).toEqual(['a', 'c', 'b'])
    expect(groups(next)).toEqual([undefined, 'g1', 'g1'])
  })

  it('묶음 경계를 넘지 않는다', () => {
    const items = [ex('a'), ex('b', 1, 'g1'), ex('c', 1, 'g1')]
    expect(moveWithinGroup(items, 1, -1)).toBe(items) // 묶음 첫 멤버
    expect(moveWithinGroup(items, 2, 1)).toBe(items) // 묶음 마지막 멤버
  })
})

describe('라운드 (묶음의 세트)', () => {
  it('roundCount는 멤버 중 최대 세트 수', () => {
    const items = [ex('b', 3, 'g1'), ex('c', 2, 'g1')]
    expect(roundCount(items, [0, 1])).toBe(3)
  })

  it('addRound는 멤버 전원에게 세트를 하나씩 추가(마지막 세트 복사)', () => {
    const items = [ex('a'), ex('b', 2, 'g1'), ex('c', 2, 'g1')]
    const next = addRound(items, [1, 2])
    expect(next.map((r) => r.sets.length)).toEqual([1, 3, 3]) // 묶음 밖(a)은 그대로
    expect(next[1].sets[2]).toEqual(items[1].sets[1]) // 자기 마지막 세트 복사
  })

  it('removeRound는 멤버 전원에서 같은 순번을 제거', () => {
    const items = [ex('b', 3, 'g1'), ex('c', 3, 'g1')]
    const next = removeRound(items, [0, 1], 0)
    expect(next.map((r) => r.sets.length)).toEqual([2, 2])
    expect(next[0].sets[0]).toEqual(items[0].sets[1]) // 1라운드가 빠지고 2라운드가 앞으로
  })
})
