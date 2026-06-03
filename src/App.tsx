import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { appConfigRepo } from './db/repositories/appConfig.ts'
import type { Mode } from './db/types.ts'
import { AppLayout } from './components/AppLayout.tsx'
import { ExerciseDetailPage } from './pages/ExerciseDetailPage.tsx'
import { SessionDetailPage } from './pages/SessionDetailPage.tsx'
import { DataSettingsPage } from './pages/DataSettingsPage.tsx'
import { MemberDetailPage } from './pages/MemberDetailPage.tsx'
import { ExerciseFormPage } from './pages/ExerciseFormPage.tsx'
import { SessionFormPage } from './pages/SessionFormPage.tsx'
import { RoutineLogFormPage } from './pages/RoutineLogFormPage.tsx'
import { RoutineLogDetailPage } from './pages/RoutineLogDetailPage.tsx'
import { Splash } from './components/Splash.tsx'
import { ModeContext } from './components/ModeContext.tsx'
import { tabsForMode } from './navigation.tsx'

type AppState =
  | { status: 'loading' }
  | { status: 'ready'; mode: Mode }

const DEFAULT_MODE: Mode = 'personal'
const SPLASH_MIN_MS = 1200

function App() {
  const [state, setState] = useState<AppState>({ status: 'loading' })

  useEffect(() => {
    const minDelay = new Promise<void>((r) => setTimeout(r, SPLASH_MIN_MS))
    Promise.all([appConfigRepo.getMode(), minDelay]).then(async ([stored]) => {
      let mode = stored
      if (!mode) {
        await appConfigRepo.setMode(DEFAULT_MODE)
        await appConfigRepo.set('installedAt', new Date().toISOString())
        await appConfigRepo.set('schemaVersion', 1)
        mode = DEFAULT_MODE
      }
      setState({ status: 'ready', mode })
    })
  }, [])

  const changeMode = useCallback(async (next: Mode) => {
    await appConfigRepo.setMode(next)
    setState({ status: 'ready', mode: next })
  }, [])

  const currentMode = state.status === 'ready' ? state.mode : null
  const modeContextValue = useMemo(
    () => (currentMode ? { mode: currentMode, setMode: changeMode } : null),
    [currentMode, changeMode],
  )

  if (state.status === 'loading') {
    return <Splash />
  }

  const tabs = tabsForMode(state.mode)
  return (
    <ModeContext.Provider value={modeContextValue}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout tabs={tabs} />}>
            {tabs.map((tab) => (
              <Route key={tab.path} path={tab.path} element={tab.element} />
            ))}
          </Route>
          <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
          <Route path="/sessions/:id" element={<SessionDetailPage />} />
          <Route path="/settings/data" element={<DataSettingsPage />} />
          <Route path="/members/:id" element={<MemberDetailPage />} />
          <Route path="/exercises/new" element={<ExerciseFormPage />} />
          <Route path="/exercises/:id/edit" element={<ExerciseFormPage />} />
          <Route path="/sessions/new" element={<SessionFormPage />} />
          <Route path="/sessions/:id/edit" element={<SessionFormPage />} />
          <Route path="/logs/:id" element={<RoutineLogDetailPage />} />
          <Route path="/logs/new" element={<RoutineLogFormPage />} />
          <Route path="/logs/:id/edit" element={<RoutineLogFormPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ModeContext.Provider>
  )
}

export default App
