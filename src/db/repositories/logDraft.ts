import { appConfigRepo } from './appConfig.ts'
import type { RoutineExercise, RoutineLogStatus } from '../types.ts'

// 작성 중이던 기록을 잃지 않도록 임시 보관한다.
// 헬스장에서 세트를 채우다 전화가 오거나 앱이 내려가면 그대로 날아가던 문제.
//
// 저장 위치는 appConfig(키-값). 별도 스토어를 만들면 IndexedDB 버전을 올려야 하는데
// 초안 하나 때문에 마이그레이션을 감수할 이유가 없다.

const KEY = 'logDraft'

// 오래된 초안은 사용자도 기억하지 못한다. 그 이상 묵으면 조용히 버린다.
export const DRAFT_EXPIRE_DAYS = 7

export interface LogDraftForm {
  title: string
  date: string
  time: string
  status: RoutineLogStatus
  exercises: RoutineExercise[]
  memo: string
  templateId: string | null
}

export interface LogDraft {
  savedAt: string // ISO
  form: LogDraftForm
}

// 아무것도 안 적은 폼은 초안이 아니다 (화면만 열었다 나간 경우)
export function isDraftWorthKeeping(form: LogDraftForm): boolean {
  return form.exercises.length > 0 || form.title.trim() !== '' || form.memo.trim() !== ''
}

export function isDraftExpired(draft: LogDraft, now: Date = new Date()): boolean {
  const savedAt = new Date(draft.savedAt).getTime()
  if (Number.isNaN(savedAt)) return true // 깨진 값은 버린다
  return now.getTime() - savedAt >= DRAFT_EXPIRE_DAYS * 86_400_000
}

export const logDraftRepo = {
  // 만료됐거나 내용이 없으면 없는 것으로 치고 정리까지 한다
  async get(now: Date = new Date()): Promise<LogDraft | null> {
    const draft = await appConfigRepo.get<LogDraft>(KEY)
    if (!draft?.form) return null
    if (isDraftExpired(draft, now) || !isDraftWorthKeeping(draft.form)) {
      await this.clear()
      return null
    }
    return draft
  },

  async save(form: LogDraftForm): Promise<void> {
    if (!isDraftWorthKeeping(form)) {
      await this.clear()
      return
    }
    await appConfigRepo.set(KEY, { savedAt: new Date().toISOString(), form })
  },

  async clear(): Promise<void> {
    await appConfigRepo.set(KEY, null)
  },
}
