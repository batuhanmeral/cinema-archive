import type { Collection, Film, Genre, Person, Theme } from '@/data/schemas'
import { presentOverview } from '@/features/film/view-model'
import { countryName } from '@/lib/i18n/display-names'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { collectionHref, filmHref } from '@/lib/i18n/routes'
import { genreLinks, personLink, themeLinks, type LinkItem } from '@/lib/link-items'

export type CollectionRow = {
  number: number
  href: string
  posterPath: string | null
  title: string
  year: number
  originalTitle: string | null
  overview: string | null
  directors: LinkItem[]
  genres: LinkItem[]
  themes: LinkItem[]
}

export type OtherCollection = {
  name: string
  href: string
  meta: string
  imagePath: string | null
}

export type CollectionView = {
  name: string
  meta: string
  heroImage: string | null
  tileImage: string | null
  rows: CollectionRow[]
  others: OtherCollection[]
}

export type CollectionViewContext = {
  films: (id: number) => Film | undefined
  people: Map<number, Person>
  genres: Map<number, Genre>
  themes: Map<number, Theme>
  collections: Collection[]
}

const META_SEPARATOR = ' · '
// Ülke yalnızca filmlerin en az yarısında ortaksa künyeye girer (global kısıtlar).
const COUNTRY_SHARE = 0.5
const OTHERS_COUNT = 3

export function collectionCount(count: number, locale: Locale): string {
  return messages[locale].collection.filmCount(count)
}

// Eşitlikte ülke koduna göre sıralanır; sonuç her derlemede aynı kalır.
function dominantCountry(films: Film[]): string | null {
  const counts = new Map<string, number>()
  for (const film of films) {
    for (const code of new Set(film.countries)) counts.set(code, (counts.get(code) ?? 0) + 1)
  }
  const [top] = [...counts].sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
  return top && top[1] >= films.length * COUNTRY_SHARE ? top[0] : null
}

function yearsText(films: Film[]): string {
  const years = films.map((film) => film.year)
  const first = Math.min(...years)
  const last = Math.max(...years)
  return first === last ? String(first) : `${first}–${last}`
}

export function collectionMeta(_collection: Collection, films: Film[], locale: Locale): string {
  const country = dominantCountry(films)
  return [
    yearsText(films),
    country ? countryName(country, locale) : null,
    collectionCount(films.length, locale),
  ]
    .filter((part) => part !== null)
    .join(META_SEPARATOR)
}

function memberFilms(collection: Collection, ctx: CollectionViewContext): Film[] {
  return collection.filmIds
    .map((id) => ctx.films(id))
    .filter((film) => film !== undefined)
    .sort((a, b) => a.year - b.year)
}

function byVotes(films: Film[]): Film[] {
  return [...films].sort((a, b) => b.voteCount - a.voteCount || a.tmdbId - b.tmdbId)
}

function heroPoster(films: Film[], locale: Locale): string | null {
  return byVotes(films).find((film) => film.poster[locale])?.poster[locale] ?? null
}

function tileBackdrop(films: Film[]): string | null {
  return byVotes(films).find((film) => film.backdrops.length > 0)?.backdrops[0] ?? null
}

function directorsOf(film: Film, locale: Locale, people: Map<number, Person>): LinkItem[] {
  return film.crew
    .filter((member) => member.job === 'director')
    .map((member) => people.get(member.personId))
    .filter((person) => person !== undefined)
    .map((person) => personLink(person, locale))
}

function row(
  film: Film,
  number: number,
  locale: Locale,
  ctx: CollectionViewContext,
): CollectionRow {
  const title = film.title[locale]
  return {
    number,
    href: filmHref(locale, film.slug),
    posterPath: film.poster[locale],
    title,
    year: film.year,
    originalTitle: film.originalTitle === title ? null : film.originalTitle,
    overview: presentOverview(film, locale),
    directors: directorsOf(film, locale, ctx.people),
    genres: genreLinks(film.genreIds, locale, ctx.genres),
    themes: themeLinks(film.keywordIds, locale, ctx.themes),
  }
}

function otherTile(
  collection: Collection,
  locale: Locale,
  ctx: CollectionViewContext,
): OtherCollection {
  const films = memberFilms(collection, ctx)
  return {
    name: collection.name[locale],
    href: collectionHref(locale, collection.slug),
    meta: collectionCount(films.length, locale),
    imagePath: tileBackdrop(films),
  }
}

// Sıradaki üç koleksiyon, liste sonunda başa sarar; koleksiyonun kendisi hiç görünmez.
function nextCollections(collection: Collection, all: Collection[]): Collection[] {
  const at = all.findIndex((c) => c.slug === collection.slug)
  const following = [...all.slice(at + 1), ...all.slice(0, Math.max(at, 0))]
  return following.filter((c) => c.slug !== collection.slug).slice(0, OTHERS_COUNT)
}

export function buildCollectionView(
  collection: Collection,
  locale: Locale,
  ctx: CollectionViewContext,
): CollectionView {
  const films = memberFilms(collection, ctx)
  return {
    name: collection.name[locale],
    meta: collectionMeta(collection, films, locale),
    heroImage: heroPoster(films, locale),
    tileImage: tileBackdrop(films),
    rows: films.map((film, i) => row(film, i + 1, locale, ctx)),
    others: nextCollections(collection, ctx.collections).map((c) => otherTile(c, locale, ctx)),
  }
}
