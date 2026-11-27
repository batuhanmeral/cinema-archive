import type { Locale } from '@/lib/i18n/locale'

export const FILM_SLUGS_URL = '/archive-data/film-slugs.json'

export function archiveIndexUrl(locale: Locale): string {
  return `/archive-data/index-${locale}.json`
}
