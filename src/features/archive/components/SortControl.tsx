'use client'

import { ChevronDown } from 'lucide-react'
import { useId } from 'react'
import { SORT_KEYS, type SortKey } from '@/lib/archive-query'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'

// Yerel select: klavye ve ekran okuyucu desteği hazır gelir. "En uygun" yalnızca sorgu varken sunulur.
export function SortControl({
  locale,
  value,
  withQuery,
  disabled,
  onChange,
}: {
  locale: Locale
  value: SortKey
  withQuery: boolean
  disabled: boolean
  onChange?: (sort: SortKey) => void
}) {
  const t = messages[locale].archive
  const labelId = useId()
  const keys = SORT_KEYS.filter((key) => key !== 'relevance' || withQuery)
  return (
    <div className="relative flex items-center gap-1">
      <span id={labelId}>{t.sortLabel}:</span>
      <select
        aria-labelledby={labelId}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value as SortKey)}
        className="h-9 cursor-pointer appearance-none bg-hall pr-6 pl-1 field-sizing-content text-text transition-colors duration-150 hover:text-accent disabled:cursor-default disabled:text-muted disabled:hover:text-muted"
      >
        {keys.map((key) => (
          <option key={key} value={key}>
            {t.sort[key]}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        strokeWidth={1.75}
        aria-hidden
        className="pointer-events-none absolute right-1"
      />
    </div>
  )
}
