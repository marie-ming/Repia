import { getDB } from '../index.ts'
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
      emoji: data.emoji ?? '🏋️',
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
    await db.put(STORES.MEMBERS, updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete(STORES.MEMBERS, id)
  },
}
