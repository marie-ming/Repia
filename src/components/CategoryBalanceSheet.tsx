import { BottomSheet } from './BottomSheet.tsx'
import { EXERCISE_CATEGORY_LABELS } from '../constants.ts'
import { BALANCE_DAYS, type BalanceResult } from '../utils/categoryBalance.ts'

interface CategoryBalanceSheetProps {
  open: boolean
  onClose: () => void
  balance: BalanceResult
}

export function CategoryBalanceSheet({ open, onClose, balance }: CategoryBalanceSheetProps) {
  const max = balance.counts[0]?.count ?? 0

  return (
    <BottomSheet open={open} onClose={onClose} title={`최근 ${BALANCE_DAYS / 7}주 부위`}>
      <ul className="balance-list">
        {balance.counts.map((c) => (
          <li key={c.category} className="balance-row">
            <span className="balance-row__name">{EXERCISE_CATEGORY_LABELS[c.category]}</span>
            <span className="balance-row__track">
              <span
                className={
                  c.count > 0 ? 'balance-row__bar' : 'balance-row__bar balance-row__bar--none'
                }
                // 0도 막대가 아주 조금 보여야 "없다"는 게 읽힌다
                style={{ width: max > 0 ? `${Math.max((c.count / max) * 100, 4)}%` : '4%' }}
              />
            </span>
            <span
              className={
                c.count > 0 ? 'balance-row__count' : 'balance-row__count balance-row__count--none'
              }
            >
              {c.count}
            </span>
          </li>
        ))}
      </ul>
    </BottomSheet>
  )
}
