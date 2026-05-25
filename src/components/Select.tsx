import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon } from './icons.tsx'

interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectProps<T extends string> {
  value: T | null
  options: SelectOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  placeholder = '선택',
}: SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const selected = options.find((o) => o.value === value)

  return (
    <div className={open ? 'select select--open' : 'select'} ref={ref}>
      <button
        type="button"
        className="select__control"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? 'select__value' : 'select__placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon className="select__arrow" />
      </button>
      {open && (
        <ul className="select__panel" role="listbox">
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={
                  o.value === value ? 'select__option select__option--active' : 'select__option'
                }
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
