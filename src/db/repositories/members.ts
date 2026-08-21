import { getDB, withTransaction } from '../index.ts'
import { STORES } from '../schema.ts'
import type { Member } from '../types.ts'
import { todayISODate } from '../../utils/date.ts'

function newId(): string {
  return 'mem_' + crypto.randomUUID()
}

export type MemberInput = Partial<Omit<Member, 'id' | 'createdAt' | 'updatedAt'>> &
  Pick<Member, 'name'>

export const membersRepo = {
  async findAll({ sortBy = 'name' }: { sortBy?: 'name' | 'createdAt' } = {}): Promise<Member[]> {
    const db = await getDB()
    const index = sortBy === 'createdAt' ? 'by_createdAt' : 'by_name'
    return db.getAllFromIndex(STORES.MEMBERS, index)
  },

  async findById(id: string): Promise<Member | undefined> {
    const db = await getDB()
    return db.get(STORES.MEMBERS, id)
  },

  async create(data: MemberInput): Promise<Member> {
    const db = await getDB()
    const now = new Date().toISOString()
    const member: Member = {
      id: newId(),
      name: data.name,
      phone: data.phone ?? '',
      status: data.status ?? 'active',
      memo: data.memo ?? '',
      registeredAt: data.registeredAt ?? todayISODate(),
      createdAt: now,
      updatedAt: now,
    }
    await db.add(STORES.MEMBERS, member)
    return member
  },

  async update(id: string, changes: Partial<Member>): Promise<Member> {
    const db = await getDB()
    const existing = await db.get(STORES.MEMBERS, id)
    if (!existing) throw new Error(`Member ${id} not found`)
    const updated: Member = { ...existing, ...changes, id, updatedAt: new Date().toISOString() }

    // 수업은 회원 이름을 스냅샷으로 갖고 있다(회원을 지워도 기록이 남게 하려고).
    // 그래서 이름을 고쳐도 과거 수업에는 옛 이름이 남는다 — 오타를 고치면 과거가
    // 계속 틀린 채로 있다. 이름이 바뀔 때만 그 회원의 수업 스냅샷도 함께 맞춘다.
    // (삭제 시에는 여전히 스냅샷이 남아 기록이 보존된다)
    const renamed = updated.name !== existing.name
    if (!renamed) {
      await db.put(STORES.MEMBERS, updated)
      return updated
    }

    // 한 트랜잭션으로 — 중간에 실패하면 이름과 스냅샷이 어긋난 채로 남는다
    await withTransaction([STORES.MEMBERS, STORES.SESSIONS], 'readwrite', async (tx) => {
      await tx.objectStore(STORES.MEMBERS).put(updated)
      const sessions = tx.objectStore(STORES.SESSIONS)
      const mine = await sessions.index('by_memberId').getAll(id)
      await Promise.all(
        mine.map((s) => sessions.put({ ...s, memberNameSnapshot: updated.name })),
      )
    })
    return updated
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete(STORES.MEMBERS, id)
  },
}
