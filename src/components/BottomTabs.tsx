import { NavLink } from 'react-router-dom'
import type { TabItem } from '../navigation.tsx'

interface BottomTabsProps {
  tabs: TabItem[]
}

export function BottomTabs({ tabs }: BottomTabsProps) {
  return (
    <nav className="bottom-tabs">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/'}
          aria-label={tab.label}
          className={({ isActive }) =>
            isActive ? 'bottom-tabs__item bottom-tabs__item--active' : 'bottom-tabs__item'
          }
        >
          {tab.icon}
        </NavLink>
      ))}
    </nav>
  )
}
