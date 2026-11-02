import type { Collection, Film, Genre, Movement, Person } from '../src/data/schemas'
import { gatherCollectionFacts } from './collections/facts'
import { buildCollections } from './collections/rules'
import { type MatchedFilm, updateLock } from './lock'
import {
  createMovieLoader,
  decideRow,
  expandSeries,
  loadMovies,
  matchedIds,
  type MovieLoader,
  movementListRows,
  requireYear,
  type RowResult,
  yesilcamListRow,
} from './match/rows'
import {
  gatherMovement,
  type HandFilm,
  type MovementGathering,
  toMovement,
} from './movements/gather'
import { buildPeople } from './people'
import type {
  CollectionContent,
  GroupReport,
  ImportReport,
  KeywordStat,
  LockEntry,
  LockFile,
  MatchFix,
  MovementContent,
  MovementList,
  ReviewEntry,
  YesilcamRow,
} from './schemas'
import type { TmdbMovie, TmdbSearchHit } from './sources/tmdb'
import type { CultListEntry } from './sources/wikipedia'
import { collectPeople, toFilm } from './transform/film'

export type ImportDeps = {
  loadCultList(): Promise<CultListEntry[]>
  resolveWikidataIds(titles: string[]): Promise<Map<string, string | null>>
  tmdbIdsForQids(qids: string[]): Promise<Map<string, number[]>>
  fetchMovie(id: number): Promise<TmdbMovie>
  searchMovies(query: string): Promise<TmdbSearchHit[]>
  awardCounts(ids: number[]): Promise<Map<number, Record<string, number>>>
  fetchGenres(): Promise<Genre[]>
  categoryMembers(category: string): Promise<string[]>
  articleFilmLinks(article: string): Promise<string[]>
  genreQids(ids: number[]): Promise<Map<number, string[]>>
  movements: MovementContent[]
  movementLists: MovementList[]
  collections: CollectionContent[]
  yesilcam: YesilcamRow[]
  prevLock: LockFile | null
  prevPeople: Person[] | null
  prevMovements: Movement[] | null
  prevCollections: Collection[] | null
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
  movements: Movement[]
  collections: Collection[]
}

const CULT_LIST_SOURCE = 'cult-list'
const YESILCAM_SOURCE = 'yesilcam'
const movementSource = (slug: string) => `movement:${slug}`

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

async function decideCultRows(
  rows: CultListEntry[],
  deps: ImportDeps,
  load: MovieLoader,
): Promise<RowResult[]> {
  const qidByTitle = await deps.resolveWikidataIds(rows.map((row) => row.wikiTitle))
  const qids = [...new Set([...qidByTitle.values()].filter((q): q is string => q !== null))]
  const tmdbIdsByQid = await deps.tmdbIdsForQids(qids)
  const results = await Promise.all(
    rows.map((row) => {
      const qid = qidByTitle.get(row.wikiTitle)
      // Wikidata aynı kimliği iki kez döndürebilir; yinelenen kimlik sahte belirsizlik yaratmasın.
      const wikidataIds = [...new Set((qid && tmdbIdsByQid.get(qid)) || [])]
      return decideRow(row, deps, load, wikidataIds)
    }),
  )
  return expandSeries(results)
}

type ListResult = RowResult & { list: MovementList }

// El satırlarının Wikidata kimliği yoktur; arama yolundan (ya da match-fixes'ten) eşlenir.
async function decideHandRows(deps: ImportDeps, load: MovieLoader) {
  const known = new Set(deps.movements.map((movement) => movement.slug))
  const unknown = deps.movementLists.find((list) => !known.has(list.movement))
  if (unknown) throw new Error(`Movement list for unknown movement "${unknown.movement}"`)

  const lists: ListResult[] = await Promise.all(
    deps.movementLists.flatMap(movementListRows).map(async ({ row, list }) => ({
      ...(await decideRow(row, deps, load, [])),
      list,
    })),
  )
  const yesilcam = await Promise.all(
    deps.yesilcam.map((film) => decideRow(yesilcamListRow(film), deps, load, [])),
  )
  return { lists: expandSeries(lists), yesilcam: expandSeries(yesilcam) }
}

const handRowCount = (deps: ImportDeps) =>
  deps.movementLists.reduce((count, list) => count + list.films.length, 0) + deps.yesilcam.length

const byStartThenSlug = (a: MovementContent, b: MovementContent) =>
  a.years.start - b.years.start || a.slug.localeCompare(b.slug)

type GatheredMovement = { content: MovementContent; gathering: MovementGathering }

async function gatherMovements(
  deps: ImportDeps,
  load: MovieLoader,
  cultIds: ReadonlySet<number>,
  lists: ListResult[],
): Promise<GatheredMovement[]> {
  const ordered = [...deps.movements].sort(byStartThenSlug)
  return Promise.all(
    ordered.map(async (content) => {
      const rows = lists.filter(({ list }) => list.movement === content.slug)
      const handFilms: HandFilm[] = []
      for (const { decision, list } of rows) {
        if (decision.kind !== 'matched') continue
        const movie = await load(decision.tmdbId)
        if (movie) handFilms.push({ movie, source: list.source })
      }
      const gathering = await gatherMovement(content, deps, { load, cultIds, handFilms })
      return { content, gathering }
    }),
  )
}

// Kaynak sırası sabittir (kült, Yeşilçam, akımlar kronolojik); kilit çıktısı her koşuda aynı kalır.
async function lockInput(
  load: MovieLoader,
  groups: Array<[source: string, ids: number[]]>,
): Promise<MatchedFilm[]> {
  const sourcesById = new Map<number, string[]>()
  for (const [source, ids] of groups) {
    for (const id of ids) {
      const sources = sourcesById.get(id) ?? []
      if (!sources.includes(source)) sourcesById.set(id, [...sources, source])
    }
  }
  return (await loadMovies(load, [...sourcesById.keys()])).map((movie) => ({
    tmdbId: movie.id,
    title: movie.title,
    year: requireYear(movie),
    sources: sourcesById.get(movie.id) ?? [],
  }))
}

// Önceki dosya yoksa her film "added" sayılır; rapor PR'da liste değişikliği olarak okunur.
function groupReport(
  slug: string,
  filmIds: number[],
  candidates: number,
  prev: Array<{ slug: string; filmIds: number[] }> | null,
): GroupReport {
  const before = prev?.find((group) => group.slug === slug)?.filmIds ?? []
  return {
    slug,
    films: filmIds.length,
    candidates,
    added: filmIds.filter((id) => !before.includes(id)),
    removed: before.filter((id) => !filmIds.includes(id)),
  }
}

export async function runImport(deps: ImportDeps): Promise<ImportOutput> {
  const load = createMovieLoader(deps.fetchMovie)
  const rows = await deps.loadCultList()
  const cultResults = await decideCultRows(rows, deps, load)
  const hand = await decideHandRows(deps, load)
  const results = [...cultResults, ...hand.lists, ...hand.yesilcam]

  const cultIds = matchedIds(cultResults)
  const movementGroups = await gatherMovements(deps, load, new Set(cultIds), hand.lists)
  const matched = await lockInput(load, [
    [CULT_LIST_SOURCE, cultIds],
    [YESILCAM_SOURCE, matchedIds(hand.yesilcam)],
    ...movementGroups.map(({ content, gathering }): [string, number[]] => [
      movementSource(content.slug),
      gathering.selection.map((candidate) => candidate.tmdbId),
    ]),
  ])

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
  const movementAdults = movementGroups.flatMap(({ gathering }) => gathering.adultExcluded)
  for (const entry of movementAdults) {
    if (!reportParts.adultExcluded.some((listed) => listed.tmdbId === entry.tmdbId)) {
      reportParts.adultExcluded.push(entry)
    }
  }
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

  const movementResults = movementGroups.map(({ content, gathering }) => {
    const movement = toMovement(content, gathering.selection, films)
    const { slug, filmIds } = movement
    return {
      movement,
      report: groupReport(slug, filmIds, gathering.candidates, deps.prevMovements),
    }
  })
  const factsOf = await gatherCollectionFacts(deps.collections, films, deps)
  const { collections, sizes } = buildCollections(deps.collections, films, factsOf)
  const groups: ImportReport['groups'] = {
    movements: movementResults.map(({ report }) => report),
    collections: deps.collections.map(({ slug }) => {
      const filmIds = collections.find((c) => c.slug === slug)?.filmIds ?? []
      return groupReport(slug, filmIds, sizes.get(slug) ?? 0, deps.prevCollections)
    }),
  }

  const report: ImportReport = {
    generatedAt: deps.now,
    counts: {
      listRows: rows.length + handRowCount(deps),
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
    groups,
  }
  return {
    films,
    people,
    genres: await deps.fetchGenres(),
    lock,
    report,
    keywords: keywordStats(publishable),
    movements: movementResults.map(({ movement }) => movement),
    collections,
  }
}
