import { ModeTitleButton } from '../components/ModeTitleButton.tsx'

export function HomePage() {
  return (
    <div className="home-page">
      <div className="home-page__top">
        <ModeTitleButton title="홈" />
      </div>
      <div className="day-sessions">
        <p className="day-sessions__empty">개인 모드 홈은 곧 추가됩니다.</p>
      </div>
    </div>
  )
}
