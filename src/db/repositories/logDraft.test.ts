import { describe, expect, it } from 'vitest'
import {
  DRAFT_EXPIRE_DAYS,
  isDraftExpired,
  isDraftFormShape,
  isDraftWorthKeeping,
  logDraftRepo,
  type LogDraftForm,
} from './logDraft.ts'
import { appConfigRepo } from './appConfig.ts'

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

describe('isDraftFormShape', () => {
  it('정상 폼은 통과', () => {
    expect(isDraftFormShape(form())).toBe(true)
    expect(
      isDraftFormShape(form({ exercises: [{ exerciseId: 'e1', sets: [{ weight: 60, reps: 10 }] }] })),
    ).toBe(true)
  })

  it('폼이 아예 아니면 거부', () => {
    expect(isDraftFormShape(null)).toBe(false)
    expect(isDraftFormShape(undefined)).toBe(false)
    expect(isDraftFormShape('문자열')).toBe(false)
    expect(isDraftFormShape(42)).toBe(false)
  })

  // 읽는 쪽에서 .length / .trim() / .map()을 부르는 필드들
  it('예외를 일으킬 필드가 빠지면 거부', () => {
    const { exercises: _ex, ...noExercises } = form()
    expect(isDraftFormShape(noExercises)).toBe(false)

    const { title: _t, ...noTitle } = form()
    expect(isDraftFormShape(noTitle)).toBe(false)

    const { memo: _m, ...noMemo } = form()
    expect(isDraftFormShape(noMemo)).toBe(false)
  })

  it('타입이 어긋나면 거부', () => {
    expect(isDraftFormShape(form({ exercises: '운동' as never }))).toBe(false)
    expect(isDraftFormShape(form({ title: 3 as never }))).toBe(false)
    expect(isDraftFormShape(form({ templateId: 7 as never }))).toBe(false)
  })

  it('운동 항목의 sets가 배열이 아니면 거부', () => {
    expect(isDraftFormShape(form({ exercises: [{ exerciseId: 'e1' }] as never }))).toBe(false)
    expect(
      isDraftFormShape(form({ exercises: [{ exerciseId: 'e1', sets: null }] as never })),
    ).toBe(false)
    expect(isDraftFormShape(form({ exercises: [null] as never }))).toBe(false)
  })

  it('templateId는 null이어도 된다', () => {
    expect(isDraftFormShape(form({ templateId: null }))).toBe(true)
    expect(isDraftFormShape(form({ templateId: 'tpl-1' }))).toBe(true)
  })
})

// 백업 복원은 appConfig 행을 파일에 있는 그대로 넣는다. 손상된 초안이 들어오면
// 읽는 쪽에서 예외가 나고, 기록 추가 화면이 초안을 지울 방법도 없이 멈춘다.
describe('망가진 초안 방어', () => {
  it('모양이 어긋난 초안은 없는 것으로 보고 지운다', async () => {
    await appConfigRepo.set('logDraft', {
      savedAt: new Date().toISOString(),
      form: { title: '망가짐' }, // exercises/memo 없음
    })
    expect(await logDraftRepo.get()).toBeNull()
    // 다시 읽어도 없다 (정리까지 됨)
    expect(await appConfigRepo.get('logDraft')).toBeNull()
  })

  it('예외를 던지지 않는다', async () => {
    await appConfigRepo.set('logDraft', { savedAt: daysAgo(1), form: { exercises: null } })
    await expect(logDraftRepo.get()).resolves.toBeNull()
  })

  it('form 자체가 없으면 조용히 없는 것으로 본다', async () => {
    await appConfigRepo.set('logDraft', { savedAt: daysAgo(1) })
    await expect(logDraftRepo.get()).resolves.toBeNull()
  })
})
