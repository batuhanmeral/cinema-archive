import { z } from 'zod'
import { WIKIDATA_SPARQL_URL } from '../config'
import type { HttpClient } from '../lib/http'
import type { AwardGroup } from '../../src/data/schemas'

const TMDB_BATCH_SIZE = 300
const AWARD_BATCH_SIZE = 200
const GENRE_BATCH_SIZE = 200

const QID_PATTERN = /^Q\d+$/
const NUMERIC_PATTERN = /^\d+$/

const term = z.object({ value: z.string() })
const sparqlResponseSchema = z.object({
  results: z.object({ bindings: z.array(z.record(z.string(), term)) }),
})

// SPARQL'e yalnızca biçimi doğrulanmış değerler girer; enjeksiyon burada kesilir.
function assertQid(qid: string): void {
  if (!QID_PATTERN.test(qid)) throw new Error(`Invalid QID: ${JSON.stringify(qid)}`)
}

function assertTmdbId(id: number): void {
  if (!Number.isInteger(id) || id <= 0) throw new Error(`Invalid TMDB id: ${id}`)
}

const qidOf = (entityUri: string) => entityUri.slice(entityUri.lastIndexOf('/') + 1)

const batches = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  )

async function runQuery(http: HttpClient, query: string, label: string) {
  const parsed = sparqlResponseSchema.safeParse(
    await http.postFormJson(WIKIDATA_SPARQL_URL, { query, format: 'json' }),
  )
  if (!parsed.success) throw new Error(`Malformed Wikidata SPARQL response for ${label}`)
  return parsed.data.results.bindings
}

export async function fetchTmdbIdsForQids(
  http: HttpClient,
  qids: string[],
): Promise<Map<string, number[]>> {
  qids.forEach(assertQid)
  const result = new Map<string, number[]>()
  for (const batch of batches(qids, TMDB_BATCH_SIZE)) {
    const values = batch.map((qid) => `wd:${qid}`).join(' ')
    const query = `SELECT ?item ?tmdb WHERE { VALUES ?item { ${values} } ?item wdt:P4947 ?tmdb }`
    const label = `QIDs starting ${batch[0]}`
    for (const row of await runQuery(http, query, label)) {
      const { item, tmdb } = row
      // Wikidata'da P4947 değeri bazen sayısal olmayan kayıt içerir; atlanır.
      if (!item || !tmdb || !NUMERIC_PATTERN.test(tmdb.value)) continue
      const qid = qidOf(item.value)
      result.set(qid, [...(result.get(qid) ?? []), Number(tmdb.value)])
    }
  }
  return result
}

export async function fetchAwardCounts(
  http: HttpClient,
  tmdbIds: number[],
  groups: AwardGroup[],
): Promise<Map<number, Record<string, number>>> {
  tmdbIds.forEach(assertTmdbId)
  const groupQids = groups.flatMap((group) => group.qids)
  groupQids.forEach(assertQid)
  const keyByQid = new Map(groups.flatMap((g) => g.qids.map((qid) => [qid, g.key] as const)))
  const groupValues = groupQids.map((qid) => `wd:${qid}`).join(' ')

  // Aynı grubun iki QID'si üzerinden gelen ödül tek sayılsın diye küme tutulur.
  const awardsByFilm = new Map<number, Map<string, Set<string>>>()
  for (const batch of batches(tmdbIds, AWARD_BATCH_SIZE)) {
    const filmValues = batch.map((id) => `"${id}"`).join(' ')
    const query = `SELECT DISTINCT ?tmdb ?award ?group WHERE {
  VALUES ?tmdb { ${filmValues} }
  VALUES ?group { ${groupValues} }
  ?film wdt:P4947 ?tmdb ; wdt:P166 ?award .
  ?award (wdt:P31|wdt:P361)? ?group .
}`
    const label = `TMDB ids starting ${batch[0]}`
    for (const row of await runQuery(http, query, label)) {
      const { tmdb, award, group } = row
      if (!tmdb || !award || !group || !NUMERIC_PATTERN.test(tmdb.value)) continue
      const key = keyByQid.get(qidOf(group.value))
      if (!key) continue
      const film = Number(tmdb.value)
      const byKey = awardsByFilm.get(film) ?? new Map<string, Set<string>>()
      const awards = byKey.get(key) ?? new Set<string>()
      awards.add(award.value)
      byKey.set(key, awards)
      awardsByFilm.set(film, byKey)
    }
  }
  // Anahtarlar awards.json grup sırasıyla yazılır; yanıt sırası değişse de çıktı aynı kalır.
  const keyOrder = groups.map((group) => group.key)
  return new Map(
    [...awardsByFilm].map(([film, byKey]) => [
      film,
      Object.fromEntries(
        keyOrder.flatMap((key) => {
          const awards = byKey.get(key)
          return awards ? [[key, awards.size]] : []
        }),
      ),
    ]),
  )
}

const byQidNumber = (a: string, b: string) => Number(a.slice(1)) - Number(b.slice(1))

export async function fetchGenreQids(
  http: HttpClient,
  tmdbIds: number[],
): Promise<Map<number, string[]>> {
  tmdbIds.forEach(assertTmdbId)
  const genresByFilm = new Map<number, Set<string>>()
  for (const batch of batches(tmdbIds, GENRE_BATCH_SIZE)) {
    const filmValues = batch.map((id) => `"${id}"`).join(' ')
    const query = `SELECT DISTINCT ?tmdb ?genre WHERE {
  VALUES ?tmdb { ${filmValues} }
  ?film wdt:P4947 ?tmdb ; wdt:P136 ?genre
}`
    for (const row of await runQuery(http, query, `TMDB ids starting ${batch[0]}`)) {
      const { tmdb, genre } = row
      if (!tmdb || !genre || !NUMERIC_PATTERN.test(tmdb.value)) continue
      const film = Number(tmdb.value)
      genresByFilm.set(film, (genresByFilm.get(film) ?? new Set()).add(qidOf(genre.value)))
    }
  }
  // Yanıt sırası değişse de çıktı aynı kalsın diye QID'ler sıralanır.
  return new Map([...genresByFilm].map(([film, genres]) => [film, [...genres].sort(byQidNumber)]))
}
