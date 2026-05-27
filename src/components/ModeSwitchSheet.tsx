import { useNavigate } from 'react-router-dom'
import type { Mode } from '../db/types.ts'
import { BottomSheet } from './BottomSheet.tsx'
import { useMode } from './ModeContext.tsx'
import { useToast } from './Toast.tsx'

interface ModeSwitchSheetProps {
  open: boolean
  onClose: () => void
}

const OPTIONS: { value: Mode; label: string }[] = [
  { value: 'trainer', label: '트레이너' },
  { value: 'personal', label: '개인' },
]

export function ModeSwitchSheet({ open, onClose }: ModeSwitchSheetProps) {
  const { mode, setMode } = useMode()
  const navigate = useNavigate()
  const showToast = useToast()

  async function handlePick(next: Mode) {
    if (next === mode) {
      onClose()
      return
    }
    await setMode(next)
    onClose()
    navigate('/', { replace: true })
    showToast(`${next === 'trainer' ? '트레이너' : '개인'} 모드로 전환했습니다`)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="모드 전환">
      <div className="mode-switch-body">
        <div className="segmented">
          {OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={
                mode === opt.value ? 'segmented__item segmented__item--active' : 'segmented__item'
              }
              onClick={() => handlePick(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}
