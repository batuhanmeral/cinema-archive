import 'server-only'
import type { Collection, Film, Movement, Person, Theme } from '@/data/schemas'
import { store } from '@/lib/data'
import { LOCALES, type Locale } from '@/lib/i18n/locale'
import { buildCollectionTiles } from '@/features/collection/view-model'
import { buildMovementStrips } from '@/features/movement/view-model'
import type { ArchiveFilm, ArchiveGroup, ArchiveIndex } from './schemas'

export type ArchiveContext = {
  films: Film[]
  people: Map<number, Person>
  themes: Map<number, Theme>
  movements: Movement[]
  collections: Collection[]
  filmById: (id: number) => Film | undefined
}

const OTHER: Record<Locale, Locale> = { tr: 'en', en: 'tr' }

function filmRow(film: Film, locale: Locale, ctx: ArchiveContext): ArchiveFilm {
  return {
    slug: film.slug,
    title: film.title[locale],
    otherTitle: film.title[OTHER[locale]],
    originalTitle: film.originalTitle,
    year: film.year,
    // Yönetmenler çekim kadrosundaki sırayla gelir; ilki alt yazıdaki yönetmendir.
    directors: film.crew
      .filter((member) => member.job === 'director')
      .flatMap((member) => ctx.people.get(member.personId)?.name ?? []),
    poster: film.poster[locale],
    genres: film.genreIds,
    themes: film.keywordIds.filter((id) => ctx.themes.has(id)),
    countries: film.countries,
    languages: film.languages,
    votes: film.voteCount,
  }
}

function groupRows(locale: Locale, ctx: ArchiveContext): ArchiveGroup[] {
  const viewCtx = { films: ctx.filmById, people: ctx.people, movements: ctx.movements }
  const strips = buildMovementStrips(ctx.movements, locale, viewCtx)
  const tiles = buildCollectionTiles(ctx.collections, locale, viewCtx)
  const count = (ids: number[]) => ids.filter((id) => ctx.filmById(id)).length
  return [
    ...ctx.movements.map((m, i): ArchiveGroup => ({
      kind: 'movement',
      slug: m.slug,
      name: m.name[locale],
      otherName: m.name[OTHER[locale]],
      filmCount: count(m.filmIds),
      image: strips[i]?.imagePath ?? null,
    })),
    ...ctx.collections.map((c, i): ArchiveGroup => ({
      kind: 'collection',
      slug: c.slug,
      name: c.name[locale],
      otherName: c.name[OTHER[locale]],
      filmCount: count(c.filmIds),
      image: tiles[i]?.imagePath ?? null,
    })),
  ]
}

export function buildArchiveIndex(locale: Locale, ctx: ArchiveContext): ArchiveIndex {
  return {
    films: ctx.films.map((film) => filmRow(film, locale, ctx)),
    groups: groupRows(locale, ctx),
  }
}

export function archiveDataFiles(): string[] {
  return [...LOCALES.map((locale) => `index-${locale}.json`), 'film-slugs.json']
}

export function archiveDataBody(file: string): unknown {
  for (const locale of LOCALES) {
    if (file === `index-${locale}.json`)
      return buildArchiveIndex(locale, {
        films: store.films(),
        people: store.people(),
        themes: store.themes(),
        movements: store.movements(),
        collections: store.collections(),
        filmById: store.filmById,
      })
  }
  if (file === 'film-slugs.json') return store.films().map((film) => film.slug)
  throw new Error(`Unknown archive data file: ${file}`)
}
