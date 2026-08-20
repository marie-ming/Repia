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
    try {
      await setMode(next)
    } catch (err) {
      // 저장이 실패했으면 전환하지 않는다. 화면만 바꾸면 다음에 열 때
      // 아무 말 없이 원래 모드로 돌아가고, 사용자는 이유를 알 수 없다.
      showToast(err instanceof Error ? `전환 실패: ${err.message}` : '모드를 전환하지 못했습니다')
      return
    }
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
