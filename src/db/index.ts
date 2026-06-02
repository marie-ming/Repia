import { openDB } from 'idb'
import type { IDBPDatabase, IDBPTransaction, StoreNames } from 'idb'
import { DB_NAME, DB_VERSION, defineSchema } from './schema.ts'
import type { RepiaDB } from './schema.ts'

let dbPromise: Promise<IDBPDatabase<RepiaDB>> | null = null

// Test-only: force the next getDB() call to open a fresh connection.
// Used together with indexedDB.deleteDatabase() between test cases.
export function _resetDBForTests(): void {
  dbPromise = null
}

// Returns the singleton DB instance, opening it on first call.
export function getDB(): Promise<IDBPDatabase<RepiaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<RepiaDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v0 → v1: initial schema
        if (oldVersion < 1) {
          defineSchema(db)
        }
        // Future migrations: add `if (oldVersion < 2) { ... }` blocks here.
      },
      blocked() {
        console.warn('[repia-db] DB upgrade blocked by another tab. Please close other tabs.')
      },
      blocking() {
        // Another tab is trying to upgrade — release the connection.
        dbPromise = null
      },
      terminated() {
        console.error('[repia-db] DB connection was unexpectedly terminated.')
        dbPromise = null
      },
    })
  }
  return dbPromise
}

// Convenience: run a transaction across one or more stores.
export async function withTransaction<
  Names extends ArrayLike<StoreNames<RepiaDB>>,
  Mode extends IDBTransactionMode,
  T,
>(
  storeNames: Names,
  mode: Mode,
  callback: (tx: IDBPTransaction<RepiaDB, Names, Mode>) => Promise<T>,
): Promise<T> {
  const db = await getDB()
  const tx = db.transaction(storeNames, mode)
  const result = await callback(tx)
  await tx.done
  return result
}
