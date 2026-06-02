import { getDB } from '../index.ts'
import { STORES } from '../schema.ts'
import type { IDBPDatabase } from 'idb'
import type { RepiaDB } from '../schema.ts'
import type { Exercise, ExerciseCategory } from '../types.ts'

function newId(): string {
  return 'ex_' + crypto.randomUUID()
}

// Backward-compat: older records used `photo` (single) and `category` (single).
// Normalize them to `photos` / `categories` arrays on read.
export function normalize(
  ex: Exercise & { photo?: string | null; category?: ExerciseCategory },
): Exercise {
  if (!Array.isArray(ex.photos)) {
    ex.photos = ex.photo ? [ex.photo] : []
  }
  if ('photo' in ex) delete ex.photo

  if (!Array.isArray(ex.categories)) {
    ex.categories = ex.category ? [ex.category] : []
  }
  if ('category' in ex) delete ex.category

  if (typeof ex.grip !== 'string') ex.grip = ''

  return ex
}

// Counts how many sessions / logs / templates reference an exercise — deletion guard.
async function countExerciseUsage(db: IDBPDatabase<RepiaDB>, exerciseId: string): Promise<number> {
  let count = 0

  const sessions = await db.getAll(STORES.SESSIONS)
  for (const s of sessions) {
    if (s.routine?.some((r) => r.exerciseId === exerciseId)) count++
  }

  const logs = await db.getAll(STORES.ROUTINE_LOGS)
  for (const l of logs) {
    if (l.exercises?.some((e) => e.exerciseId === exerciseId)) count++
  }

  const templates = await db.getAll(STORES.ROUTINE_TEMPLATES)
  for (const t of templates) {
    if (t.exercises?.some((e) => e.exerciseId === exerciseId)) count++
  }

  return count
}

export type ExerciseInput = Partial<Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>> &
  Pick<Exercise, 'name'>

export const exercisesRepo = {
  async findAll(): Promise<Exercise[]> {
    const db = await getDB()
    const list = await db.getAllFromIndex(STORES.EXERCISES, 'by_name')
    return list.map(normalize)
  },

  async findById(id: string): Promise<Exercise | undefined> {
    const db = await getDB()
    const ex = await db.get(STORES.EXERCISES, id)
    return ex ? normalize(ex) : undefined
  },

  async create(data: ExerciseInput): Promise<Exercise> {
    const db = await getDB()
    const now = new Date().toISOString()
    const exercise: Exercise = {
      id: newId(),
      name: data.name,
      categories: data.categories ?? [],
      equipment: data.equipment ?? null,
      grip: data.grip ?? '',
      photos: data.photos ?? [],
      description: data.description ?? '',
      createdAt: now,
      updatedAt: now,
    }
    await db.add(STORES.EXERCISES, exercise)
    return exercise
  },

  async update(id: string, changes: Partial<Exercise>): Promise<Exercise> {
    const db = await getDB()
    const existing = await db.get(STORES.EXERCISES, id)
    if (!existing) throw new Error(`Exercise ${id} not found`)
    const updated: Exercise = {
      ...normalize(existing),
      ...changes,
      id,
      updatedAt: new Date().toISOString(),
    }
    await db.put(STORES.EXERCISES, updated)
    return updated
  },

  // Throws with a user-facing message if the exercise is still in use.
  async delete(id: string): Promise<{ deleted: true }> {
    const db = await getDB()
    const usageCount = await countExerciseUsage(db, id)
    if (usageCount > 0) {
      throw new Error(`이 운동은 ${usageCount}개의 수업/루틴에서 사용 중이라 삭제할 수 없습니다`)
    }
    await db.delete(STORES.EXERCISES, id)
    return { deleted: true }
  },
}
