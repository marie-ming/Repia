interface LoadErrorProps {
  onRetry: () => void
}

// 데이터를 못 읽었을 때 「불러오는 중...」 자리에 대신 들어간다.
export function LoadError({ onRetry }: LoadErrorProps) {
  return (
    <div className="load-error" role="alert">
      <p className="load-error__text">기록을 불러오지 못했습니다.</p>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
        다시 시도
      </button>
    </div>
  )
}
