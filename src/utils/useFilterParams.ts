import { useCallback, useEffect, useState } from 'react'
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

// 검색어처럼 "타이핑하는" 값은 URL만 바라보면 안 된다.
// URL 갱신이 한 박자 늦어, 빠르게 치면 다음 입력 때 컨트롤드 값이 직전 값으로 되돌아가
// 글자가 씹힌다(예: '데드리' → '리'). 입력값은 로컬 상태로 즉시 반영하고 URL과 양방향으로 맞춘다.
export function useUrlBackedText(key: string): [string, (next: string) => void] {
  const { get, set } = useFilterParams()
  const urlValue = get<string>(key, '')
  const [value, setValue] = useState(urlValue)

  // 뒤로가기 등으로 URL이 바뀌면 입력값도 따라간다 (같은 값이면 React가 알아서 무시)
  useEffect(() => {
    setValue(urlValue)
  }, [urlValue])

  const onChange = useCallback(
    (next: string) => {
      setValue(next)
      set(key, next, '')
    },
    [key, set],
  )

  return [value, onChange]
}
