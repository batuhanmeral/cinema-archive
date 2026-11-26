import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { FILTER_KEYS, type FilterKey } from '@/lib/archive-query'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import type { FacetOption } from '../select'
import { FacetOptions, SelectedCount } from './FacetOptions'

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled])'
const DESKTOP = '(min-width: 768px)'

// Mobil alt panel: modal diyalog, odak içeride döner; kapatınca odağı açan düğmeye FilterBar verir.
export function FilterSheet({
  facets,
  locale,
  count,
  onClose,
  onToggle,
}: {
  facets: Record<FilterKey, FacetOption[]>
  locale: Locale
  count: number | null
  onClose: () => void
  onToggle: (key: FilterKey, value: string) => void
}) {
  const t = messages[locale].archive
  const titleId = useId()
  const sectionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [expanded, setExpanded] = useState<ReadonlySet<FilterKey>>(new Set())

  useEffect(() => {
    closeRef.current?.focus()
    // Arkadaki sayfa panel açıkken kaymaz.
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Pencere masaüstü genişliğine çıkınca panel kapanır; masaüstü süzgeçleri devralır.
    const desktop = window.matchMedia?.(DESKTOP)
    const onWide = (event: MediaQueryListEvent) => {
      if (event.matches) onClose()
    }
    desktop?.addEventListener('change', onWide)
    return () => {
      root.style.overflow = previous
      document.removeEventListener('keydown', onKey)
      desktop?.removeEventListener('change', onWide)
    }
  }, [onClose])

  const trapTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const toggleSection = (key: FilterKey) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })

  // Yapışkan çubuğun z-40 bağlamından çıkıp navbar'ın üstünde durmak için body'ye taşınır.
  return createPortal(
    <div className="fixed inset-0 z-[55] md:hidden">
      <div aria-hidden className="absolute inset-0 bg-hall/70" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapTab}
        className="absolute inset-x-0 bottom-0 flex max-h-[85svh] flex-col border-t border-line bg-hall"
      >
        <div className="flex items-center gap-4 border-b border-line py-2 pr-2 pl-4">
          <h2 id={titleId} className="text-base font-medium">
            {t.filterButton(0)}
          </h2>
          <span aria-live="polite" className="ml-auto text-[13px] text-muted">
            {count === null ? '' : t.resultCount(count)}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="h-11 px-3 text-sm transition-colors duration-150 hover:text-accent"
          >
            {t.close}
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-2 pb-6">
          {FILTER_KEYS.map((key) => {
            const open = expanded.has(key)
            const panelId = `${sectionId}-${key}`
            return (
              <section key={key} className="border-b border-line">
                <h3>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={open ? panelId : undefined}
                    onClick={() => toggleSection(key)}
                    className="flex h-12 w-full items-center gap-2 px-2 text-left text-[15px] transition-colors duration-150 hover:text-accent"
                  >
                    {t.filters[key]}
                    <SelectedCount options={facets[key]} />
                    <ChevronDown
                      size={16}
                      strokeWidth={1.75}
                      aria-hidden
                      className={`ml-auto transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
                    />
                  </button>
                </h3>
                {open && (
                  <div id={panelId} role="group" aria-label={t.filters[key]} className="pb-2">
                    <FacetOptions
                      options={facets[key]}
                      locale={locale}
                      onChange={(value) => onToggle(key, value)}
                    />
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
