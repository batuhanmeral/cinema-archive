'use client'

import { SlidersHorizontal } from 'lucide-react'
import { useCallback, useRef, useState, type Ref } from 'react'
import {
  FILTER_KEYS,
  canonicalValues,
  effectiveSort,
  type ArchiveQuery,
  type FilterKey,
} from '@/lib/archive-query'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import type { FacetOption } from '../select'
import { FilterPanel } from './FilterPanel'
import { FilterSheet } from './FilterSheet'
import { SortControl } from './SortControl'

export type Facets = Record<FilterKey, FacetOption[]>

// Değer seçiliyse çıkarır, değilse ekler; sıra kanonik kalır.
function toggleValue(query: ArchiveQuery, key: FilterKey, value: string): ArchiveQuery {
  const current = query.filters[key]
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : canonicalValues([...current, value])
  return { ...query, filters: { ...query.filters, [key]: next } }
}

// facets veya onChange yoksa (statik çıktı, dizin yüklenemedi) denetimler devre dışı görünür.
export function FilterBar({
  locale,
  query,
  facets,
  count,
  disabled = false,
  onChange,
  ref,
}: {
  locale: Locale
  query: ArchiveQuery
  facets: Facets | null
  count: number | null
  disabled?: boolean
  onChange?: (query: ArchiveQuery) => void
  ref?: Ref<HTMLDivElement>
}) {
  const t = messages[locale].archive
  const [openKey, setOpenKey] = useState<FilterKey | null>(null)
  const close = useCallback(() => setOpenKey(null), [])
  const off = disabled || !facets || !onChange
  const [sheetOpen, setSheetOpen] = useState(false)
  const sheetButtonRef = useRef<HTMLButtonElement>(null)
  const closeSheet = useCallback(() => {
    setSheetOpen(false)
    sheetButtonRef.current?.focus()
  }, [])
  const selected = FILTER_KEYS.reduce((sum, key) => sum + query.filters[key].length, 0)

  return (
    // Navbar görünürken onun altında, gizlenince en üstte durur; top değişimi yerleşimi kaydırmaz.
    <div
      ref={ref}
      className="sticky top-18 z-40 border-b border-line bg-hall transition-[top] duration-200 motion-reduce:transition-none [body:has(>header[data-hidden])_&]:top-0"
    >
      <div className="wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 md:py-4">
        <div className="hidden items-center gap-1 md:flex">
          {FILTER_KEYS.map((key) => (
            <FilterPanel
              key={key}
              label={t.filters[key]}
              options={facets?.[key] ?? []}
              locale={locale}
              open={!off && openKey === key}
              disabled={off}
              onToggle={() => setOpenKey((current) => (current === key ? null : key))}
              onClose={close}
              onChange={(value) => onChange?.(toggleValue(query, key, value))}
            />
          ))}
        </div>
        <button
          ref={sheetButtonRef}
          type="button"
          aria-haspopup="dialog"
          disabled={off}
          onClick={() => setSheetOpen(true)}
          className="inline-flex h-10 items-center gap-2 bg-text/8 px-3.5 text-sm transition-colors duration-150 hover:text-accent disabled:cursor-default disabled:text-muted disabled:hover:text-muted md:hidden"
        >
          <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden />
          {t.filterButton(selected)}
        </button>
        <div className="ml-auto flex items-center gap-4 text-[13px] text-muted">
          <span aria-live="polite">{count === null ? '' : t.resultCount(count)}</span>
          <SortControl
            locale={locale}
            value={effectiveSort(query)}
            withQuery={query.q !== ''}
            disabled={off}
            onChange={(sort) => onChange?.({ ...query, sort })}
          />
        </div>
      </div>
      {sheetOpen && !off && facets && (
        <FilterSheet
          facets={facets}
          locale={locale}
          count={count}
          onClose={closeSheet}
          onToggle={(key, value) => onChange?.(toggleValue(query, key, value))}
        />
      )}
    </div>
  )
}
