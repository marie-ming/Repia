import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { _resetDBForTests } from './db/index.ts'

beforeEach(() => {
  // 각 테스트마다 깨끗한 IndexedDB 시작
  globalThis.indexedDB = new IDBFactory()
  _resetDBForTests()
})

afterEach(() => {
  cleanup()
})
