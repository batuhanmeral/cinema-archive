import { HttpError } from '../lib/http'
import type { MatchFix, MovementList } from '../schemas'
import type { TmdbMovie, TmdbSearchHit } from '../sources/tmdb'
import type { CultListEntry } from '../sources/wikipedia'
import { movieDirectors, movieYear } from '../transform/film'
import { type Candidate, decideMatch, type MatchDecision } from './match'

const SEARCH_YEAR_TOLERANCE = 1
const SEARCH_CANDIDATE_LIMIT = 5
const NOT_FOUND = 404

export type MovieLoader = (id: number) => Promise<TmdbMovie | null>

export type RowDeps = {
  fixes: MatchFix[]
  searchMovies(query: string): Promise<TmdbSearchHit[]>
}

// Aynı film birden çok satırdan istenebilir; tek istek yapılır. 404 yalnızca "yok" demektir.
export function createMovieLoader(fetchMovie: (id: number) => Promise<TmdbMovie>): MovieLoader {
  const cache = new Map<number, Promise<TmdbMovie | null>>()
  return (id) => {
    let pending = cache.get(id)
    if (!pending) {
      pending = fetchMovie(id).catch((error: unknown) => {
        if (error instanceof HttpError && error.status === NOT_FOUND) return null
        throw error
      })
      cache.set(id, pending)
    }
    return pending
  }
}

export async function loadMovies(load: MovieLoader, ids: number[]): Promise<TmdbMovie[]> {
  const movies = await Promise.all(ids.map(load))
  return movies.filter((movie): movie is TmdbMovie => movie !== null)
}

export function requireYear(movie: TmdbMovie): number {
  const year = movieYear(movie)
  if (year === null) throw new Error(`TMDB movie ${movie.id} has no valid release date`)
  return year
}

function searchHitIds(hits: TmdbSearchHit[], row: CultListEntry): number[] {
  return hits
    .filter((hit) => {
      const year = Number(hit.release_date.slice(0, 4))
      return /^\d{4}/.test(hit.release_date) && Math.abs(year - row.year) <= SEARCH_YEAR_TOLERANCE
    })
    .slice(0, SEARCH_CANDIDATE_LIMIT)
    .map((hit) => hit.id)
}

function toCandidate(movie: TmdbMovie): Candidate {
  return {
    tmdbId: movie.id,
    title: movie.title,
    year: movieYear(movie),
    directors: movieDirectors(movie),
    adult: movie.adult,
  }
}

export type RowResult = { row: CultListEntry; decision: MatchDecision }

export async function decideRow(
  row: CultListEntry,
  deps: RowDeps,
  load: MovieLoader,
  wikidataIds: number[],
): Promise<RowResult> {
  const fix = deps.fixes.find((f) => f.wikiTitle === row.wikiTitle)
  const fixIds = fix?.tmdbId == null ? [] : [fix.tmdbId].flat()
  let ids: number[] = []
  if (fix) ids = fixIds
  else if (wikidataIds.length > 0) ids = wikidataIds
  else ids = searchHitIds(await deps.searchMovies(row.title), row)

  const candidates = (await loadMovies(load, ids)).map(toCandidate)
  const missingId = fixIds.find((id) => !candidates.some((c) => c.tmdbId === id))
  if (missingId !== undefined) {
    throw new Error(`Match fix for "${row.wikiTitle}" points to missing TMDB id ${missingId}`)
  }
  const decision = decideMatch(row, { fix, wikidataTmdbIds: wikidataIds, candidates })
  return { row, decision }
}

// Seri satırı film başına bir karara açılır; böylece adult ayrımı ve birleştirme kimlik başına işler.
export function expandSeries<T extends RowResult>(results: T[]): T[] {
  return results.flatMap((result) =>
    result.decision.kind === 'series'
      ? result.decision.films.map((film) => ({ ...result, decision: film }))
      : [result],
  )
}

export const matchedIds = (results: RowResult[]): number[] => [
  ...new Set(
    results.flatMap(({ decision }) => (decision.kind === 'matched' ? [decision.tmdbId] : [])),
  ),
]

type ListFilm = { title: string; year: number; directors: string[] }

export const MOVEMENT_LISTS_PAGE = 'content/movement-lists.json'
export const YESILCAM_PAGE = 'content/yesilcam.json'

const handRow = (film: ListFilm, wikiTitle: string, page: string): CultListEntry => ({
  wikiTitle,
  title: film.title,
  year: film.year,
  yearEnd: null,
  directors: film.directors,
  page,
})

// Sentetik anahtar, match-fixes.json'da el satırını kült satırları gibi düzeltmeye yarar.
export function movementListRows(
  list: MovementList,
): Array<{ row: CultListEntry; list: MovementList }> {
  return list.films.map((film) => ({
    row: handRow(
      film,
      `${list.source}:${list.movement}:${film.title} (${film.year})`,
      MOVEMENT_LISTS_PAGE,
    ),
    list,
  }))
}

export const yesilcamListRow = (film: ListFilm): CultListEntry =>
  handRow(film, `yesilcam:${film.title} (${film.year})`, YESILCAM_PAGE)
