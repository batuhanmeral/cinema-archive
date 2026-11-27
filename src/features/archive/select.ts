import { FILTER_KEYS, effectiveSort, type ArchiveQuery, type FilterKey } from '@/lib/archive-query'
import type { Locale } from '@/lib/i18n/locale'
import type { ArchiveFilm } from './schemas'

export type FacetOption = { value: string; label: string; count: number; selected: boolean }

export function filmValues(film: ArchiveFilm, key: FilterKey): string[] {
  switch (key) {
    case 'genre':
      return film.genres.map(String)
    case 'theme':
      return film.themes.map(String)
    case 'country':
      return film.countries
    case 'language':
      return film.languages
    case 'decade':
      return [String(Math.floor(film.year / 10) * 10)]
  }
}

// `skip` verilen anahtarın filtresini yok sayar (faceted sayım için).
function matches(
  film: ArchiveFilm,
  query: ArchiveQuery,
  scores: Map<string, number> | null,
  skip?: FilterKey,
): boolean {
  if (query.q && scores && !scores.has(film.slug)) return false
  for (const key of FILTER_KEYS) {
    const selected = query.filters[key]
    if (key === skip || selected.length === 0) continue
    if (!filmValues(film, key).some((value) => selected.includes(value))) return false
  }
  return true
}

export function selectFilms(
  films: ArchiveFilm[],
  query: ArchiveQuery,
  ctx: { locale: Locale; scores: Map<string, number> | null },
): ArchiveFilm[] {
  const { locale, scores } = ctx
  const collator = new Intl.Collator(locale)
  const byTitle = (a: ArchiveFilm, b: ArchiveFilm) => collator.compare(a.title, b.title)
  const bySlug = (a: ArchiveFilm, b: ArchiveFilm) =>
    a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0
  const score = (film: ArchiveFilm) => scores?.get(film.slug) ?? Infinity
  const compare: Record<string, (a: ArchiveFilm, b: ArchiveFilm) => number> = {
    year: (a, b) => a.year - b.year || byTitle(a, b),
    'year-desc': (a, b) => b.year - a.year || byTitle(a, b),
    title: (a, b) => byTitle(a, b) || a.year - b.year,
    popular: (a, b) => b.votes - a.votes || a.year - b.year,
    relevance: (a, b) => score(a) - score(b) || b.votes - a.votes,
  }
  const primary = compare[effectiveSort(query)] ?? compare.year!
  return films
    .filter((film) => matches(film, query, scores))
    .sort((a, b) => primary(a, b) || bySlug(a, b))
}

export function facetCounts(
  films: ArchiveFilm[],
  query: ArchiveQuery,
  scores: Map<string, number> | null,
): Record<FilterKey, Map<string, number>> {
  const counts: Record<FilterKey, Map<string, number>> = {
    genre: new Map(),
    theme: new Map(),
    country: new Map(),
    decade: new Map(),
    language: new Map(),
  }
  for (const key of FILTER_KEYS) {
    const map = counts[key]
    for (const film of films) {
      if (!matches(film, query, scores, key)) continue
      for (const value of filmValues(film, key)) map.set(value, (map.get(value) ?? 0) + 1)
    }
  }
  return counts
}

export function facetOptions(
  key: FilterKey,
  counts: Map<string, number>,
  selected: string[],
  labels: Record<string, string>,
  locale: Locale,
): FacetOption[] {
  const values = new Set([...counts.keys(), ...selected])
  const options = [...values]
    .map((value) => ({
      value,
      label: labels[value] ?? value,
      count: counts.get(value) ?? 0,
      selected: selected.includes(value),
    }))
    .filter((option) => option.count > 0 || option.selected)
  if (key === 'decade') return options.sort((a, b) => Number(a.value) - Number(b.value))
  const collator = new Intl.Collator(locale)
  return options.sort((a, b) => b.count - a.count || collator.compare(a.label, b.label))
}
