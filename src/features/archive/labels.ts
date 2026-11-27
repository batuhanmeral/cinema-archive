import 'server-only'
import { FILTER_KEYS, type FilterKey } from '@/lib/archive-query'
import { store } from '@/lib/data'
import { decadeLabel } from '@/lib/i18n/decades'
import { countryName, languageName } from '@/lib/i18n/display-names'
import type { Locale } from '@/lib/i18n/locale'
import type { ArchiveFilm, FacetLabels } from './schemas'
import { filmValues } from './select'

export type HeroStats = { films: number; from: number; to: number; countries: number }

function label(key: FilterKey, value: string, locale: Locale): string {
  switch (key) {
    case 'genre':
      return store.genres().get(Number(value))?.[locale] ?? value
    case 'theme':
      return store.themes().get(Number(value))?.[locale] ?? value
    case 'country':
      return countryName(value, locale)
    case 'language':
      return languageName(value, locale)
    case 'decade':
      return decadeLabel(Number(value), locale)
  }
}

// Etiketler sunucuda kurulur; dizin yalnızca kimlik taşır. Yalnızca filmlerde geçen değerler girer.
export function buildFacetLabels(locale: Locale, films: ArchiveFilm[]): FacetLabels {
  const labels = Object.fromEntries(FILTER_KEYS.map((key) => [key, {}])) as FacetLabels
  for (const key of FILTER_KEYS)
    for (const film of films)
      for (const value of filmValues(film, key)) labels[key][value] ??= label(key, value, locale)
  return labels
}

export function heroStats(films: ArchiveFilm[]): HeroStats {
  const years = films.map((film) => film.year)
  return {
    films: films.length,
    from: Math.min(...years),
    to: Math.max(...years),
    countries: new Set(films.flatMap((film) => film.countries)).size,
  }
}
