import { getDB } from '../index.ts'
import { STORES } from '../schema.ts'
import type { RoutineLog } from '../types.ts'

function newId(): string {
  return 'rtl_' + crypto.randomUUID()
}

export type RoutineLogInput = Partial<Omit<RoutineLog, 'id' | 'createdAt' | 'updatedAt'>> &
  Pick<RoutineLog, 'date'>

export const routineLogsRepo = {
  async findAll(): Promise<RoutineLog[]> {
    const db = await getDB()
    return db.getAll(STORES.ROUTINE_LOGS)
  },

  async findByDate(date: string): Promise<RoutineLog[]> {
    const db = await getDB()
    return db.getAllFromIndex(STORES.ROUTINE_LOGS, 'by_date', date)
  },

  async findByDateRange(startDate: string, endDate: string): Promise<RoutineLog[]> {
    const db = await getDB()
    const range = IDBKeyRange.bound(startDate, endDate)
    return db.getAllFromIndex(STORES.ROUTINE_LOGS, 'by_date', range)
  },

  async findByTemplate(templateId: string): Promise<RoutineLog[]> {
    const db = await getDB()
    return db.getAllFromIndex(STORES.ROUTINE_LOGS, 'by_templateId', templateId)
  },

  async findById(id: string): Promise<RoutineLog | undefined> {
    const db = await getDB()
    return db.get(STORES.ROUTINE_LOGS, id)
  },

  // Last performed date for a given template (newest first via compound index).
  async lastDateByTemplate(templateId: string): Promise<string | null> {
    const db = await getDB()
    const range = IDBKeyRange.bound([templateId, ''], [templateId, '￿'])
    const cursor = await db
      .transaction(STORES.ROUTINE_LOGS)
      .store.index('by_templateId_date')
      .openCursor(range, 'prev')
    return cursor?.value.date ?? null
  },

  async create(data: RoutineLogInput): Promise<RoutineLog> {
    const db = await getDB()
    const now = new Date().toISOString()
    const log: RoutineLog = {
      id: newId(),
      templateId: data.templateId ?? null,
      title: data.title ?? '',
      date: data.date,
      time: data.time ?? '',
      status: data.status ?? 'planned',
      exercises: data.exercises ?? [],
      memo: data.memo ?? '',
      createdAt: now,
      updatedAt: now,
    }
    await db.add(STORES.ROUTINE_LOGS, log)
    return log
  },

  async update(id: string, changes: Partial<RoutineLog>): Promise<RoutineLog> {
    const db = await getDB()
    const existing = await db.get(STORES.ROUTINE_LOGS, id)
    if (!existing) throw new Error(`RoutineLog ${id} not found`)
    const updated: RoutineLog = { ...existing, ...changes, id, updatedAt: new Date().toISOString() }
    await db.put(STORES.ROUTINE_LOGS, updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete(STORES.ROUTINE_LOGS, id)
  },
}
