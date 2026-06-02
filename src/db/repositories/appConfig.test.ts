import { describe, expect, it } from 'vitest'
import { appConfigRepo } from './appConfig.ts'

describe('appConfigRepo (fake-indexeddb)', () => {
  it('초기 상태: getMode는 null', async () => {
    expect(await appConfigRepo.getMode()).toBeNull()
  })

  it('setMode → getMode 왕복', async () => {
    await appConfigRepo.setMode('trainer')
    expect(await appConfigRepo.getMode()).toBe('trainer')
    await appConfigRepo.setMode('personal')
    expect(await appConfigRepo.getMode()).toBe('personal')
  })

  it('set/get 임의 키', async () => {
    await appConfigRepo.set('installedAt', '2026-01-01')
    expect(await appConfigRepo.get<string>('installedAt')).toBe('2026-01-01')
  })

  it('없는 키는 null', async () => {
    expect(await appConfigRepo.get('nothing')).toBeNull()
  })

  it('객체/숫자도 저장 가능', async () => {
    await appConfigRepo.set('schemaVersion', 3)
    await appConfigRepo.set('user', { id: 1, name: 'x' })
    expect(await appConfigRepo.get<number>('schemaVersion')).toBe(3)
    expect(await appConfigRepo.get('user')).toEqual({ id: 1, name: 'x' })
  })

  it('getAll: 모든 항목 반환', async () => {
    await appConfigRepo.set('a', 1)
    await appConfigRepo.set('b', 2)
    const all = await appConfigRepo.getAll()
    expect(all).toHaveLength(2)
  })
})
