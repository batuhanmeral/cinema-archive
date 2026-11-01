import type { Locale } from './locale'

// Çevrilen ilk URL parçaları; dil değiştirirken slug ve sorgu olduğu gibi kalır.
const SEGMENTS = {
  film: { tr: 'film', en: 'film' },
  movement: { tr: 'akim', en: 'movement' },
  movements: { tr: 'akimlar', en: 'movements' },
  collection: { tr: 'koleksiyon', en: 'collection' },
  collections: { tr: 'koleksiyonlar', en: 'collections' },
  person: { tr: 'kisi', en: 'person' },
  directors: { tr: 'yonetmenler', en: 'directors' },
  archive: { tr: 'arsiv', en: 'archive' },
} as const satisfies Record<string, Record<Locale, string>>

const EN_PREFIX = '/en'

export type ArchiveFilter = Partial<
  Record<'genre' | 'theme' | 'country' | 'decade' | 'language', string | number>
>

function localePath(locale: Locale, segments: string[]): string {
  const path = segments.join('/')
  if (locale === 'tr') return `/${path}`
  return path ? `${EN_PREFIX}/${path}` : EN_PREFIX
}

export function homeHref(locale: Locale): string {
  return localePath(locale, [])
}

export function filmHref(locale: Locale, slug: string): string {
  return localePath(locale, [SEGMENTS.film[locale], slug])
}

export function personHref(locale: Locale, slug: string): string {
  return localePath(locale, [SEGMENTS.person[locale], slug])
}

export function movementHref(locale: Locale, slug: string): string {
  return localePath(locale, [SEGMENTS.movement[locale], slug])
}

export function movementsHref(locale: Locale): string {
  return localePath(locale, [SEGMENTS.movements[locale]])
}

export function collectionHref(locale: Locale, slug: string): string {
  return localePath(locale, [SEGMENTS.collection[locale], slug])
}

export function collectionsHref(locale: Locale): string {
  return localePath(locale, [SEGMENTS.collections[locale]])
}

export function archiveHref(locale: Locale, filter: ArchiveFilter): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined) query.set(key, String(value))
  }
  const path = localePath(locale, [SEGMENTS.archive[locale]])
  return query.size > 0 ? `${path}?${query}` : path
}

function translateSegment(segment: string, from: Locale, to: Locale): string {
  const match = Object.values(SEGMENTS).find((names) => names[from] === segment)
  return match ? match[to] : segment
}

export function switchLocalePath(path: string, to: Locale): string {
  const queryStart = path.indexOf('?')
  const pathname = queryStart === -1 ? path : path.slice(0, queryStart)
  const query = queryStart === -1 ? '' : path.slice(queryStart)
  const isEnglish = pathname === EN_PREFIX || pathname.startsWith(`${EN_PREFIX}/`)
  const from: Locale = isEnglish ? 'en' : 'tr'
  const rest = isEnglish ? pathname.slice(EN_PREFIX.length) : pathname
  const [first, ...others] = rest.split('/').filter(Boolean)
  const segments = first === undefined ? [] : [translateSegment(first, from, to), ...others]
  return localePath(to, segments) + query
}
