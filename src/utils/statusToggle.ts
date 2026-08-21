// 「예정」으로 만든 기록을 「완료」로 바꾸는 건 운동할 때마다 하는 일인데, 그동안
// `더보기 → 수정 → 상태 → 저장`으로 네 번 눌러야 했다. 통계(최고 기록·지난 기록 비교·
// 최근 기록·추이 그래프·부위 요약)가 전부 완료된 것만 세므로, 이걸 잊으면 방금 한
// 운동이 어디에도 나타나지 않는다.
//
// 기록과 수업이 완료 앞 상태의 이름만 다르므로(예정 / 예약) 규칙을 여기서 공유한다.
// 「취소」는 넣지 않는다 — 흔한 동작이 아니고 수정 화면에 그대로 있다.

export interface StatusToggle<T extends string> {
  next: T
  label: string // 메뉴에 보일 문구
  done: string // 바꾼 뒤 토스트
  // 메뉴 항목 색. 바뀔 상태의 배지와 같은 색을 써서 누르기 전에 결과가 읽히게 한다.
  // 수업의 「예약」도 기록의 「예정」과 같은 파란색 배지이므로 하나로 묶는다.
  tone: 'completed' | 'planned'
}

export function statusToggle<T extends string>(
  current: T,
  completed: T,
  back: T,
  backLabel: string,
): StatusToggle<T> {
  if (current === completed) {
    return {
      next: back,
      label: `${backLabel}으로 되돌리기`,
      done: `${backLabel}으로 되돌렸습니다`,
      tone: 'planned',
    }
  }
  return {
    next: completed,
    label: '완료로 표시',
    done: '완료로 표시했습니다',
    tone: 'completed',
  }
}
