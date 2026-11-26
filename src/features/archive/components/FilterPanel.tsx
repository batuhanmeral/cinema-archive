'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import type { Locale } from '@/lib/i18n/locale'
import type { FacetOption } from '../select'

export function FilterPanel({
  label,
  options,
  locale,
  open,
  disabled,
  onToggle,
  onClose,
  onChange,
}: {
  label: string
  options: FacetOption[]
  locale: Locale
  open: boolean
  disabled: boolean
  onToggle: () => void
  onClose: () => void
  onChange: (value: string) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const selected = options.filter((option) => option.selected).length
  const format = new Intl.NumberFormat(locale)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      onClose()
      buttonRef.current?.focus()
    }
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, onClose])

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        disabled={disabled}
        onClick={onToggle}
        className="inline-flex h-9 items-center gap-2 px-3 text-sm transition-colors duration-150 hover:bg-surface hover:text-accent disabled:cursor-default disabled:text-muted disabled:hover:bg-transparent aria-expanded:bg-text/8"
      >
        {label}
        {selected > 0 && (
          <>
            {' '}
            <b className="font-medium text-accent">{selected}</b>
          </>
        )}
        <ChevronDown size={14} strokeWidth={1.75} aria-hidden />
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="absolute top-[calc(100%+8px)] left-0 z-10 max-h-[min(60vh,420px)] w-65 overflow-y-auto overscroll-contain border border-line bg-hall p-2"
        >
          {options.map((option) => (
            <label
              key={option.value}
              className="group/option grid cursor-pointer grid-cols-[16px_1fr_auto] items-center gap-3 p-2 text-sm hover:bg-surface"
            >
              <span className="relative grid size-4 place-items-center">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={option.selected}
                  onChange={() => onChange(option.value)}
                  className="peer absolute inset-0 m-0 cursor-pointer appearance-none border border-muted checked:border-accent checked:bg-accent"
                />
                <Check
                  size={12}
                  strokeWidth={3}
                  aria-hidden
                  className="pointer-events-none relative hidden text-hall peer-checked:block"
                />
              </span>
              <span className="truncate transition-colors duration-150 group-hover/option:text-accent">
                {option.label}
              </span>{' '}
              <span className="text-xs text-muted">{format.format(option.count)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
