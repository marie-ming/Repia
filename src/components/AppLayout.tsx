import { Outlet } from 'react-router-dom'
import { BottomTabs } from './BottomTabs.tsx'
import type { TabItem } from '../navigation.tsx'

interface AppLayoutProps {
  tabs: TabItem[]
}

export function AppLayout({ tabs }: AppLayoutProps) {
  return (
    <div className="app">
      <main className="app__content">
        <Outlet />
      </main>
      <BottomTabs tabs={tabs} />
    </div>
  )
}
