import type { RoutineExercise, RoutineLogStatus } from '../types.ts'
import {
  DRAFT_EXPIRE_DAYS,
  isDraftExpired,
  isRoutineItems,
  makeDraftRepo,
  type FormDraft,
} from './formDraft.ts'

// 기록 작성 화면의 초안. 공통 장치는 formDraft.ts에 있다.
// 헬스장에서 세트를 채우다 전화가 오거나 앱이 내려가면 그대로 날아가던 문제.

export { DRAFT_EXPIRE_DAYS, isDraftExpired }

export interface LogDraftForm {
  title: string
  date: string
  time: string
  status: RoutineLogStatus
  exercises: RoutineExercise[]
  memo: string
  templateId: string | null
}

export type LogDraft = FormDraft<LogDraftForm>

export function isDraftWorthKeeping(form: LogDraftForm): boolean {
  return form.exercises.length > 0 || form.title.trim() !== '' || form.memo.trim() !== ''
}

export function isDraftFormShape(form: unknown): form is LogDraftForm {
  if (!form || typeof form !== 'object') return false
  const f = form as Record<string, unknown>
  return (
    typeof f.title === 'string' &&
    typeof f.date === 'string' &&
    typeof f.time === 'string' &&
    typeof f.status === 'string' &&
    typeof f.memo === 'string' &&
    (f.templateId === null || typeof f.templateId === 'string') &&
    isRoutineItems(f.exercises)
  )
}

export const logDraftRepo = makeDraftRepo<LogDraftForm>({
  key: 'logDraft',
  isWorthKeeping: isDraftWorthKeeping,
  isShape: isDraftFormShape,
})
