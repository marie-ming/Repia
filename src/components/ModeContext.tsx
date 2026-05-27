import { createContext, useContext } from 'react'
import type { Mode } from '../db/types.ts'

interface ModeContextValue {
  mode: Mode
  setMode: (mode: Mode) => Promise<void>
}

export const ModeContext = createContext<ModeContextValue | null>(null)

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used inside <ModeContext.Provider>')
  return ctx
}
