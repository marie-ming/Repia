import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

// 목록 화면의 검색·필터 상태를 URL 쿼리에 담는다.
// useState로 들고 있으면 상세로 갔다 뒤로 왔을 때 화면이 다시 마운트되며 필터가 풀린다.
// URL에 있으면 뒤로가기가 그대로 복원해준다.
export function useFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

  // 기본값이면 쿼리에서 빼서 URL을 깨끗하게 유지한다
  const get = useCallback(
    <T extends string>(key: string, fallback: T, allowed?: readonly T[]): T => {
      const raw = searchParams.get(key)
      if (raw === null) return fallback
      if (allowed && !allowed.includes(raw as T)) return fallback // 손댄 URL 방어
      return raw as T
    },
    [searchParams],
  )

  const set = useCallback(
    (key: string, value: string, defaultValue: string) => {
      const next = new URLSearchParams(searchParams)
      if (value === defaultValue) next.delete(key)
      else next.set(key, value)
      // replace: 타이핑·칩 클릭마다 히스토리가 쌓여 뒤로가기가 한 칸씩 되감기는 걸 막는다
      // preventScrollReset: 필터만 바꿨는데 목록이 맨 위로 튀지 않게
      setSearchParams(next, {
        replace: true,
        preventScrollReset: true,
        state: location.state,
      })
    },
    [searchParams, setSearchParams, location.state],
  )

  return { get, set }
}
