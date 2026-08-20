import { describe, expect, it } from 'vitest'
import {
  isSessionDraftShape,
  isSessionDraftWorthKeeping,
  sessionDraftRepo,
  type SessionDraftForm,
} from './sessionDraft.ts'
import {
  isTemplateDraftShape,
  isTemplateDraftWorthKeeping,
  routineTemplateDraftRepo,
  type RoutineTemplateDraftForm,
} from './routineTemplateDraft.ts'

const session = (over: Partial<SessionDraftForm> = {}): SessionDraftForm => ({
  memberId: null,
  date: '2026-08-20',
  time: '10:00',
  status: 'reserved',
  routine: [],
  memo: '',
  ...over,
})

const template = (over: Partial<RoutineTemplateDraftForm> = {}): RoutineTemplateDraftForm => ({
  title: '',
  categories: [],
  exercises: [],
  memo: '',
  ...over,
})

describe('수업 초안', () => {
  // 수업은 회원 선택이 첫 단계라, 회원만 골라둔 것도 남길 값이 있다
  it('회원만 골라도 남긴다', () => {
    expect(isSessionDraftWorthKeeping(session({ memberId: 'm1' }))).toBe(true)
  })

  it('아무것도 안 건드리면 남기지 않는다 (날짜·시간은 기본값)', () => {
    expect(isSessionDraftWorthKeeping(session())).toBe(false)
  })

  it('운동이나 메모가 있으면 남긴다', () => {
    expect(isSessionDraftWorthKeeping(session({ routine: [{ exerciseId: 'e', sets: [] }] }))).toBe(
      true,
    )
    expect(isSessionDraftWorthKeeping(session({ memo: '메모' }))).toBe(true)
  })

  it('모양 검사', () => {
    expect(isSessionDraftShape(session())).toBe(true)
    expect(isSessionDraftShape(session({ memberId: 'm1' }))).toBe(true)
    expect(isSessionDraftShape(null)).toBe(false)
    expect(isSessionDraftShape({ ...session(), routine: undefined })).toBe(false)
    expect(isSessionDraftShape({ ...session(), memo: 3 })).toBe(false)
    expect(isSessionDraftShape({ ...session(), memberId: 7 })).toBe(false)
  })

  it('저장하고 읽는다', async () => {
    await sessionDraftRepo.save(session({ memberId: 'm1', memo: '어깨 위주' }))
    expect((await sessionDraftRepo.get())?.form.memo).toBe('어깨 위주')
  })
})

describe('루틴 초안', () => {
  it('제목·운동·카테고리·메모 중 하나라도 있으면 남긴다', () => {
    expect(isTemplateDraftWorthKeeping(template({ title: '하체' }))).toBe(true)
    expect(isTemplateDraftWorthKeeping(template({ categories: ['lower'] }))).toBe(true)
    expect(isTemplateDraftWorthKeeping(template({ exercises: [{ exerciseId: 'e', sets: [] }] }))).toBe(
      true,
    )
    expect(isTemplateDraftWorthKeeping(template({ memo: '메모' }))).toBe(true)
    expect(isTemplateDraftWorthKeeping(template())).toBe(false)
  })

  it('모양 검사', () => {
    expect(isTemplateDraftShape(template())).toBe(true)
    expect(isTemplateDraftShape(null)).toBe(false)
    expect(isTemplateDraftShape({ ...template(), exercises: 'x' })).toBe(false)
    expect(isTemplateDraftShape({ ...template(), categories: [1] })).toBe(false)
    expect(isTemplateDraftShape({ ...template(), title: undefined })).toBe(false)
  })

  it('저장하고 읽는다', async () => {
    await routineTemplateDraftRepo.save(template({ title: '하체 루틴' }))
    expect((await routineTemplateDraftRepo.get())?.form.title).toBe('하체 루틴')
  })
})

// 세 폼이 각자 키를 쓰므로 하나를 지워도 나머지가 남아야 한다
describe('폼끼리 섞이지 않는다', () => {
  it('수업 초안과 루틴 초안은 따로 보관된다', async () => {
    await sessionDraftRepo.save(session({ memberId: 'm1' }))
    await routineTemplateDraftRepo.save(template({ title: '루틴' }))

    await sessionDraftRepo.clear()

    expect(await sessionDraftRepo.get()).toBeNull()
    expect((await routineTemplateDraftRepo.get())?.form.title).toBe('루틴')
  })
})
