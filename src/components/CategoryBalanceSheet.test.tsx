import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ExerciseCategory } from '../db/types.ts'
import { CategoryBalanceSheet } from './CategoryBalanceSheet.tsx'
import type { BalanceResult } from '../utils/categoryBalance.ts'

const c = (category: ExerciseCategory, count: number) => ({ category, count })

function renderSheet(balance: BalanceResult, open = true) {
  return render(<CategoryBalanceSheet open={open} onClose={() => {}} balance={balance} />)
}

const widths = () =>
  [...document.querySelectorAll<HTMLElement>('.balance-row__bar')].map((b) => b.style.width)

describe('CategoryBalanceSheet', () => {
  it('닫혀 있으면 아무것도 렌더 안 함', () => {
    const { container } = renderSheet({ total: 1, counts: [c('back', 1)] }, false)
    expect(container).toBeEmptyDOMElement()
  })

  it('제목에 기간이 들어간다', () => {
    renderSheet({ total: 1, counts: [c('back', 1)] })
    expect(screen.getByText('최근 4주 부위')).toBeInTheDocument()
  })

  // 막대 길이는 최다 부위를 100%로 두고 비율로 그린다
  it('가장 많은 부위가 100%, 나머지는 그 비율', () => {
    renderSheet({
      total: 12,
      counts: [c('back', 12), c('chest', 6), c('lower', 3)],
    })
    expect(widths()).toEqual(['100%', '50%', '25%'])
  })

  // 0도 막대가 조금 보여야 "없다"는 게 읽힌다 (선이 아예 없으면 빈 줄로 보인다)
  it('0인 부위도 최소 폭은 남긴다', () => {
    renderSheet({ total: 10, counts: [c('back', 10), c('core', 0)] })
    expect(widths()).toEqual(['100%', '4%'])
  })

  it('비율이 최소 폭보다 작아도 최소 폭을 지킨다', () => {
    renderSheet({ total: 100, counts: [c('back', 100), c('core', 1)] })
    // 1/100 = 1% 지만 4%로 올린다
    expect(widths()).toEqual(['100%', '4%'])
  })

  it('전부 0이면 모두 최소 폭 (0으로 나누지 않는다)', () => {
    renderSheet({ total: 0, counts: [c('back', 0), c('chest', 0)] })
    expect(widths()).toEqual(['4%', '4%'])
    expect(widths().every((w) => w !== 'NaN%')).toBe(true)
  })

  it('0인 부위는 막대와 숫자를 흐리게 구분한다', () => {
    renderSheet({ total: 10, counts: [c('back', 10), c('core', 0)] })
    const bars = document.querySelectorAll('.balance-row__bar')
    expect(bars[0].className).not.toContain('--none')
    expect(bars[1].className).toContain('--none')

    const counts = document.querySelectorAll('.balance-row__count')
    expect(counts[0].className).not.toContain('--none')
    expect(counts[1].className).toContain('--none')
  })

  it('부위 이름과 횟수를 준 순서대로 보여준다', () => {
    renderSheet({ total: 5, counts: [c('back', 4), c('chest', 1)] })
    const rows = [...document.querySelectorAll('.balance-row')].map((r) => r.textContent)
    expect(rows).toEqual(['등4', '가슴1'])
  })

  it('레거시 카테고리도 이름이 나온다', () => {
    renderSheet({ total: 2, counts: [c('arm', 2)] })
    expect(screen.getByText('팔')).toBeInTheDocument()
  })
})
