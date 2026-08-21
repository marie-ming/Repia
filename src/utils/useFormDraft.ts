import { useCallback, useEffect, useRef, useState } from 'react'
import type { DraftRepo, FormDraft } from '../db/repositories/formDraft.ts'

// 초안 배선(디바운스 저장 · 백그라운드 저장 · 복구 묻기)을 폼마다 복붙하지 않도록 모았다.
// 원래 기록 작성 화면에만 있던 코드다.

const DEBOUNCE_MS = 500

interface Args<F> {
  repo: DraftRepo<F>
  // 신규 작성일 때만 초안을 남긴다. 수정은 이미 저장된 원본이 있어 무엇을 보여줄지
  // 애매해지므로 「변경사항이 사라집니다」 경고를 그대로 쓴다.
  enabled: boolean
  loaded: boolean
  form: F
  isDirty: boolean
}

export interface FormDraftControl<F> {
  pending: FormDraft<F> | null
  // load() 안에서 부른다. 화면이 뜨는 순간 물어보게 하려면 loaded보다 먼저여야 한다.
  checkPending: () => Promise<void>
  // 「이어쓰기」 — 초안 내용을 돌려주고 묻기를 끝낸다
  resume: () => F | null
  // 「새로 시작」 — 초안을 지우고 묻기를 끝낸다
  discard: () => void
  // 나가기 직전처럼 디바운스를 기다릴 수 없을 때
  saveNow: () => Promise<void>
  clear: () => Promise<void>
}

export function useFormDraft<F>({
  repo,
  enabled,
  loaded,
  form,
  isDirty,
}: Args<F>): FormDraftControl<F> {
  const [pending, setPending] = useState<FormDraft<F> | null>(null)

  // 최신 값을 이벤트 핸들러에서 읽기 위한 창구
  const formRef = useRef(form)
  formRef.current = form
  const dirtyRef = useRef(isDirty)
  dirtyRef.current = isDirty

  // 매 입력마다 쓰지 않도록 잠깐 모아서 저장.
  //
  // 손대지 않았으면 초안을 만들지 않는다 — 루틴으로 시작했다가 그냥 나간 경우
  // 프리필된 내용이 초안으로 남아 다음에 뜬금없이 물어보는 걸 막는다.
  //
  // pending 조건은 이중 안전장치다. 복구를 묻는 다이얼로그가 떠 있는 동안에는
  // 폼을 건드릴 수 없어(모달) isDirty가 false로 남으므로 지금은 도달하지 않는다.
  // 그래도 남겨둔다 — 이게 없으면 「빈 폼이 저장된 초안을 지운다」는 사고가
  // 다이얼로그 동작 하나에만 매달리게 된다.
  useEffect(() => {
    if (!enabled || !loaded || pending || !isDirty) return
    const t = setTimeout(() => {
      repo.save(form).catch(() => {
        /* 초안 저장 실패는 사용자를 막을 일이 아니라 조용히 넘긴다 */
      })
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [repo, form, enabled, loaded, pending, isDirty])

  // 디바운스만 두면 마지막 몇 백 ms의 입력이 날아간다. 정작 이 기능이 막으려는 상황
  // (전화가 와서 앱이 백그라운드로 가거나 그대로 종료)이 바로 그 순간에 일어난다.
  useEffect(() => {
    if (!enabled || !loaded || pending) return
    const flush = () => {
      if (!dirtyRef.current) return
      repo.save(formRef.current).catch(() => {})
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [repo, enabled, loaded, pending])

  const checkPending = useCallback(async () => {
    if (!enabled) return
    const draft = await repo.get()
    if (draft) setPending(draft)
  }, [repo, enabled])

  const resume = useCallback(() => {
    const form = pending?.form ?? null
    setPending(null)
    return form
  }, [pending])

  const discard = useCallback(() => {
    setPending(null)
    repo.clear().catch(() => {})
  }, [repo])

  const saveNow = useCallback(async () => {
    await repo.save(formRef.current).catch(() => {})
  }, [repo])

  const clear = useCallback(async () => {
    await repo.clear().catch(() => {})
  }, [repo])

  return { pending, checkPending, resume, discard, saveNow, clear }
}
