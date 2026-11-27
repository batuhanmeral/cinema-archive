import {
  EMPTY_QUERY,
  FILTER_KEYS,
  canonicalValues,
  cleanQuery,
  serializeArchiveQuery,
  type FilterKey,
  type SortKey,
} from '@/lib/archive-query'
import type { Locale } from './locale'

const EN_PREFIX = '/en'

export type ArchiveFilter = Partial<Record<FilterKey, string | number | (string | number)[]>> & {
  q?: string
  sort?: SortKey
}

function localePath(locale: Locale, segments: string[]): string {
  const path = segments.join('/')
  if (locale === 'tr') return `/${path}`
  return path ? `${EN_PREFIX}/${path}` : EN_PREFIX
}

export function homeHref(locale: Locale): string {
  return localePath(locale, [])
}

export function filmHref(locale: Locale, slug: string): string {
  return localePath(locale, ['film', slug])
}

export function personHref(locale: Locale, slug: string): string {
  return localePath(locale, ['person', slug])
}

export function movementHref(locale: Locale, slug: string): string {
  return localePath(locale, ['movement', slug])
}

export function movementsHref(locale: Locale): string {
  return localePath(locale, ['movements'])
}

export function collectionHref(locale: Locale, slug: string): string {
  return localePath(locale, ['collection', slug])
}

export function collectionsHref(locale: Locale): string {
  return localePath(locale, ['collections'])
}

export function archiveHref(locale: Locale, filter: ArchiveFilter): string {
  const filters = { ...EMPTY_QUERY.filters }
  for (const key of FILTER_KEYS) {
    const value = filter[key]
    if (value === undefined) continue
    filters[key] = canonicalValues([value].flat().map(String))
  }
  const query = serializeArchiveQuery({
    filters,
    q: cleanQuery(filter.q ?? ''),
    sort: filter.sort ?? null,
  })
  const path = localePath(locale, ['archive'])
  return query ? `${path}?${query}` : path
}

// Segmentler iki dilde aynı olduğundan geçiş yalnızca /en önekini ekler veya kaldırır.
export function switchLocalePath(path: string, to: Locale): string {
  const queryStart = path.indexOf('?')
  const pathname = queryStart === -1 ? path : path.slice(0, queryStart)
  const query = queryStart === -1 ? '' : path.slice(queryStart)
  const isEnglish = pathname === EN_PREFIX || pathname.startsWith(`${EN_PREFIX}/`)
  const rest = isEnglish ? pathname.slice(EN_PREFIX.length) : pathname
  return localePath(to, rest.split('/').filter(Boolean)) + query
}
