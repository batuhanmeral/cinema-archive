import type { Metadata } from 'next'
import type { Film } from '@/data/schemas'
import type { Locale } from '@/lib/i18n/locale'
import { filmHref } from '@/lib/i18n/routes'
import { presentOverview } from './view-model'

const SITE_NAME = 'Sinema Arşivi'
const DESCRIPTION_LIMIT = 160
const ELLIPSIS = '…'
const OG_POSTER_BASE = 'https://image.tmdb.org/t/p/w780'

// Arama sonuçlarında görünen uzunluk; kelime ortasından kesilmez.
function truncateAtWord(text: string, limit: number): string {
  if (text.length <= limit) return text
  const head = text.slice(0, limit - ELLIPSIS.length + 1)
  const lastSpace = head.lastIndexOf(' ')
  const cut = lastSpace > 0 ? head.slice(0, lastSpace) : head.slice(0, -1)
  return `${cut.trimEnd()}${ELLIPSIS}`
}

export function buildFilmMetadata(film: Film, locale: Locale, siteUrl: string): Metadata {
  const overview = presentOverview(film, locale)
  const poster = film.poster[locale]
  return {
    title: `${film.title[locale]} (${film.year}) · ${SITE_NAME}`,
    ...(overview && { description: truncateAtWord(overview, DESCRIPTION_LIMIT) }),
    alternates: {
      canonical: `${siteUrl}${filmHref(locale, film.slug)}`,
      languages: {
        tr: `${siteUrl}${filmHref('tr', film.slug)}`,
        en: `${siteUrl}${filmHref('en', film.slug)}`,
      },
    },
    ...(poster && { openGraph: { images: [`${OG_POSTER_BASE}${poster}`] } }),
  }
}
