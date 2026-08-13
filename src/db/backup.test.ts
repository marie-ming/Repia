import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportBackup, importBackup, resetAllData } from './backup.ts'
import { membersRepo } from './repositories/members.ts'
import { exercisesRepo } from './repositories/exercises.ts'
import { sessionsRepo } from './repositories/sessions.ts'
import { appConfigRepo } from './repositories/appConfig.ts'
import { routineLogsRepo } from './repositories/routineLogs.ts'
import { routineTemplatesRepo } from './repositories/routineTemplates.ts'

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

// exportBackup은 값을 반환하지 않고 Blob 다운로드를 트리거하므로,
// createObjectURL을 가로채 내보낸 JSON을 꺼낸다.
async function captureExport(opts?: { includesPhotos?: boolean }): Promise<string> {
  let captured: Blob | null = null
  const createSpy = vi
    .spyOn(URL, 'createObjectURL')
    .mockImplementation((b: Blob | MediaSource) => {
      captured = b as Blob
      return 'blob:mock'
    })
  const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  // jsdom에서 앵커 클릭은 미구현 네비게이션 경고를 내므로 막는다
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

  await exportBackup(opts)

  createSpy.mockRestore()
  revokeSpy.mockRestore()
  clickSpy.mockRestore()
  if (!captured) throw new Error('내보낸 Blob을 잡지 못했습니다')
  return await (captured as Blob).text()
}

describe('exportBackup ↔ importBackup 왕복', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // 백업/복원은 사용자의 유일한 데이터 안전망이라, 신규 필드가 조용히 유실되지 않는지 잠가둔다
  async function seedAll() {
    const ex = await exercisesRepo.create({ name: '어시스트 풀업', assisted: true })
    const plain = await exercisesRepo.create({ name: '벤치프레스' })
    await membersRepo.create({ name: '회원1' })
    await appConfigRepo.setMode('personal')
    await routineLogsRepo.create({
      title: '가슴 데이',
      date: '2026-06-10',
      status: 'completed',
      exercises: [
        { exerciseId: plain.id, sets: [{ weight: 60, reps: 10 }] },
        { exerciseId: ex.id, sets: [{ weight: 30, reps: 8 }], groupId: 'grp_1' },
        { exerciseId: plain.id, sets: [{ weight: 20, reps: 12 }], groupId: 'grp_1' },
      ],
    })
    await routineTemplatesRepo.create({
      title: '슈퍼세트 루틴',
      exercises: [
        { exerciseId: ex.id, sets: [{ weight: 30, reps: 8 }], groupId: 'grp_t' },
        { exerciseId: plain.id, sets: [{ weight: 20, reps: 12 }], groupId: 'grp_t' },
      ],
    })
    return { ex, plain }
  }

  it('내보낸 뒤 초기화하고 복원하면 슈퍼세트(groupId)와 보조 무게(assisted)가 살아남는다', async () => {
    await seedAll()
    const json = await captureExport()

    await resetAllData()
    expect(await exercisesRepo.findAll()).toEqual([])

    const result = await importBackup(new File([json], 'b.json', { type: 'application/json' }))
    expect(result.success).toBe(true)

    const assisted = (await exercisesRepo.findAll()).find((e) => e.name === '어시스트 풀업')
    expect(assisted?.assisted).toBe(true)

    const log = (await routineLogsRepo.findAll())[0]
    expect(log.exercises.map((e) => e.groupId)).toEqual([undefined, 'grp_1', 'grp_1'])

    const tpl = (await routineTemplatesRepo.findAll())[0]
    expect(tpl.exercises.map((e) => e.groupId)).toEqual(['grp_t', 'grp_t'])
  })

  it('모든 스토어와 모드 설정이 왕복에서 보존된다', async () => {
    await seedAll()
    const json = await captureExport()
    await resetAllData()
    await importBackup(new File([json], 'b.json', { type: 'application/json' }))

    expect(await exercisesRepo.findAll()).toHaveLength(2)
    expect(await membersRepo.findAll()).toHaveLength(1)
    expect(await routineLogsRepo.findAll()).toHaveLength(1)
    expect(await routineTemplatesRepo.findAll()).toHaveLength(1)
    expect(await appConfigRepo.getMode()).toBe('personal')
  })

  it('내보내면 마지막 백업 시각이 기록된다 (백업 안내 판단용)', async () => {
    await exercisesRepo.create({ name: '운동' })
    expect(await appConfigRepo.getLastBackupAt()).toBeNull()

    const before = Date.now()
    await captureExport()

    const at = await appConfigRepo.getLastBackupAt()
    expect(at).not.toBeNull()
    expect(Date.parse(at as string)).toBeGreaterThanOrEqual(before)
  })

  it('includesPhotos: false면 사진만 빠지고 나머지 필드는 유지된다', async () => {
    await exercisesRepo.create({
      name: '사진운동',
      assisted: true,
      photos: ['data:image/jpeg;base64,xxx'],
    })
    const json = await captureExport({ includesPhotos: false })

    const parsed = JSON.parse(json)
    expect(parsed.includesPhotos).toBe(false)
    const ex = parsed.data.exercises.find((e: { name: string }) => e.name === '사진운동')
    expect(ex.photos).toEqual([])
    expect(ex.assisted).toBe(true) // 사진만 지우고 나머지는 그대로

    // 원본 DB는 건드리지 않는다
    const inDb = (await exercisesRepo.findAll())[0]
    expect(inDb.photos).toEqual(['data:image/jpeg;base64,xxx'])
  })
})

// toISOString()은 UTC라 한국 오전 9시 전에 백업하면 파일명이 어제로 찍혔다.
// 앱의 다른 날짜는 전부 로컬 기준이므로 파일명만 어긋나 있었다.
// @types/node를 넣지 않으려고 여기서만 최소한으로 선언한다.
// 로컬(Asia/Seoul)과 CI(UTC)에서 같은 결과가 나와야 의미 있는 테스트라 TZ를 고정한다.
declare const process: { env: Record<string, string | undefined> }

describe('백업 파일 이름', () => {
  const origTZ = process.env.TZ

  afterEach(() => {
    process.env.TZ = origTZ
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  async function captureFilename(): Promise<string> {
    let filename = ''
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      filename = this.download
    })
    await exportBackup()
    return filename
  }

  it('UTC로는 날짜가 넘어가지 않은 시각에도 로컬 날짜를 쓴다', async () => {
    process.env.TZ = 'Asia/Seoul'
    // 서울 8/13 오전 8시 30분 = UTC 8/12 23시 30분
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-12T23:30:00.000Z'))

    expect(await captureFilename()).toBe('repia-backup-2026-08-13.json')
  })

  it('로컬과 UTC가 같은 시각에는 그대로', async () => {
    process.env.TZ = 'Asia/Seoul'
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-13T05:00:00.000Z'))

    expect(await captureFilename()).toBe('repia-backup-2026-08-13.json')
  })
})

