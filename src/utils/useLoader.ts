import { useCallback, useEffect, useState } from 'react'

// 페이지들이 `useEffect(() => { load() }, [load])`로 데이터를 읽는데, 여기서 예외가 나면
// 로딩 플래그를 세우는 마지막 줄에 도달하지 못해 화면이 「불러오는 중...」에서 영영 멈춘다.
// 저장·삭제 실패는 토스트로 드러내면서 읽기 실패만 조용한 것도 앞뒤가 맞지 않는다.
//
// 에러 바운더리로는 이걸 잡을 수 없다 — 렌더가 아니라 비동기에서 거부된 프라미스라
// 바운더리를 그냥 지나친다. 그래서 호출부에서 직접 받아낸다.
export function useLoader(load: () => Promise<void>) {
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setError(null)
    load().catch((e) => {
      if (!alive) return
      setError(e instanceof Error ? e : new Error(String(e)))
    })
    return () => {
      alive = false
    }
  }, [load, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return { error, retry }
}
