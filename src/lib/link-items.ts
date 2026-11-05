import type { Genre, Person, Theme } from '@/data/schemas'
import type { Locale } from '@/lib/i18n/locale'
import { archiveHref, personHref, type ArchiveFilter } from '@/lib/i18n/routes'

// prefetch: false, sayfası henüz olmayan hedefler içindir (arşiv M4, kişi M5).
export type LinkItem = { text: string; href?: string; prefetch?: false }

// Arşiv sayfası M4'te gelir; kural tek yerde dursun diye tüm arşiv bağlantıları buradan geçer.
export function archiveLink(locale: Locale, filter: ArchiveFilter, text: string): LinkItem {
  return { text, href: archiveHref(locale, filter), prefetch: false }
}

export function personLink(person: Person, locale: Locale): LinkItem {
  return person.slug
    ? { text: person.name, href: personHref(locale, person.slug), prefetch: false }
    : { text: person.name }
}

export function genreLinks(
  genreIds: number[],
  locale: Locale,
  genres: Map<number, Genre>,
): LinkItem[] {
  return genreIds
    .map((id) => genres.get(id))
    .filter((genre) => genre !== undefined)
    .map((genre) => archiveLink(locale, { genre: genre.id }, genre[locale]))
}

// Yalnızca content/themes.json'daki seçilmiş anahtar kelimeler tema olarak görünür.
export function themeLinks(
  keywordIds: number[],
  locale: Locale,
  themes: Map<number, Theme>,
): LinkItem[] {
  return keywordIds
    .map((id) => themes.get(id))
    .filter((theme) => theme !== undefined)
    .map((theme) => archiveLink(locale, { theme: theme.keywordId }, theme[locale]))
}
