import type { RoutineExercise, SetEntry } from '../db/types.ts'

// 슈퍼세트 묶음 로직. RoutineExercise[]는 평면으로 유지하고, 연속된 같은 groupId를
// 한 묶음으로 "해석"한다(연속이 아니면 별개 묶음 — 순서를 바꿔도 해석이 흔들리지 않게).

export interface RoutineBlock {
  groupId?: string // 있으면 슈퍼세트 묶음, 없으면 단독 운동
  indices: number[] // 원본 배열에서의 인덱스
}

export function newGroupId(): string {
  return 'grp_' + crypto.randomUUID()
}

export function toBlocks(items: RoutineExercise[]): RoutineBlock[] {
  const blocks: RoutineBlock[] = []
  items.forEach((item, i) => {
    const prev = blocks[blocks.length - 1]
    if (item.groupId && prev && prev.groupId === item.groupId) {
      prev.indices.push(i)
      return
    }
    blocks.push({ groupId: item.groupId, indices: [i] })
  })
  return blocks
}

export function isSuperset(block: RoutineBlock): boolean {
  return !!block.groupId && block.indices.length > 1
}

function withoutGroup(item: RoutineExercise): RoutineExercise {
  const next = { ...item }
  delete next.groupId
  return next
}

// 혼자 남은 묶음은 슈퍼세트가 아니므로 groupId를 떼어낸다.
export function normalizeGroups(items: RoutineExercise[]): RoutineExercise[] {
  const solo = new Set<number>()
  for (const b of toBlocks(items)) {
    if (b.groupId && b.indices.length < 2) solo.add(b.indices[0])
  }
  if (solo.size === 0) return items
  return items.map((item, i) => (solo.has(i) ? withoutGroup(item) : item))
}

// i번째 운동이 바로 위 운동과 같은 묶음인지
export function isGroupedWithAbove(items: RoutineExercise[], i: number): boolean {
  return i > 0 && !!items[i].groupId && items[i].groupId === items[i - 1].groupId
}

// i번째 운동을 바로 위 운동과 한 묶음으로. 위가 이미 묶음이면 그 묶음에 합류(트라이세트 등)
export function linkWithAbove(items: RoutineExercise[], i: number): RoutineExercise[] {
  if (i <= 0 || i >= items.length) return items
  const aboveGroup = items[i - 1].groupId
  const gid = aboveGroup ?? newGroupId()
  const next = items.map((item, idx) => {
    if (idx === i) return { ...item, groupId: gid }
    if (idx === i - 1 && !aboveGroup) return { ...item, groupId: gid }
    return item
  })
  return normalizeGroups(next)
}

// i번째 운동을 묶음에서 빼낸다
export function unlinkFromGroup(items: RoutineExercise[], i: number): RoutineExercise[] {
  if (i < 0 || i >= items.length) return items
  return normalizeGroups(items.map((item, idx) => (idx === i ? withoutGroup(item) : item)))
}

// 묶음(또는 단독 운동) 단위로 위/아래 이동 — 슈퍼세트가 찢어지지 않는다
export function moveBlock(
  items: RoutineExercise[],
  blockIndex: number,
  dir: -1 | 1,
): RoutineExercise[] {
  const blocks = toBlocks(items)
  const target = blockIndex + dir
  if (blockIndex < 0 || blockIndex >= blocks.length) return items
  if (target < 0 || target >= blocks.length) return items
  const order = [...blocks]
  ;[order[blockIndex], order[target]] = [order[target], order[blockIndex]]
  return order.flatMap((b) => b.indices.map((i) => items[i]))
}

// 같은 묶음 안에서 순서 변경 (묶음 밖으로는 나가지 않음)
export function moveWithinGroup(
  items: RoutineExercise[],
  i: number,
  dir: -1 | 1,
): RoutineExercise[] {
  const block = toBlocks(items).find((b) => b.indices.includes(i))
  if (!block || block.indices.length < 2) return items
  const pos = block.indices.indexOf(i)
  const targetPos = pos + dir
  if (targetPos < 0 || targetPos >= block.indices.length) return items
  const a = block.indices[pos]
  const b = block.indices[targetPos]
  const next = [...items]
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

// 묶음의 라운드 수 = 멤버 중 가장 많은 세트 수
export function roundCount(items: RoutineExercise[], indices: number[]): number {
  return indices.reduce((max, i) => Math.max(max, items[i].sets.length), 0)
}

const EMPTY_SET: SetEntry = { weight: 0, reps: 0 }

// 라운드 추가: 묶음 멤버 전원에게 세트 1개씩 (각자 자기 마지막 세트를 복사)
export function addRound(items: RoutineExercise[], indices: number[]): RoutineExercise[] {
  const target = new Set(indices)
  return items.map((item, i) => {
    if (!target.has(i)) return item
    const last = item.sets[item.sets.length - 1]
    return { ...item, sets: [...item.sets, last ? { ...last } : { ...EMPTY_SET }] }
  })
}

// 라운드 삭제: 묶음 멤버 전원에서 같은 순번의 세트 제거
export function removeRound(
  items: RoutineExercise[],
  indices: number[],
  round: number,
): RoutineExercise[] {
  const target = new Set(indices)
  return items.map((item, i) =>
    target.has(i) ? { ...item, sets: item.sets.filter((_, j) => j !== round) } : item,
  )
}
