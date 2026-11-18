import 'server-only'
import type { Film, Movement, Person } from '@/data/schemas'
import { buildCollectionTiles, type OtherCollection } from '@/features/collection/view-model'
import { directorYearCaption, presentOverview } from '@/features/film/view-model'
import {
  buildMovementStrips,
  movementMeta,
  type HallLink,
  type MovementViewContext,
} from '@/features/movement/view-model'
import { store } from '@/lib/data'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { filmHref, movementHref, personHref } from '@/lib/i18n/routes'
import { ROTATION } from './rotation'
import type { DirectorItem, PerdeFilm, PosterItem } from './schemas'

export type PerdeFrameData = {
  slot: number
  name: string
  href: string
  meta: string
  films: PerdeFilm[]
  total: number
  dataUrl: string
}
export type HomeView = {
  frames: PerdeFrameData[]
  strips: HallLink[]
  collections: OtherCollection[]
  initialCollections: OtherCollection[]
  posters: PosterItem[]
  directors: DirectorItem[]
  postersUrl: string
  directorsUrl: string
}

export function homeDataUrl(file: string): string {
  return `/home-data/${file}`
}

function byVotes(a: Film, b: Film): number {
  return b.voteCount - a.voteCount || a.year - b.year || a.slug.localeCompare(b.slug)
}

export function buildPerdeFilms(
  movement: Movement,
  locale: Locale,
  ctx: MovementViewContext,
): PerdeFilm[] {
  return movement.filmIds
    .map((id) => ctx.films(id))
    .filter((film) => film !== undefined)
    .sort(byVotes)
    .map((film) => ({
      href: filmHref(locale, film.slug),
      title: film.title[locale],
      caption: directorYearCaption(film, ctx.people),
      overview: presentOverview(film, locale),
      image: film.backdrops[0] ?? film.poster[locale],
    }))
}

export function buildPosterPool(
  films: Film[],
  locale: Locale,
  people: Map<number, Person>,
): PosterItem[] {
  return [...films].sort(byVotes).flatMap((film) => {
    const posterPath = film.poster[locale]
    return posterPath
      ? [
          {
            href: filmHref(locale, film.slug),
            posterPath,
            title: film.title[locale],
            caption: directorYearCaption(film, people),
          },
        ]
      : []
  })
}

export function buildDirectorPool(
  films: Film[],
  locale: Locale,
  people: Map<number, Person>,
): DirectorItem[] {
  const counts = new Map<number, number>()
  for (const film of films) {
    const ids = new Set(
      film.crew.filter((member) => member.job === 'director').map((member) => member.personId),
    )
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return [...counts]
    .sort(([a, x], [b, y]) => y - x || a - b)
    .flatMap(([id, count]) => {
      const person = people.get(id)
      return count >= 3 && person?.slug && person.profilePath
        ? [
            {
              name: person.name,
              href: personHref(locale, person.slug),
              profilePath: person.profilePath,
              note: messages[locale].movement.filmCount(count),
            },
          ]
        : []
    })
}

export function buildHomeView(locale: Locale): HomeView {
  const movements = store.movements()
  const ordered = ROTATION.map((slug) => movements.find((movement) => movement.slug === slug)!)
  const films = store.films()
  const people = store.people()
  const ctx: MovementViewContext = { films: store.filmById, people, movements }
  const collections = buildCollectionTiles(store.collections(), locale, ctx)
  return {
    frames: ordered.map((movement, slot) => {
      const films = buildPerdeFilms(movement, locale, ctx)
      return {
        slot,
        name: movement.name[locale],
        href: movementHref(locale, movement.slug),
        meta: movementMeta(movement, locale, { films: films.length }),
        films: films.slice(0, 1),
        total: films.length,
        dataUrl: homeDataUrl(`perde-${locale}-${movement.slug}.json`),
      }
    }),
    strips: buildMovementStrips(ordered, locale, ctx),
    collections,
    initialCollections: collections.slice(0, 6),
    posters: buildPosterPool(films, locale, people).slice(0, 16),
    directors: buildDirectorPool(films, locale, people).slice(0, 12),
    postersUrl: homeDataUrl(`films-${locale}.json`),
    directorsUrl: homeDataUrl(`directors-${locale}.json`),
  }
}
