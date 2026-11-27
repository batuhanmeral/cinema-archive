'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import type { Locale } from '@/lib/i18n/locale'
import type { FacetOption } from '../select'
import { FacetOptions, SelectedCount } from './FacetOptions'

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
    <div
      ref={rootRef}
      className="relative"
      // Odak panelin dışına çıkınca kapanır; içeride dolaşırken açık kalır.
      onBlur={(event) => {
        if (open && !rootRef.current?.contains(event.relatedTarget as Node | null)) onClose()
      }}
    >
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
        <SelectedCount options={options} />
        <ChevronDown size={14} strokeWidth={1.75} aria-hidden />
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          // tabIndex: panelin boş yerine tıklamak odağı panelde tutar, blur onu kapatmaz.
          tabIndex={-1}
          className="absolute outline-none top-[calc(100%+8px)] left-0 z-10 max-h-[min(60vh,420px)] w-65 overflow-y-auto overscroll-contain border border-line bg-hall p-2"
        >
          <FacetOptions options={options} locale={locale} onChange={onChange} />
        </div>
      )}
    </div>
  )
}
