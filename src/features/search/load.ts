import { archiveIndexSchema, filmSlugsSchema } from '@/features/archive/schemas'
import { FILM_SLUGS_URL, archiveIndexUrl } from '@/features/archive/urls'
import type { Locale } from '@/lib/i18n/locale'
import type { ArchiveIndex } from '@/features/archive/schemas'
import type { Matcher } from './matcher'

export type SearchData = { index: ArchiveIndex; matcher: Matcher }

const cache = new Map<Locale, Promise<SearchData>>()

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`)
  return response.json()
}

async function load(locale: Locale): Promise<SearchData> {
  const [json, { createMatcher }] = await Promise.all([
    fetchJson(archiveIndexUrl(locale)),
    import('./matcher'),
  ])
  const parsed = archiveIndexSchema.safeParse(json)
  if (!parsed.success) throw new Error('Malformed archive index')
  return { index: parsed.data, matcher: createMatcher(parsed.data) }
}

export function loadSearchData(locale: Locale): Promise<SearchData> {
  const cached = cache.get(locale)
  if (cached) return cached
  const promise = load(locale)
  cache.set(locale, promise)
  // Başarısız yükleme önbellekte kalmaz; sonraki odakta yeniden denenir.
  promise.catch(() => cache.delete(locale))
  return promise
}

let slugsPromise: Promise<string[]> | null = null

async function fetchFilmSlugs(): Promise<string[]> {
  const parsed = filmSlugsSchema.safeParse(await fetchJson(FILM_SLUGS_URL))
  if (!parsed.success) throw new Error('Malformed film slug list')
  return parsed.data
}

export function loadFilmSlugs(): Promise<string[]> {
  if (slugsPromise) return slugsPromise
  const promise = fetchFilmSlugs()
  slugsPromise = promise
  // Başarısız yükleme önbellekte kalmaz; sonraki çağrıda yeniden denenir.
  promise.catch(() => {
    if (slugsPromise === promise) slugsPromise = null
  })
  return promise
}
