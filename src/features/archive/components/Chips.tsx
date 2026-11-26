'use client'

import { X } from 'lucide-react'
import { EMPTY_QUERY, FILTER_KEYS, type ArchiveQuery, type FilterKey } from '@/lib/archive-query'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'

type Chip = { id: string; label: string; next: ArchiveQuery }

// Temizle süzgeçleri ve sorguyu siler, sıralama seçimi kalır.
export function clearedQuery(query: ArchiveQuery): ArchiveQuery {
  return { ...EMPTY_QUERY, sort: query.sort }
}

function chipsOf(query: ArchiveQuery, labels: Record<FilterKey, Record<string, string>>): Chip[] {
  const chips: Chip[] = FILTER_KEYS.flatMap((key) =>
    query.filters[key].map((value) => ({
      id: `${key}:${value}`,
      label: labels[key][value] ?? value,
      next: {
        ...query,
        filters: { ...query.filters, [key]: query.filters[key].filter((v) => v !== value) },
      },
    })),
  )
  if (query.q) chips.push({ id: 'q', label: `“${query.q}”`, next: { ...query, q: '' } })
  return chips
}

export function ClearButton({
  locale,
  disabled,
  onClick,
}: {
  locale: Locale
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-2 text-muted transition-colors duration-150 hover:text-accent disabled:cursor-default disabled:hover:text-muted"
    >
      {messages[locale].archive.clear}
    </button>
  )
}

export function Chips({
  locale,
  query,
  labels,
  disabled,
  onChange,
}: {
  locale: Locale
  query: ArchiveQuery
  labels: Record<FilterKey, Record<string, string>>
  disabled: boolean
  onChange: (query: ArchiveQuery) => void
}) {
  const chips = chipsOf(query, labels)
  if (chips.length === 0) return null
  const t = messages[locale].archive
  return (
    <div className="wrap flex flex-wrap items-center gap-2 pt-4 text-[13px]">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          aria-label={t.removeChip(chip.label)}
          disabled={disabled}
          onClick={() => onChange(chip.next)}
          className="inline-flex h-7 items-center gap-2 bg-text/8 px-3 transition-colors duration-150 hover:text-accent disabled:cursor-default disabled:text-muted disabled:hover:text-muted"
        >
          {chip.label}
          <X size={12} strokeWidth={2} aria-hidden />
        </button>
      ))}
      <ClearButton
        locale={locale}
        disabled={disabled}
        onClick={() => onChange(clearedQuery(query))}
      />
    </div>
  )
}
