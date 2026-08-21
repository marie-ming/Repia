import { describe, expect, it } from 'vitest'
import { statusToggle } from './statusToggle.ts'

describe('statusToggle — 기록 (예정 / 완료)', () => {
  it('예정이면 완료로', () => {
    const a = statusToggle('planned', 'completed', 'planned', '예정')
    expect(a.next).toBe('completed')
    expect(a.label).toBe('완료로 표시')
    expect(a.done).toBe('완료로 표시했습니다')
    expect(a.tone).toBe('completed')
  })

  it('완료면 예정으로 되돌리기', () => {
    const a = statusToggle('completed', 'completed', 'planned', '예정')
    expect(a.next).toBe('planned')
    expect(a.label).toBe('예정으로 되돌리기')
    expect(a.done).toBe('예정으로 되돌렸습니다')
    expect(a.tone).toBe('planned')
  })

  // 취소해둔 기록을 실제로 했을 때 바로 완료로 넘어가야 한다
  it('취소면 완료로 (되돌리기가 아니다)', () => {
    const a = statusToggle('cancelled', 'completed', 'planned', '예정')
    expect(a.next).toBe('completed')
    expect(a.label).toBe('완료로 표시')
  })
})

describe('statusToggle — 수업 (예약 / 완료)', () => {
  it('예약이면 완료로', () => {
    expect(statusToggle('reserved', 'completed', 'reserved', '예약').next).toBe('completed')
  })

  // 기록은 「예정」, 수업은 「예약」 — 문구가 상태 이름을 따라간다
  it('완료면 예약으로 되돌리기', () => {
    const a = statusToggle('completed', 'completed', 'reserved', '예약')
    expect(a.label).toBe('예약으로 되돌리기')
    expect(a.done).toBe('예약으로 되돌렸습니다')
  })
})

// 메뉴 항목 색은 「누르면 어떤 상태가 되는지」를 색으로 먼저 알려주는 용도다
describe('statusToggle — 색(tone)', () => {
  it('완료로 가는 항목은 완료 색', () => {
    expect(statusToggle('planned', 'completed', 'planned', '예정').tone).toBe('completed')
    expect(statusToggle('cancelled', 'completed', 'planned', '예정').tone).toBe('completed')
    expect(statusToggle('reserved', 'completed', 'reserved', '예약').tone).toBe('completed')
  })

  // 수업의 「예약」도 기록의 「예정」과 같은 파란 배지라 색을 하나로 묶는다
  it('되돌리는 항목은 예정/예약 모두 같은 색', () => {
    expect(statusToggle('completed', 'completed', 'planned', '예정').tone).toBe('planned')
    expect(statusToggle('completed', 'completed', 'reserved', '예약').tone).toBe('planned')
  })
})

