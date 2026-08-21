import { appConfigRepo } from './appConfig.ts'

// 작성 중이던 내용을 잃지 않도록 임시 보관한다.
// 기록에만 있던 장치를 수업·루틴에도 쓰려고 폼 종류에 상관없는 형태로 뽑았다.
//
// 저장 위치는 appConfig(키-값). 초안 때문에 IndexedDB 버전을 올릴 이유가 없다.

// 오래된 초안은 사용자도 기억하지 못한다. 그 이상 묵으면 조용히 버린다.
export const DRAFT_EXPIRE_DAYS = 7

export interface FormDraft<F> {
  savedAt: string // ISO
  form: F
}

export interface DraftSpec<F> {
  key: string
  // 아무것도 안 적은 폼은 초안이 아니다 (화면만 열었다 나간 경우)
  isWorthKeeping: (form: F) => boolean
  // 초안이 항상 이 모양이라고 믿을 수 없다. 백업 복원은 appConfig 행을 파일에 있는
  // 그대로 넣기 때문에, 손상됐거나 다른 버전이 만든 초안이 들어올 수 있다.
  // 모양이 어긋나면 읽는 쪽에서 예외가 나고, 그러면 그 화면이 초안을 지울 방법도
  // 없는 채로 멈춰버린다.
  isShape: (form: unknown) => form is F
}

// form까지 담은 초안을 그대로 넘길 수 있게 열어둔다
export function isDraftExpired(
  draft: { savedAt: string; form?: unknown },
  now: Date = new Date(),
): boolean {
  const savedAt = new Date(draft.savedAt).getTime()
  if (Number.isNaN(savedAt)) return true // 깨진 값은 버린다
  return now.getTime() - savedAt >= DRAFT_EXPIRE_DAYS * 86_400_000
}

export interface DraftRepo<F> {
  get(now?: Date): Promise<FormDraft<F> | null>
  save(form: F): Promise<void>
  clear(): Promise<void>
}

export function makeDraftRepo<F>(spec: DraftSpec<F>): DraftRepo<F> {
  return {
    // 만료됐거나 내용이 없거나 모양이 어긋나면 없는 것으로 치고 정리까지 한다
    async get(now: Date = new Date()): Promise<FormDraft<F> | null> {
      const draft = await appConfigRepo.get<FormDraft<F>>(spec.key)
      if (!draft?.form) return null
      if (!spec.isShape(draft.form)) {
        await this.clear()
        return null
      }
      if (isDraftExpired(draft, now) || !spec.isWorthKeeping(draft.form)) {
        await this.clear()
        return null
      }
      return draft
    },

    async save(form: F): Promise<void> {
      if (!spec.isWorthKeeping(form)) {
        await this.clear()
        return
      }
      await appConfigRepo.set(spec.key, { savedAt: new Date().toISOString(), form })
    },

    async clear(): Promise<void> {
      await appConfigRepo.set(spec.key, null)
    },
  }
}

// 여러 폼이 공통으로 쓰는 모양 검사 조각
export function isStringField(o: Record<string, unknown>, key: string): boolean {
  return typeof o[key] === 'string'
}

export function isRoutineItems(v: unknown): boolean {
  return (
    Array.isArray(v) &&
    v.every(
      (r) =>
        !!r &&
        typeof r === 'object' &&
        typeof (r as Record<string, unknown>).exerciseId === 'string' &&
        Array.isArray((r as Record<string, unknown>).sets),
    )
  )
}
