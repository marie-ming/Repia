import { getDB } from '../index.ts'
import { STORES } from '../schema.ts'
import type { Mode } from '../types.ts'

export const appConfigRepo = {
  async get<T = unknown>(key: string): Promise<T | null> {
    const db = await getDB()
    const record = await db.get(STORES.APP_CONFIG, key)
    return (record?.value as T) ?? null
  },

  async set(key: string, value: unknown): Promise<void> {
    const db = await getDB()
    await db.put(STORES.APP_CONFIG, { key, value })
  },

  getMode(): Promise<Mode | null> {
    return this.get<Mode>('mode')
  },

  setMode(mode: Mode): Promise<void> {
    return this.set('mode', mode)
  },

  async getAll() {
    const db = await getDB()
    return db.getAll(STORES.APP_CONFIG)
  },
}
