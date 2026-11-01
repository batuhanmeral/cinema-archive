import type { Film, Movement } from '../../src/data/schemas'
import { loadMovies, type MovieLoader, requireYear } from '../match/rows'
import { type TitleDeps, tmdbIdByTitle } from '../match/titles'
import type { MovementContent, MovementList } from '../schemas'
import type { TmdbMovie } from '../sources/tmdb'
import { movieYear } from '../transform/film'
import {
  fitsMovement,
  type MovementCandidate,
  type MovementSource,
  selectMovementFilms,
} from './select'

export type MovementDeps = TitleDeps & {
  articleFilmLinks(article: string): Promise<string[]>
  categoryMembers(category: string): Promise<string[]>
}

export type HandFilm = { movie: TmdbMovie; source: MovementList['source'] }

export type AdultCandidate = { wikiTitle: string; tmdbId: number; title: string }

export type MovementGathering = {
  selection: MovementCandidate[]
  candidates: number
  adultExcluded: AdultCandidate[]
}

type WikiSource = Extract<MovementSource, 'article' | 'category'>

async function wikiSourcesByTitle(
  movement: MovementContent,
  deps: MovementDeps,
): Promise<Map<string, Set<WikiSource>>> {
  const { article, categories } = movement.wikipedia
  const found: Array<[string[], WikiSource]> = [
    [await deps.articleFilmLinks(article), 'article'],
    ...(await Promise.all(categories.map((category) => deps.categoryMembers(category)))).map(
      (titles) => [titles, 'category'] as [string[], WikiSource],
    ),
  ]
  const sources = new Map<string, Set<WikiSource>>()
  for (const [titles, source] of found) {
    for (const title of titles) sources.set(title, (sources.get(title) ?? new Set()).add(source))
  }
  return sources
}

const countriesOf = (movie: TmdbMovie) => movie.production_countries.map((c) => c.iso_3166_1)

function toMovementCandidate(
  movie: TmdbMovie,
  sources: ReadonlySet<MovementSource>,
  cultIds: ReadonlySet<number>,
): MovementCandidate {
  return {
    tmdbId: movie.id,
    year: requireYear(movie),
    voteCount: movie.vote_count,
    onCultList: cultIds.has(movie.id),
    sources,
  }
}

// Wiki adayları akımın yıl/ülke sınırına uymalı; el listeleri akıma özeldir, denetimsiz girer.
export async function gatherMovement(
  movement: MovementContent,
  deps: MovementDeps,
  input: { load: MovieLoader; cultIds: ReadonlySet<number>; handFilms: HandFilm[] },
): Promise<MovementGathering> {
  const sourcesByTitle = await wikiSourcesByTitle(movement, deps)
  const idByTitle = await tmdbIdByTitle(deps, [...sourcesByTitle.keys()])
  const sourcesById = new Map<number, Set<MovementSource>>()
  const titleById = new Map<number, string>()
  for (const [title, id] of idByTitle) {
    if (!titleById.has(id)) titleById.set(id, title)
    const merged = new Set<MovementSource>([
      ...(sourcesById.get(id) ?? []),
      ...(sourcesByTitle.get(title) ?? []),
    ])
    sourcesById.set(id, merged)
  }
  const fitting = (await loadMovies(input.load, [...sourcesById.keys()])).filter((movie) => {
    const year = movieYear(movie)
    return year !== null && fitsMovement(movement, { year, countries: countriesOf(movie) })
  })
  const wikiMovies = fitting.filter((movie) => !movie.adult)
  // Akıma uyan ama adult işaretli film dışlanır; sahibi görsün diye raporda listelenir.
  const adultExcluded = fitting
    .filter((movie) => movie.adult)
    .map((movie) => ({
      wikiTitle: titleById.get(movie.id) ?? movie.title,
      tmdbId: movie.id,
      title: movie.title,
    }))

  const candidates = [
    ...wikiMovies.map((movie) =>
      toMovementCandidate(movie, sourcesById.get(movie.id) ?? new Set(), input.cultIds),
    ),
    ...input.handFilms.map(({ movie, source }) =>
      toMovementCandidate(movie, new Set([source]), input.cultIds),
    ),
  ]
  return {
    selection: selectMovementFilms(candidates),
    candidates: new Set(candidates.map((c) => c.tmdbId)).size,
    adultExcluded,
  }
}

const directs = (film: Film, personId: number) =>
  film.crew.some((member) => member.job === 'director' && member.personId === personId)

// Yalnızca yayındaki seçilmiş filmler üye olur; öncü yönetmen people.json'da kalsın diye denetlenir.
export function toMovement(
  content: MovementContent,
  selection: MovementCandidate[],
  films: Film[],
): Movement {
  const byId = new Map(films.map((film) => [film.tmdbId, film]))
  const members = selection.flatMap(({ tmdbId }) => byId.get(tmdbId) ?? [])
  if (members.length === 0) throw new Error(`Movement "${content.slug}" has no published films`)
  for (const pioneer of content.pioneerIds) {
    if (!members.some((film) => directs(film, pioneer))) {
      throw new Error(`Movement "${content.slug}" pioneer ${pioneer} directs none of its films`)
    }
  }
  const { slug, name, years, countries, pioneerIds } = content
  return { slug, name, years, countries, pioneerIds, filmIds: members.map((film) => film.tmdbId) }
}
