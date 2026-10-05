export const WIKIPEDIA_API_URL = 'https://en.wikipedia.org/w/api.php'
export const WIKIDATA_SPARQL_URL = 'https://query.wikidata.org/sparql'
export const TMDB_API_URL = 'https://api.themoviedb.org/3'

export const CONCURRENCY = { tmdb: 8, wikipedia: 1, wikidata: 1 }

export const CACHE_DIR = '.cache/http'

export function userAgent(siteUrl: string): string {
  return `SinemaArsivi/1.0 (+${siteUrl})`
}
