import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { appConfigRepo } from './db/repositories/appConfig.ts'
import type { Mode } from './db/types.ts'
import { ModeSelect } from './pages/ModeSelect.tsx'
import { AppLayout } from './components/AppLayout.tsx'
import { ExerciseDetailPage } from './pages/ExerciseDetailPage.tsx'
import { tabsForMode } from './navigation.tsx'

type AppState =
  | { status: 'loading' }
  | { status: 'needsMode' }
  | { status: 'ready'; mode: Mode }

function App() {
  const [state, setState] = useState<AppState>({ status: 'loading' })

  useEffect(() => {
    appConfigRepo.getMode().then((mode) => {
      setState(mode ? { status: 'ready', mode } : { status: 'needsMode' })
    })
  }, [])

  async function handleSelectMode(mode: Mode) {
    await appConfigRepo.setMode(mode)
    await appConfigRepo.set('installedAt', new Date().toISOString())
    await appConfigRepo.set('schemaVersion', 1)
    setState({ status: 'ready', mode })
  }

  if (state.status === 'loading') {
    return <div className="splash">Repia</div>
  }

  if (state.status === 'needsMode') {
    return <ModeSelect onSelect={handleSelectMode} />
  }

  const tabs = tabsForMode(state.mode)
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout tabs={tabs} />}>
          {tabs.map((tab) => (
            <Route key={tab.path} path={tab.path} element={tab.element} />
          ))}
        </Route>
        <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
