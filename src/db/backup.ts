import { getDB, withTransaction } from './index.ts'
import { STORES } from './schema.ts'
import type {
  AppConfigRecord,
  Member,
  Exercise,
  Session,
  RoutineTemplate,
  RoutineLog,
} from './types.ts'

const SCHEMA_VERSION = 1

export interface BackupFile {
  app: 'repia'
  schemaVersion: number
  exportedAt: string
  includesPhotos: boolean
  data: {
    appConfig: AppConfigRecord[]
    members: Member[]
    exercises: Exercise[]
    sessions: Session[]
    routineTemplates: RoutineTemplate[]
    routineLogs: RoutineLog[]
  }
}

// Export all data to a downloadable JSON file. Strips photos if includesPhotos is false.
export async function exportBackup({ includesPhotos = true }: { includesPhotos?: boolean } = {}) {
  const db = await getDB()

  const [appConfig, members, exercises, sessions, routineTemplates, routineLogs] =
    await Promise.all([
      db.getAll(STORES.APP_CONFIG),
      db.getAll(STORES.MEMBERS),
      db.getAll(STORES.EXERCISES),
      db.getAll(STORES.SESSIONS),
      db.getAll(STORES.ROUTINE_TEMPLATES),
      db.getAll(STORES.ROUTINE_LOGS),
    ])

  const exportedExercises = includesPhotos
    ? exercises
    : exercises.map((ex) => ({ ...ex, photos: [] }))

  const backup: BackupFile = {
    app: 'repia',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    includesPhotos,
    data: {
      appConfig,
      members,
      exercises: exportedExercises,
      sessions,
      routineTemplates,
      routineLogs,
    },
  }

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `repia-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Import (overwrite) from a backup file. Throws with a user-facing message on failure.
export async function importBackup(file: File): Promise<{ success: true; includesPhotos: boolean }> {
  const text = await file.text()
  let backup: BackupFile
  try {
    backup = JSON.parse(text) as BackupFile
  } catch {
    throw new Error('파일을 읽을 수 없습니다. 올바른 JSON 파일인지 확인해주세요.')
  }

  if (backup.app !== 'repia') {
    throw new Error('Repia 백업 파일이 아닙니다.')
  }
  if (backup.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`지원하지 않는 스키마 버전입니다. (버전: ${backup.schemaVersion})`)
  }

  const { data, includesPhotos } = backup

  // Single transaction: clear all stores then bulk-insert new data. Auto-rolls back on failure.
  await withTransaction(
    [
      STORES.APP_CONFIG,
      STORES.MEMBERS,
      STORES.EXERCISES,
      STORES.SESSIONS,
      STORES.ROUTINE_TEMPLATES,
      STORES.ROUTINE_LOGS,
    ],
    'readwrite',
    async (tx) => {
      await Promise.all([
        tx.objectStore(STORES.APP_CONFIG).clear(),
        tx.objectStore(STORES.MEMBERS).clear(),
        tx.objectStore(STORES.EXERCISES).clear(),
        tx.objectStore(STORES.SESSIONS).clear(),
        tx.objectStore(STORES.ROUTINE_TEMPLATES).clear(),
        tx.objectStore(STORES.ROUTINE_LOGS).clear(),
      ])

      await Promise.all([
        ...(data.appConfig ?? []).map((r) => tx.objectStore(STORES.APP_CONFIG).put(r)),
        ...(data.members ?? []).map((r) => tx.objectStore(STORES.MEMBERS).put(r)),
        ...(data.exercises ?? []).map((r) => tx.objectStore(STORES.EXERCISES).put(r)),
        ...(data.sessions ?? []).map((r) => tx.objectStore(STORES.SESSIONS).put(r)),
        ...(data.routineTemplates ?? []).map((r) =>
          tx.objectStore(STORES.ROUTINE_TEMPLATES).put(r),
        ),
        ...(data.routineLogs ?? []).map((r) => tx.objectStore(STORES.ROUTINE_LOGS).put(r)),
      ])
    },
  )

  return { success: true, includesPhotos }
}
