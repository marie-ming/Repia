import type { ReactNode } from 'react'
import type { Mode } from './db/types.ts'
import { HomePage } from './pages/HomePage.tsx'
import { TrainerHomePage } from './pages/TrainerHomePage.tsx'
import { MembersPage } from './pages/MembersPage.tsx'
import { ExercisesPage } from './pages/ExercisesPage.tsx'
import { RoutinesPage } from './pages/RoutinesPage.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'
import {
  HomeIcon,
  UsersIcon,
  DumbbellIcon,
  ClipboardListIcon,
  SettingsIcon,
} from './components/icons.tsx'

export interface TabItem {
  path: string
  label: string
  icon: ReactNode
  element: ReactNode
}

const trainerTabs: TabItem[] = [
  { path: '/', label: '홈', icon: <HomeIcon />, element: <TrainerHomePage /> },
  { path: '/members', label: '회원', icon: <UsersIcon />, element: <MembersPage /> },
  { path: '/exercises', label: '운동', icon: <DumbbellIcon />, element: <ExercisesPage /> },
  { path: '/settings', label: '설정', icon: <SettingsIcon />, element: <SettingsPage /> },
]

const personalTabs: TabItem[] = [
  { path: '/', label: '홈', icon: <HomeIcon />, element: <HomePage /> },
  { path: '/exercises', label: '운동', icon: <DumbbellIcon />, element: <ExercisesPage /> },
  { path: '/routines', label: '루틴', icon: <ClipboardListIcon />, element: <RoutinesPage /> },
  { path: '/settings', label: '설정', icon: <SettingsIcon />, element: <SettingsPage /> },
]

export function tabsForMode(mode: Mode): TabItem[] {
  return mode === 'trainer' ? trainerTabs : personalTabs
}
