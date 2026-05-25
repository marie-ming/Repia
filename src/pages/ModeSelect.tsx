import type { Mode } from '../db/types.ts'

interface ModeSelectProps {
  onSelect: (mode: Mode) => void
}

export function ModeSelect({ onSelect }: ModeSelectProps) {
  return (
    <div className="mode-select">
      <header className="mode-select__header">
        <h1 className="mode-select__logo">Repia</h1>
        <p className="mode-select__tagline">어떻게 사용하시겠어요?</p>
      </header>

      <div className="mode-select__options">
        <button type="button" className="mode-card" onClick={() => onSelect('trainer')}>
          <span className="mode-card__emoji">🧑‍🏫</span>
          <span className="mode-card__title">트레이너 모드</span>
          <span className="mode-card__desc">회원을 관리하고 수업을 기록해요</span>
        </button>

        <button type="button" className="mode-card" onClick={() => onSelect('personal')}>
          <span className="mode-card__emoji">💪</span>
          <span className="mode-card__title">개인 모드</span>
          <span className="mode-card__desc">나만의 루틴과 운동을 기록해요</span>
        </button>
      </div>

      <p className="mode-select__note">처음 한 번만 선택하면 됩니다.</p>
    </div>
  )
}
