import type { RoutineExercise, SessionStatus } from '../types.ts'
import { isRoutineItems, makeDraftRepo, type FormDraft } from './formDraft.ts'

// 수업 추가 화면의 초안. 회원·시간에 루틴까지 짜다 앱이 닫히면 다시 짜야 했다.

export interface SessionDraftForm {
  memberId: string | null
  date: string
  time: string
  status: SessionStatus
  routine: RoutineExercise[]
  memo: string
}

export type SessionDraft = FormDraft<SessionDraftForm>

// 회원만 골라둔 것도 초안으로 남길 값이 있다 — 수업은 회원 선택이 첫 단계다
export function isSessionDraftWorthKeeping(form: SessionDraftForm): boolean {
  return form.memberId !== null || form.routine.length > 0 || form.memo.trim() !== ''
}

export function isSessionDraftShape(form: unknown): form is SessionDraftForm {
  if (!form || typeof form !== 'object') return false
  const f = form as Record<string, unknown>
  return (
    (f.memberId === null || typeof f.memberId === 'string') &&
    typeof f.date === 'string' &&
    typeof f.time === 'string' &&
    typeof f.status === 'string' &&
    typeof f.memo === 'string' &&
    isRoutineItems(f.routine)
  )
}

export const sessionDraftRepo = makeDraftRepo<SessionDraftForm>({
  key: 'sessionDraft',
  isWorthKeeping: isSessionDraftWorthKeeping,
  isShape: isSessionDraftShape,
})
