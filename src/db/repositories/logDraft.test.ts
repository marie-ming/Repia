import { describe, expect, it } from 'vitest'
import {
  DRAFT_EXPIRE_DAYS,
  isDraftExpired,
  isDraftWorthKeeping,
  logDraftRepo,
  type LogDraftForm,
} from './logDraft.ts'

function form(over: Partial<LogDraftForm> = {}): LogDraftForm {
  return {
    title: '',
    date: '2026-08-10',
    time: '09:00',
    status: 'planned',
    exercises: [],
    memo: '',
    templateId: null,
    ...over,
  }
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

describe('isDraftWorthKeeping', () => {
  it('아무것도 안 적었으면 초안이 아니다 (화면만 열었다 나간 경우)', () => {
    expect(isDraftWorthKeeping(form())).toBe(false)
  })

  it('운동·제목·메모 중 하나라도 있으면 초안', () => {
    expect(isDraftWorthKeeping(form({ title: '가슴' }))).toBe(true)
    expect(isDraftWorthKeeping(form({ memo: '컨디션 좋음' }))).toBe(true)
    expect(
      isDraftWorthKeeping(form({ exercises: [{ exerciseId: 'ex_1', sets: [] }] })),
    ).toBe(true)
  })

  it('공백만 있는 제목은 내용으로 치지 않는다', () => {
    expect(isDraftWorthKeeping(form({ title: '   ' }))).toBe(false)
  })
})

describe('isDraftExpired', () => {
  it('기한 전이면 유효', () => {
    expect(isDraftExpired({ savedAt: daysAgo(DRAFT_EXPIRE_DAYS - 1), form: form() })).toBe(false)
  })

  it('기한에 도달하면 만료 (경계 포함)', () => {
    expect(isDraftExpired({ savedAt: daysAgo(DRAFT_EXPIRE_DAYS), form: form() })).toBe(true)
  })

  it('깨진 날짜는 만료로 취급', () => {
    expect(isDraftExpired({ savedAt: 'nope', form: form() })).toBe(true)
  })
})

describe('logDraftRepo', () => {
  it('없으면 null', async () => {
    expect(await logDraftRepo.get()).toBeNull()
  })

  it('저장 후 다시 읽으면 그대로', async () => {
    const f = form({ title: '가슴 데이', exercises: [{ exerciseId: 'ex_1', sets: [] }] })
    await logDraftRepo.save(f)
    const draft = await logDraftRepo.get()
    expect(draft?.form.title).toBe('가슴 데이')
    expect(draft?.savedAt).toBeTruthy()
  })

  it('내용 없는 폼은 저장하지 않고 기존 초안도 지운다', async () => {
    await logDraftRepo.save(form({ title: '작성중' }))
    expect(await logDraftRepo.get()).not.toBeNull()

    await logDraftRepo.save(form()) // 다 지운 상태
    expect(await logDraftRepo.get()).toBeNull()
  })

  it('만료된 초안은 없는 것으로 보고 정리한다', async () => {
    await logDraftRepo.save(form({ title: '오래된' }))
    const future = new Date(Date.now() + (DRAFT_EXPIRE_DAYS + 1) * 86_400_000)
    expect(await logDraftRepo.get(future)).toBeNull()
    // 정리까지 됐는지 (현재 시각으로 다시 읽어도 없음)
    expect(await logDraftRepo.get()).toBeNull()
  })

  it('clear 후에는 없다', async () => {
    await logDraftRepo.save(form({ title: 'x' }))
    await logDraftRepo.clear()
    expect(await logDraftRepo.get()).toBeNull()
  })

  it('초안은 하나만 유지된다 (새로 저장하면 덮어씀)', async () => {
    await logDraftRepo.save(form({ title: '첫번째' }))
    await logDraftRepo.save(form({ title: '두번째' }))
    expect((await logDraftRepo.get())?.form.title).toBe('두번째')
  })
})
