import { normalizeText } from '@/lib/normalize-text'

export const FILTER_KEYS = ['genre', 'theme', 'country', 'decade', 'language'] as const
export type FilterKey = (typeof FILTER_KEYS)[number]
export const SORT_KEYS = ['year', 'year-desc', 'title', 'popular', 'relevance'] as const
export type SortKey = (typeof SORT_KEYS)[number]

export type ArchiveQuery = { filters: Record<FilterKey, string[]>; q: string; sort: SortKey | null }

export const EMPTY_QUERY: ArchiveQuery = {
  filters: { genre: [], theme: [], country: [], decade: [], language: [] },
  q: '',
  sort: null,
}

export const MIN_QUERY_LENGTH = 2

// Değerleri tekilleştirir ve sözlük sırasına dizer (kanonik URL sırası).
export function canonicalValues(values: Iterable<string>): string[] {
  return [...new Set(values)].sort()
}

// q en az 2 normalleşmiş karakter değilse boş sayılır.
export function cleanQuery(q: string): string {
  const trimmed = q.trim()
  return normalizeText(trimmed).length >= MIN_QUERY_LENGTH ? trimmed : ''
}

export function parseArchiveQuery(
  params: URLSearchParams,
  known: Record<FilterKey, ReadonlySet<string>>,
): ArchiveQuery {
  const filters = { ...EMPTY_QUERY.filters }
  for (const key of FILTER_KEYS) {
    // get() "%2C" kaçışını zaten virgüle çevirir, ikisi de aynı yoldan ayrışır.
    const raw = params.get(key)?.split(',') ?? []
    filters[key] = canonicalValues(raw.filter((value) => known[key].has(value)))
  }
  const sort = params.get('sort')
  return {
    filters,
    q: cleanQuery(params.get('q') ?? ''),
    sort: SORT_KEYS.find((key) => key === sort) ?? null,
  }
}

export function effectiveSort(query: ArchiveQuery): SortKey {
  if (query.sort === 'relevance' && !query.q) return 'year'
  return query.sort ?? (query.q ? 'relevance' : 'year')
}

export function serializeArchiveQuery(query: ArchiveQuery): string {
  const parts: string[] = []
  for (const key of FILTER_KEYS) {
    const values = query.filters[key]
    if (values.length > 0) parts.push(`${key}=${values.map(encodeURIComponent).join(',')}`)
  }
  if (query.q) parts.push(`q=${encodeURIComponent(query.q)}`)
  const sort = effectiveSort(query)
  if (sort !== effectiveSort({ ...query, sort: null })) parts.push(`sort=${sort}`)
  return parts.join('&')
}
