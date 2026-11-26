'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadSearchData, type SearchData } from '@/features/search/load'
import {
  EMPTY_QUERY,
  FILTER_KEYS,
  parseArchiveQuery,
  serializeArchiveQuery,
  type ArchiveQuery,
  type FilterKey,
} from '@/lib/archive-query'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { archiveHref } from '@/lib/i18n/routes'
import type { ArchiveFilm, FacetLabels } from '../schemas'
import { facetCounts, facetOptions, selectFilms } from '../select'
import { ArchiveGrid, ArchiveGridPlaceholder, PAGE_SIZE } from './ArchiveGrid'
import { Chips, ClearButton, clearedQuery } from './Chips'
import { FilterBar, type Facets } from './FilterBar'

type LoadState = { status: 'loading' } | { status: 'ready'; data: SearchData } | { status: 'error' }

const URL_KEYS = [...FILTER_KEYS, 'q', 'sort']

export function ArchiveView({
  locale,
  labels,
  initialFilms,
  total,
}: {
  locale: Locale
  labels: FacetLabels
  initialFilms: ArchiveFilm[]
  total: number
}) {
  const t = messages[locale].archive
  const params = useSearchParams()
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let live = true
    loadSearchData(locale).then(
      (data) => live && setLoad({ status: 'ready', data }),
      () => live && setLoad({ status: 'error' }),
    )
    return () => {
      live = false
    }
  }, [locale])

  // Bilinen değerler sunucunun etiketlerinden gelir; sorgu dizin yüklenmeden çözülebilir.
  const known = useMemo(() => {
    const sets = {} as Record<FilterKey, ReadonlySet<string>>
    for (const key of FILTER_KEYS) sets[key] = new Set(Object.keys(labels[key]))
    return sets
  }, [labels])
  const query = useMemo(
    () => parseArchiveQuery(new URLSearchParams(params.toString()), known),
    [params, known],
  )
  const hasKeys = URL_KEYS.some((key) => params.has(key))
  const data = load.status === 'ready' ? load.data : null

  const scores = useMemo(() => {
    if (!data || !query.q) return null
    return new Map(data.matcher.films(query.q).map((hit) => [hit.film.slug, hit.score]))
  }, [data, query.q])
  const films = useMemo(
    () => (data ? selectFilms(data.index.films, query, { locale, scores }) : null),
    [data, query, locale, scores],
  )
  const facets = useMemo((): Facets | null => {
    if (!data) return null
    const counts = facetCounts(data.index.films, query, scores)
    return Object.fromEntries(
      FILTER_KEYS.map((key) => [
        key,
        facetOptions(key, counts[key], query.filters[key], labels[key], locale),
      ]),
    ) as Facets
  }, [data, query, scores, labels, locale])

  // Her sorgu değişiminde (geri dönüş dahil) 48'e döner: son görülen anahtar render sırasında güncellenir.
  const queryKey = serializeArchiveQuery(query)
  const [page, setPage] = useState({ queryKey, shown: PAGE_SIZE })
  if (page.queryKey !== queryKey) setPage({ queryKey, shown: PAGE_SIZE })
  const shown = page.queryKey === queryKey ? page.shown : PAGE_SIZE

  // Kaybolan düğmeden sonra odak çubuktaki ilk odaklanabilir denetime geçer (mobilde gizli süzgeçler atlanır).
  const barRef = useRef<HTMLDivElement>(null)
  const focusBar = useCallback(() => {
    for (const control of barRef.current?.querySelectorAll<HTMLElement>('button, select') ?? []) {
      control.focus()
      if (document.activeElement === control) return
    }
  }, [])
  const focusBarAfterUpdate = useRef(false)
  useEffect(() => {
    if (!focusBarAfterUpdate.current) return
    focusBarAfterUpdate.current = false
    focusBar()
  }, [queryKey, focusBar])

  const update = (next: ArchiveQuery) => {
    const search = serializeArchiveQuery(next)
    const path = archiveHref(locale, {})
    window.history.replaceState(null, '', search ? `${path}?${search}` : path)
  }

  const pending = load.status === 'loading' && hasKeys
  const failed = load.status === 'error'
  const count = films ? films.length : pending ? null : total

  return (
    <>
      <FilterBar
        ref={barRef}
        locale={locale}
        query={failed ? EMPTY_QUERY : query}
        facets={facets}
        count={count}
        disabled={!data}
        onChange={update}
      />
      {!failed && (
        <Chips
          locale={locale}
          query={query}
          labels={labels}
          disabled={!data}
          onChange={update}
          onEmpty={focusBar}
        />
      )}
      {pending ? (
        <ArchiveGridPlaceholder />
      ) : films?.length === 0 ? (
        <div className="wrap flex flex-wrap items-center gap-4 pt-10 text-sm">
          <p className="text-muted">{t.empty}</p>
          <ClearButton
            locale={locale}
            disabled={false}
            onClick={() => {
              focusBarAfterUpdate.current = true
              update(clearedQuery(query))
            }}
          />
        </div>
      ) : (
        <ArchiveGrid films={films ? films.slice(0, shown) : initialFilms} locale={locale} />
      )}
      {films && films.length > shown && (
        <button
          type="button"
          onClick={() => setPage({ queryKey, shown: shown + PAGE_SIZE })}
          className="mx-auto mt-12 block h-11 border border-line px-6 text-sm transition-colors duration-150 hover:border-accent hover:text-accent"
        >
          {t.showMore}
        </button>
      )}
    </>
  )
}
