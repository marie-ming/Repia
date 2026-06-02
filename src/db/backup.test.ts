import { describe, expect, it } from 'vitest'
import { importBackup, resetAllData } from './backup.ts'
import { membersRepo } from './repositories/members.ts'
import { exercisesRepo } from './repositories/exercises.ts'
import { sessionsRepo } from './repositories/sessions.ts'
import { appConfigRepo } from './repositories/appConfig.ts'

function makeBackup(overrides: Partial<Record<string, unknown>> = {}): string {
  return JSON.stringify({
    app: 'repia',
    schemaVersion: 1,
    exportedAt: '2026-06-01T00:00:00.000Z',
    includesPhotos: true,
    data: {
      appConfig: [{ key: 'mode', value: 'trainer' }],
      members: [
        {
          id: 'mem_1',
          name: '복원된 회원',
          phone: '010-1111-2222',
          status: 'active',
          memo: '',
          registeredAt: '2026-01-01',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      exercises: [],
      sessions: [],
      routineTemplates: [],
      routineLogs: [],
      ...overrides,
    },
  })
}

function asFile(content: string): File {
  return new File([content], 'backup.json', { type: 'application/json' })
}

describe('importBackup', () => {
  it('정상 백업 파일을 복원', async () => {
    const result = await importBackup(asFile(makeBackup()))
    expect(result.success).toBe(true)
    expect(result.includesPhotos).toBe(true)

    const members = await membersRepo.findAll()
    expect(members).toHaveLength(1)
    expect(members[0].name).toBe('복원된 회원')

    expect(await appConfigRepo.getMode()).toBe('trainer')
  })

  it('기존 데이터를 덮어쓰기 (clear 후 put)', async () => {
    // 기존 데이터 생성
    await membersRepo.create({ name: '기존' })
    expect(await membersRepo.findAll()).toHaveLength(1)

    await importBackup(asFile(makeBackup()))
    const members = await membersRepo.findAll()
    expect(members).toHaveLength(1)
    expect(members[0].name).toBe('복원된 회원')
  })

  it('잘못된 JSON: 사용자 친화 에러', async () => {
    await expect(importBackup(asFile('not json'))).rejects.toThrow(/JSON/)
  })

  it('app !== "repia"면 에러', async () => {
    const bad = JSON.stringify({ app: 'other', schemaVersion: 1, data: {} })
    await expect(importBackup(asFile(bad))).rejects.toThrow(/Repia 백업/)
  })

  it('schemaVersion 불일치면 에러', async () => {
    const bad = JSON.stringify({
      app: 'repia',
      schemaVersion: 99,
      exportedAt: '',
      includesPhotos: true,
      data: {},
    })
    await expect(importBackup(asFile(bad))).rejects.toThrow(/스키마 버전/)
  })

  it('exercises 복원 + 사진 보존', async () => {
    const backup = makeBackup({
      exercises: [
        {
          id: 'ex_1',
          name: '데드리프트',
          categories: ['back'],
          equipment: 'barbell',
          grip: '',
          photos: ['data:image/jpeg;base64,xxx'],
          description: '',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    })
    await importBackup(asFile(backup))
    const list = await exercisesRepo.findAll()
    expect(list).toHaveLength(1)
    expect(list[0].photos).toEqual(['data:image/jpeg;base64,xxx'])
  })
})

describe('resetAllData', () => {
  it('모든 스토어를 비움', async () => {
    await membersRepo.create({ name: '회원' })
    await exercisesRepo.create({ name: '운동' })
    await sessionsRepo.create({
      memberId: 'm1',
      memberNameSnapshot: 'x',
      date: '2026-06-01',
    })
    await appConfigRepo.setMode('trainer')

    await resetAllData()

    expect(await membersRepo.findAll()).toEqual([])
    expect(await exercisesRepo.findAll()).toEqual([])
    expect(await sessionsRepo.findAll()).toEqual([])
    expect(await appConfigRepo.getMode()).toBeNull()
  })
})
