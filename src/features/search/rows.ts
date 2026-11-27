import { MIN_QUERY_LENGTH } from '@/lib/archive-query'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { archiveHref, collectionHref, filmHref, movementHref } from '@/lib/i18n/routes'
import { normalizeText } from '@/lib/normalize-text'
import type { Matcher } from './matcher'

export type DropdownRow = {
  kind: 'movement' | 'collection' | 'film'
  href: string
  title: string
  typeLine: string
  image: string | null
}

export type DropdownResult = {
  rows: DropdownRow[]
  filmTotal: number
  archiveHref: string | null
}

const MAX_ROWS = 6
const MAX_PER_GROUP_KIND = 2

// Sıra: en çok 2 akım, 2 koleksiyon, kalan satırlar filmler (Fuse puanına göre).
export function buildDropdownRows(matcher: Matcher, query: string, locale: Locale): DropdownResult {
  if (normalizeText(query).length < MIN_QUERY_LENGTH) {
    return { rows: [], filmTotal: 0, archiveHref: null }
  }
  const t = messages[locale].search
  const groups = matcher.groups(query)
  const groupRows = (['movement', 'collection'] as const).flatMap((kind) =>
    groups
      .filter((hit) => hit.group.kind === kind)
      .slice(0, MAX_PER_GROUP_KIND)
      .map(({ group }) => ({
        kind,
        href:
          kind === 'movement'
            ? movementHref(locale, group.slug)
            : collectionHref(locale, group.slug),
        title: group.name,
        typeLine:
          kind === 'movement' ? t.movementLine(group.filmCount) : t.collectionLine(group.filmCount),
        image: group.image,
      })),
  )
  const films = matcher.films(query)
  const filmRows = films.slice(0, MAX_ROWS - groupRows.length).map(({ film }) => ({
    kind: 'film' as const,
    href: filmHref(locale, film.slug),
    title: film.title,
    typeLine: t.filmLine(film.year),
    image: film.poster,
  }))
  return {
    rows: [...groupRows, ...filmRows],
    filmTotal: films.length,
    archiveHref: films.length > 0 ? archiveHref(locale, { q: query }) : null,
  }
}
