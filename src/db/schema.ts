import type { DBSchema, IDBPDatabase } from 'idb'
import type {
  AppConfigRecord,
  Member,
  Exercise,
  Session,
  RoutineTemplate,
  RoutineLog,
} from './types.ts'

// Single source of truth for all IndexedDB store and index definitions.
// Import from here wherever you need store names — never hard-code strings.

export const DB_NAME = 'repia-db'
export const DB_VERSION = 1

export const STORES = {
  APP_CONFIG: 'appConfig',
  MEMBERS: 'members',
  EXERCISES: 'exercises',
  SESSIONS: 'sessions',
  ROUTINE_TEMPLATES: 'routineTemplates',
  ROUTINE_LOGS: 'routineLogs',
} as const

export interface RepiaDB extends DBSchema {
  appConfig: {
    key: string
    value: AppConfigRecord
  }
  members: {
    key: string
    value: Member
    indexes: { by_name: string; by_createdAt: string }
  }
  exercises: {
    key: string
    value: Exercise
    indexes: { by_category: string; by_name: string }
  }
  sessions: {
    key: string
    value: Session
    indexes: {
      by_date: string
      by_memberId: string
      by_memberId_date: [string, string]
      by_status: string
    }
  }
  routineTemplates: {
    key: string
    value: RoutineTemplate
    indexes: { by_title: string; by_updatedAt: string }
  }
  routineLogs: {
    key: string
    value: RoutineLog
    indexes: {
      by_date: string
      by_templateId: string
      by_templateId_date: [string, string]
    }
  }
}

// Called inside upgrade — defines all object stores and indexes for v1.
export function defineSchema(db: IDBPDatabase<RepiaDB>) {
  if (!db.objectStoreNames.contains(STORES.APP_CONFIG)) {
    db.createObjectStore(STORES.APP_CONFIG, { keyPath: 'key' })
  }

  if (!db.objectStoreNames.contains(STORES.MEMBERS)) {
    const members = db.createObjectStore(STORES.MEMBERS, { keyPath: 'id' })
    members.createIndex('by_name', 'name')
    members.createIndex('by_createdAt', 'createdAt')
  }

  if (!db.objectStoreNames.contains(STORES.EXERCISES)) {
    const exercises = db.createObjectStore(STORES.EXERCISES, { keyPath: 'id' })
    exercises.createIndex('by_category', 'category')
    exercises.createIndex('by_name', 'name')
  }

  if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
    const sessions = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' })
    sessions.createIndex('by_date', 'date')
    sessions.createIndex('by_memberId', 'memberId')
    sessions.createIndex('by_memberId_date', ['memberId', 'date'])
    sessions.createIndex('by_status', 'status')
  }

  if (!db.objectStoreNames.contains(STORES.ROUTINE_TEMPLATES)) {
    const templates = db.createObjectStore(STORES.ROUTINE_TEMPLATES, { keyPath: 'id' })
    templates.createIndex('by_title', 'title')
    templates.createIndex('by_updatedAt', 'updatedAt')
  }

  if (!db.objectStoreNames.contains(STORES.ROUTINE_LOGS)) {
    const logs = db.createObjectStore(STORES.ROUTINE_LOGS, { keyPath: 'id' })
    logs.createIndex('by_date', 'date')
    logs.createIndex('by_templateId', 'templateId')
    logs.createIndex('by_templateId_date', ['templateId', 'date'])
  }
}
