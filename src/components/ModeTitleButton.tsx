import { useState } from 'react'
import { ChevronDownIcon } from './icons.tsx'
import { ModeSwitchSheet } from './ModeSwitchSheet.tsx'

interface ModeTitleButtonProps {
  title: string
}

export function ModeTitleButton({ title }: ModeTitleButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="home-page__title-btn"
        onClick={() => setOpen(true)}
        aria-label={`${title} · 모드 전환`}
      >
        <h1 className="home-page__title">{title}</h1>
        <ChevronDownIcon className="home-page__title-arrow" />
      </button>
      <ModeSwitchSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}
