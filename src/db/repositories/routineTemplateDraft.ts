import type { ExerciseCategory, RoutineExercise } from '../types.ts'
import { isRoutineItems, makeDraftRepo, type FormDraft } from './formDraft.ts'

// 루틴 만들기 화면의 초안. 운동 여러 개에 세트까지 짜야 해서 잃으면 타격이 크다.

export interface RoutineTemplateDraftForm {
  title: string
  categories: ExerciseCategory[]
  exercises: RoutineExercise[]
  memo: string
}

export type RoutineTemplateDraft = FormDraft<RoutineTemplateDraftForm>

export function isTemplateDraftWorthKeeping(form: RoutineTemplateDraftForm): boolean {
  return (
    form.title.trim() !== '' ||
    form.exercises.length > 0 ||
    form.categories.length > 0 ||
    form.memo.trim() !== ''
  )
}

export function isTemplateDraftShape(form: unknown): form is RoutineTemplateDraftForm {
  if (!form || typeof form !== 'object') return false
  const f = form as Record<string, unknown>
  return (
    typeof f.title === 'string' &&
    typeof f.memo === 'string' &&
    Array.isArray(f.categories) &&
    f.categories.every((c) => typeof c === 'string') &&
    isRoutineItems(f.exercises)
  )
}

export const routineTemplateDraftRepo = makeDraftRepo<RoutineTemplateDraftForm>({
  key: 'routineTemplateDraft',
  isWorthKeeping: isTemplateDraftWorthKeeping,
  isShape: isTemplateDraftShape,
})
