import { getDB } from '../index.ts'
import { STORES } from '../schema.ts'
import type { Session, SessionStatus } from '../types.ts'

function newId(): string {
  return 'ses_' + crypto.randomUUID()
}

export type SessionInput = Partial<Omit<Session, 'id' | 'createdAt' | 'updatedAt'>> &
  Pick<Session, 'memberId' | 'memberNameSnapshot' | 'date'>

export const sessionsRepo = {
  async findAll(): Promise<Session[]> {
    const db = await getDB()
    return db.getAll(STORES.SESSIONS)
  },

  async findByDate(date: string): Promise<Session[]> {
    const db = await getDB()
    return db.getAllFromIndex(STORES.SESSIONS, 'by_date', date)
  },

  // date range inclusive, e.g. findByDateRange('2026-05-01', '2026-05-31')
  async findByDateRange(startDate: string, endDate: string): Promise<Session[]> {
    const db = await getDB()
    const range = IDBKeyRange.bound(startDate, endDate)
    return db.getAllFromIndex(STORES.SESSIONS, 'by_date', range)
  },

  async findByMember(memberId: string): Promise<Session[]> {
    const db = await getDB()
    return db.getAllFromIndex(STORES.SESSIONS, 'by_memberId', memberId)
  },

  async findByStatus(status: SessionStatus): Promise<Session[]> {
    const db = await getDB()
    return db.getAllFromIndex(STORES.SESSIONS, 'by_status', status)
  },

  async findById(id: string): Promise<Session | undefined> {
    const db = await getDB()
    return db.get(STORES.SESSIONS, id)
  },

  async create(data: SessionInput): Promise<Session> {
    const db = await getDB()
    const now = new Date().toISOString()
    const session: Session = {
      id: newId(),
      title: data.title ?? '',
      memberId: data.memberId,
      memberNameSnapshot: data.memberNameSnapshot,
      date: data.date,
      time: data.time ?? '',
      status: data.status ?? 'reserved',
      routine: data.routine ?? [],
      memo: data.memo ?? '',
      createdAt: now,
      updatedAt: now,
    }
    await db.add(STORES.SESSIONS, session)
    return session
  },

  async update(id: string, changes: Partial<Session>): Promise<Session> {
    const db = await getDB()
    const existing = await db.get(STORES.SESSIONS, id)
    if (!existing) throw new Error(`Session ${id} not found`)
    const updated: Session = { ...existing, ...changes, id, updatedAt: new Date().toISOString() }
    await db.put(STORES.SESSIONS, updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete(STORES.SESSIONS, id)
  },

  // Aggregate: total completed sessions count for a member.
  async countCompletedByMember(memberId: string): Promise<number> {
    const sessions = await this.findByMember(memberId)
    return sessions.filter((s) => s.status === 'completed').length
  },

  // Aggregate: last session date for a member (newest first via compound index).
  async lastDateByMember(memberId: string): Promise<string | null> {
    const db = await getDB()
    const range = IDBKeyRange.bound([memberId, ''], [memberId, '￿'])
    const cursor = await db
      .transaction(STORES.SESSIONS)
      .store.index('by_memberId_date')
      .openCursor(range, 'prev')
    return cursor?.value.date ?? null
  },
}
