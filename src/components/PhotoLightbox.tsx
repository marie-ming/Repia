import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CloseIcon } from './icons.tsx'

interface PhotoLightboxProps {
  photos: string[]
  index: number | null
  onClose: () => void
}

export function PhotoLightbox({ photos, index, onClose }: PhotoLightboxProps) {
  const [active, setActive] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (index === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, onClose])

  // 팝업이 열릴 때 눌렀던 사진 위치로 스크롤 이동(스냅 레이아웃은 열린 후에야 측정 가능)
  useLayoutEffect(() => {
    if (index === null || !trackRef.current) return
    setActive(index)
    trackRef.current.scrollLeft = index * trackRef.current.clientWidth
  }, [index])

  if (index === null) return null

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx !== active) setActive(idx)
  }

  return (
    <div className="photo-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <button type="button" className="photo-lightbox__close" onClick={onClose} aria-label="닫기">
        <CloseIcon />
      </button>
      <div className="photo-lightbox__track" ref={trackRef} onScroll={onScroll}>
        {photos.map((photo, i) => (
          <div className="photo-lightbox__item" key={i}>
            <img
              src={photo}
              alt="원본 사진"
              className="photo-lightbox__img"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="photo-lightbox__dots">
          {photos.map((_, i) => (
            <span
              key={i}
              className={i === active ? 'photo-lightbox__dot photo-lightbox__dot--active' : 'photo-lightbox__dot'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
