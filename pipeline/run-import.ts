import type { Film, Genre, Person } from '../src/data/schemas'
import { HttpError } from './lib/http'
import { updateLock } from './lock'
import { type Candidate, decideMatch, type MatchDecision } from './match/match'
import { buildPeople } from './people'
import type {
  ImportReport,
  KeywordStat,
  LockEntry,
  LockFile,
  MatchFix,
  ReviewEntry,
} from './schemas'
import type { TmdbMovie, TmdbSearchHit } from './sources/tmdb'
import type { CultListEntry } from './sources/wikipedia'
import { collectPeople, movieDirectors, movieYear, toFilm } from './transform/film'

export type ImportDeps = {
  loadCultList(): Promise<CultListEntry[]>
  resolveWikidataIds(titles: string[]): Promise<Map<string, string | null>>
  tmdbIdsForQids(qids: string[]): Promise<Map<string, number[]>>
  fetchMovie(id: number): Promise<TmdbMovie>
  searchMovies(query: string): Promise<TmdbSearchHit[]>
  awardCounts(ids: number[]): Promise<Map<number, Record<string, number>>>
  fetchGenres(): Promise<Genre[]>
  prevLock: LockFile | null
  prevPeople: Person[] | null
  fixes: MatchFix[]
  today: string
  now: string
}

export type ImportOutput = {
  films: Film[]
  people: Person[]
  genres: Genre[]
  lock: LockFile
  report: ImportReport
  keywords: KeywordStat[]
}

const SEARCH_YEAR_TOLERANCE = 1
const SEARCH_CANDIDATE_LIMIT = 5
const CULT_LIST_SOURCE = 'cult-list'
const NOT_FOUND = 404

type MovieLoader = (id: number) => Promise<TmdbMovie | null>

// Aynı film birden çok satırdan istenebilir; tek istek yapılır. 404 yalnızca "yok" demektir.
function createMovieLoader(fetchMovie: ImportDeps['fetchMovie']): MovieLoader {
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

async function loadMovies(load: MovieLoader, ids: number[]): Promise<TmdbMovie[]> {
  const movies = await Promise.all(ids.map(load))
  return movies.filter((movie): movie is TmdbMovie => movie !== null)
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

type RowResult = { row: CultListEntry; decision: MatchDecision }

async function decideRow(
  row: CultListEntry,
  deps: ImportDeps,
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

function requireMovie(movie: TmdbMovie | null, id: number): TmdbMovie {
  if (!movie) throw new Error(`TMDB movie ${id} no longer exists but is in the lock`)
  return movie
}

function keywordStats(movies: TmdbMovie[]): KeywordStat[] {
  const stats = new Map<number, KeywordStat>()
  for (const movie of movies) {
    for (const { id, name } of movie.keywords.keywords) {
      const stat = stats.get(id) ?? { id, name, films: 0 }
      stats.set(id, { ...stat, films: stat.films + 1 })
    }
  }
  return [...stats.values()].sort((a, b) => b.films - a.films || a.id - b.id)
}

const toRef = ({ tmdbId, slug }: LockEntry) => ({ tmdbId, slug })

async function movieTitle(load: MovieLoader, id: number): Promise<string> {
  return requireMovie(await load(id), id).title
}

async function buildReport(
  results: RowResult[],
  load: MovieLoader,
): Promise<Pick<ImportReport, 'review' | 'adultExcluded' | 'skipped'>> {
  const review: ReviewEntry[] = []
  const adultExcluded: ImportReport['adultExcluded'] = []
  const skipped: ImportReport['skipped'] = []
  for (const { row, decision } of results) {
    if (decision.kind === 'review') {
      review.push({
        wikiTitle: row.wikiTitle,
        title: row.title,
        year: row.year,
        directors: row.directors,
        reason: decision.reason,
        candidates: decision.candidates.map(({ tmdbId, title, year }) => ({ tmdbId, title, year })),
      })
    } else if (decision.kind === 'adult') {
      const title = await movieTitle(load, decision.tmdbId)
      adultExcluded.push({ wikiTitle: row.wikiTitle, tmdbId: decision.tmdbId, title })
    } else if (decision.kind === 'skipped') {
      skipped.push({ wikiTitle: row.wikiTitle, note: decision.note })
    }
  }
  return { review, adultExcluded, skipped }
}

export async function runImport(deps: ImportDeps): Promise<ImportOutput> {
  const rows = await deps.loadCultList()
  const qidByTitle = await deps.resolveWikidataIds(rows.map((row) => row.wikiTitle))
  const qids = [...new Set([...qidByTitle.values()].filter((q): q is string => q !== null))]
  const tmdbIdsByQid = await deps.tmdbIdsForQids(qids)
  const load = createMovieLoader(deps.fetchMovie)

  const rowResults = await Promise.all(
    rows.map((row) => {
      const qid = qidByTitle.get(row.wikiTitle)
      // Wikidata aynı kimliği iki kez döndürebilir; yinelenen kimlik sahte belirsizlik yaratmasın.
      const wikidataIds = [...new Set((qid && tmdbIdsByQid.get(qid)) || [])]
      return decideRow(row, deps, load, wikidataIds)
    }),
  )
  // Seri satırı film başına bir karara açılır; böylece adult ayrımı ve birleştirme kimlik başına işler.
  const results = rowResults.flatMap(({ row, decision }) =>
    decision.kind === 'series'
      ? decision.films.map((film) => ({ row, decision: film }))
      : [{ row, decision }],
  )

  const matchedIds = [
    ...new Set(
      results.flatMap(({ decision }) => (decision.kind === 'matched' ? [decision.tmdbId] : [])),
    ),
  ]
  const matched = (await loadMovies(load, matchedIds)).map((movie) => {
    const year = movieYear(movie)
    if (year === null) throw new Error(`TMDB movie ${movie.id} has no valid release date`)
    return { tmdbId: movie.id, title: movie.title, year, sources: [CULT_LIST_SOURCE] }
  })

  const { lock, added, missingFromSources } = updateLock(deps.prevLock, matched, deps.today)
  const movies = await Promise.all(
    lock.films.map(async (entry) => requireMovie(await load(entry.tmdbId), entry.tmdbId)),
  )
  // Sonradan adult işaretlenen kilitli film kilitte kalır (slug rezerve) ama yayınlanmaz.
  const publishable = movies.filter((movie) => !movie.adult)
  const adultIds = new Set(movies.filter((movie) => movie.adult).map((movie) => movie.id))
  const awards = await deps.awardCounts(publishable.map((movie) => movie.id))
  const slugById = new Map(lock.films.map((entry) => [entry.tmdbId, entry]))

  const films = publishable
    .map((movie) => {
      const entry = slugById.get(movie.id) as LockEntry
      return toFilm(movie, {
        slug: entry.slug,
        sources: entry.sources,
        awards: awards.get(movie.id) ?? {},
      })
    })
    .sort((a, b) => a.slug.localeCompare(b.slug))

  const refs = new Map<number, { name: string; profilePath: string | null }>()
  for (const movie of publishable) {
    for (const [id, ref] of collectPeople(movie)) if (!refs.has(id)) refs.set(id, ref)
  }
  const people = buildPeople(films, refs, deps.prevPeople)
  const reportParts = await buildReport(results, load)
  const listedAdultIds = new Set(reportParts.adultExcluded.map((entry) => entry.tmdbId))
  for (const movie of movies) {
    if (adultIds.has(movie.id) && !listedAdultIds.has(movie.id)) {
      reportParts.adultExcluded.push({
        wikiTitle: movie.title,
        tmdbId: movie.id,
        title: movie.title,
      })
    }
  }
  const missingPublishable = missingFromSources.filter((entry) => !adultIds.has(entry.tmdbId))

  const report: ImportReport = {
    generatedAt: deps.now,
    counts: {
      listRows: rows.length,
      films: films.length,
      added: added.length,
      missingFromSources: missingPublishable.length,
      review: reportParts.review.length,
      adultExcluded: reportParts.adultExcluded.length,
      skipped: reportParts.skipped.length,
    },
    added: added.map(toRef),
    missingFromSources: missingPublishable.map(toRef),
    ...reportParts,
  }
  return {
    films,
    people,
    genres: await deps.fetchGenres(),
    lock,
    report,
    keywords: keywordStats(publishable),
  }
}
