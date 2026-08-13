import { Component, type ErrorInfo, type ReactNode } from 'react'
import { exportBackup } from '../db/backup.ts'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
  backup: 'idle' | 'saving' | 'done' | 'failed'
}

// 렌더 중 예외가 나면 화면 전체가 비어버린다. 기록이 이 기기에만 있는 앱이라
// 그 상태에서는 설정으로 들어가 백업을 뽑을 수도 없다 — 그래서 이 화면이
// 백업 내려받기를 직접 제공한다.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, backup: 'idle' }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Repia] 화면을 그리지 못했습니다', error, info.componentStack)
  }

  handleBackup = async () => {
    this.setState({ backup: 'saving' })
    try {
      await exportBackup()
      this.setState({ backup: 'done' })
    } catch {
      // DB 자체가 깨졌으면 백업도 실패한다. 버튼을 되살려 다시 눌러볼 수 있게 둔다.
      this.setState({ backup: 'failed' })
    }
  }

  // 상태를 비우는 것만으로는 같은 예외가 곧바로 다시 난다. 통째로 새로 띄운다.
  handleRestart = () => {
    window.location.reload()
  }

  render() {
    const { error, backup } = this.state
    if (!error) return this.props.children

    return (
      <div className="crash" role="alert">
        <div className="crash__box">
          <h1 className="crash__title">앱에 문제가 생겼습니다</h1>
          <p className="crash__desc">
            기록은 이 기기에 그대로 있습니다. 백업 파일을 먼저 받아두시면 안전합니다.
          </p>

          <div className="crash__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={this.handleBackup}
              disabled={backup === 'saving'}
            >
              {backup === 'saving' ? '백업하는 중...' : '백업 내려받기'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={this.handleRestart}>
              앱 다시 시작
            </button>
          </div>

          {backup === 'done' && <p className="crash__result">백업 파일을 내려받았습니다.</p>}
          {backup === 'failed' && (
            <p className="crash__result crash__result--fail">
              백업에 실패했습니다. 앱을 다시 시작한 뒤 설정 &gt; 데이터 관리에서 시도해주세요.
            </p>
          )}

          <details className="crash__details">
            <summary>오류 내용</summary>
            <pre className="crash__trace">{error.message || String(error)}</pre>
          </details>
        </div>
      </div>
    )
  }
}
