import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon, SearchIcon } from './icons.tsx'

interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectProps<T extends string> {
  value: T | null
  options: SelectOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
  searchable?: boolean
  searchPlaceholder?: string
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  placeholder = '선택',
  searchable = false,
  searchPlaceholder = '검색',
}: SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const selected = options.find((o) => o.value === value)
  const q = query.trim().toLowerCase()
  const filtered = searchable && q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options

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
        <div className="select__panel">
          {searchable && (
            <div className="select__search">
              <SearchIcon className="select__search-icon" />
              <input
                className="select__search-input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
              />
            </div>
          )}
          <ul className="select__list" role="listbox">
            {filtered.length === 0 ? (
              <li className="select__empty">검색 결과가 없습니다</li>
            ) : (
              filtered.map((o) => (
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
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
