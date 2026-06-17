import { useNavigate } from 'react-router-dom'
import { ChevronRightIcon } from '../components/icons.tsx'

interface MenuItem {
  label: string
  desc?: string
  to: string
}

const ITEMS: MenuItem[] = [
  { label: '데이터 관리', desc: '백업 · 복원', to: '/settings/data' },
  { label: '업데이트 내역', desc: '버전별 변경 사항', to: '/settings/updates' },
]

export function SettingsPage() {
  const navigate = useNavigate()
  return (
    <div className="page page--settings">
      <header className="page__header">
        <h1 className="page__title">설정</h1>
      </header>

      <ul className="menu-list">
        {ITEMS.map((it) => (
          <li key={it.to}>
            <button type="button" className="menu-list__item" onClick={() => navigate(it.to)}>
              <span className="menu-list__body">
                <span className="menu-list__label">{it.label}</span>
                {it.desc && <span className="menu-list__desc">{it.desc}</span>}
              </span>
              <ChevronRightIcon className="menu-list__chevron" />
            </button>
          </li>
        ))}
      </ul>

      <p className="settings__version">v{__APP_VERSION__}</p>
    </div>
  )
}
