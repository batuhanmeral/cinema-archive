import { awardGroupsFileSchema, themesFileSchema } from '../src/data/schemas'
import { CACHE_DIR, CONCURRENCY, userAgent } from './config'
import { readContent } from './content'
import { loadPipelineEnv } from './env'
import { createHttpClient } from './lib/http'
import {
  collectionContentFileSchema,
  matchFixesFileSchema,
  movementContentFileSchema,
  movementListsFileSchema,
  yesilcamFileSchema,
} from './schemas'
import { runImport } from './run-import'
import { fetchGenres, fetchMovie, searchMovies } from './sources/tmdb'
import { fetchAwardCounts, fetchGenreQids, fetchTmdbIdsForQids } from './sources/wikidata'
import { fetchCultList, resolveWikidataIds } from './sources/wikipedia'
import { fetchArticleFilmLinks, fetchCategoryMembers } from './sources/wikipedia-pages'
import { readPreviousState, writeImportOutput } from './write-output'

const DATA_DIR = 'data'
const CONTENT_DIR = 'content'

async function main(): Promise<void> {
  const env = loadPipelineEnv(process.env)
  const cacheDir = process.argv.includes('--fresh') ? null : CACHE_DIR
  const common = { userAgent: userAgent(env.siteUrl), cacheDir }
  // Token yalnızca TMDB istemcisine verilir; diğer istemciler onu hiç görmez.
  const tmdb = createHttpClient({
    ...common,
    concurrency: CONCURRENCY.tmdb,
    headers: { Authorization: `Bearer ${env.tmdbAccessToken}` },
  })
  const wikipedia = createHttpClient({ ...common, concurrency: CONCURRENCY.wikipedia })
  const wikidata = createHttpClient({ ...common, concurrency: CONCURRENCY.wikidata })

  await readContent(CONTENT_DIR, 'themes.json', themesFileSchema)
  const awardGroups = await readContent(CONTENT_DIR, 'awards.json', awardGroupsFileSchema)
  const fixes = await readContent(CONTENT_DIR, 'match-fixes.json', matchFixesFileSchema)
  const movements = await readContent(CONTENT_DIR, 'movements.json', movementContentFileSchema)
  const movementLists = await readContent(
    CONTENT_DIR,
    'movement-lists.json',
    movementListsFileSchema,
  )
  const collections = await readContent(
    CONTENT_DIR,
    'collections.json',
    collectionContentFileSchema,
  )
  const yesilcam = await readContent(CONTENT_DIR, 'yesilcam.json', yesilcamFileSchema)
  const prev = await readPreviousState(DATA_DIR)
  const clock = new Date()

  const output = await runImport({
    loadCultList: () => fetchCultList(wikipedia),
    resolveWikidataIds: (titles) => resolveWikidataIds(wikipedia, titles),
    tmdbIdsForQids: (qids) => fetchTmdbIdsForQids(wikidata, qids),
    fetchMovie: (id) => fetchMovie(tmdb, id),
    searchMovies: (query) => searchMovies(tmdb, query),
    awardCounts: (ids) => fetchAwardCounts(wikidata, ids, awardGroups),
    fetchGenres: () => fetchGenres(tmdb),
    categoryMembers: (category) => fetchCategoryMembers(wikipedia, category),
    articleFilmLinks: (article) => fetchArticleFilmLinks(wikipedia, article),
    genreQids: (ids) => fetchGenreQids(wikidata, ids),
    movements,
    movementLists,
    collections,
    yesilcam,
    prevLock: prev.lock,
    prevPeople: prev.people,
    prevMovements: prev.movements,
    prevCollections: prev.collections,
    fixes,
    today: clock.toISOString().slice(0, 10),
    now: clock.toISOString(),
  })
  await writeImportOutput(DATA_DIR, output)
  console.log(JSON.stringify(output.report.counts))
}

main().catch((error: unknown) => {
  // Yalnızca mesaj yazılır; stack ve başlıklar (token) çıktıya girmez.
  console.error(error instanceof Error ? error.message : 'Import failed')
  process.exitCode = 1
})
