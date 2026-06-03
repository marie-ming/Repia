import { getDB } from '../index.ts'
import { STORES } from '../schema.ts'
import type { RoutineTemplate } from '../types.ts'

function newId(): string {
  return 'rtt_' + crypto.randomUUID()
}

// 레거시 레코드: categories 누락 시 빈 배열로 보정
function normalize(t: RoutineTemplate): RoutineTemplate {
  if (!Array.isArray(t.categories)) t.categories = []
  return t
}

export type RoutineTemplateInput = Partial<
  Omit<RoutineTemplate, 'id' | 'createdAt' | 'updatedAt'>
> &
  Pick<RoutineTemplate, 'title'>

export const routineTemplatesRepo = {
  async findAll({ sortBy = 'updatedAt' }: { sortBy?: 'title' | 'updatedAt' } = {}): Promise<
    RoutineTemplate[]
  > {
    const db = await getDB()
    const index = sortBy === 'title' ? 'by_title' : 'by_updatedAt'
    const results = await db.getAllFromIndex(STORES.ROUTINE_TEMPLATES, index)
    // updatedAt sort should be newest first
    if (sortBy === 'updatedAt') results.reverse()
    return results.map(normalize)
  },

  async findById(id: string): Promise<RoutineTemplate | undefined> {
    const db = await getDB()
    const t = await db.get(STORES.ROUTINE_TEMPLATES, id)
    return t ? normalize(t) : undefined
  },

  async create(data: RoutineTemplateInput): Promise<RoutineTemplate> {
    const db = await getDB()
    const now = new Date().toISOString()
    const template: RoutineTemplate = {
      id: newId(),
      title: data.title,
      categories: data.categories ?? [],
      exercises: data.exercises ?? [],
      memo: data.memo ?? '',
      createdAt: now,
      updatedAt: now,
    }
    await db.add(STORES.ROUTINE_TEMPLATES, template)
    return template
  },

  async update(id: string, changes: Partial<RoutineTemplate>): Promise<RoutineTemplate> {
    const db = await getDB()
    const existing = await db.get(STORES.ROUTINE_TEMPLATES, id)
    if (!existing) throw new Error(`RoutineTemplate ${id} not found`)
    const updated: RoutineTemplate = {
      ...existing,
      ...changes,
      id,
      updatedAt: new Date().toISOString(),
    }
    await db.put(STORES.ROUTINE_TEMPLATES, updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete(STORES.ROUTINE_TEMPLATES, id)
  },
}
