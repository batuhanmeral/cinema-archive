import { readFile } from 'node:fs/promises'
import type { z } from 'zod'
import { awardGroupsFileSchema, themesFileSchema } from '../src/data/schemas'
import { CACHE_DIR, CONCURRENCY, userAgent } from './config'
import { loadPipelineEnv } from './env'
import { createHttpClient } from './lib/http'
import { matchFixesFileSchema } from './schemas'
import { runImport } from './run-import'
import { fetchGenres, fetchMovie, searchMovies } from './sources/tmdb'
import { fetchAwardCounts, fetchTmdbIdsForQids } from './sources/wikidata'
import { fetchCultList, resolveWikidataIds } from './sources/wikipedia'
import { readPreviousState, writeImportOutput } from './write-output'

const DATA_DIR = 'data'
const CONTENT_DIR = 'content'

async function readContent<T>(name: string, schema: z.ZodType<T>): Promise<T> {
  const path = `${CONTENT_DIR}/${name}`
  const text = await readFile(path, 'utf8')
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Invalid JSON in ${path}`)
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) throw new Error(`Invalid content file ${path}`)
  return parsed.data
}

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

  await readContent('themes.json', themesFileSchema)
  const awardGroups = await readContent('awards.json', awardGroupsFileSchema)
  const fixes = await readContent('match-fixes.json', matchFixesFileSchema)
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
    prevLock: prev.lock,
    prevPeople: prev.people,
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
