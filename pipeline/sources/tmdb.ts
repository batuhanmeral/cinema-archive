import { z } from 'zod'
import { TMDB_API_URL } from '../config'
import type { HttpClient } from '../lib/http'
import type { Genre } from '../../src/data/schemas'

const APPENDED_PARTS = 'credits,images,videos,keywords,translations'
const IMAGE_LANGUAGES = 'tr,en,null'
const VIDEO_LANGUAGES = 'en,tr'

// Yalnızca kullandığımız alanlar doğrulanır; bilinmeyen alanlar sessizce atılır.
// TMDB gerçekte null döndürdüğü alanlar nullable bırakıldı.
export const tmdbMovieSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  original_title: z.string(),
  overview: z.string().nullable(),
  release_date: z.string().nullable(),
  runtime: z.number().nullable(),
  adult: z.boolean(),
  vote_count: z.number().int(),
  poster_path: z.string().nullable(),
  genres: z.array(z.object({ id: z.number().int() })),
  production_countries: z.array(z.object({ iso_3166_1: z.string() })),
  spoken_languages: z.array(z.object({ iso_639_1: z.string() })),
  production_companies: z.array(z.object({ name: z.string() })),
  credits: z.object({
    cast: z.array(
      z.object({
        id: z.number().int(),
        name: z.string(),
        character: z.string().nullable(),
        order: z.number().int(),
        profile_path: z.string().nullable(),
      }),
    ),
    crew: z.array(
      z.object({
        id: z.number().int(),
        name: z.string(),
        job: z.string(),
        profile_path: z.string().nullable(),
      }),
    ),
  }),
  images: z.object({
    posters: z.array(imageSchema()),
    backdrops: z.array(imageSchema()),
  }),
  videos: z.object({
    results: z.array(
      z.object({
        key: z.string(),
        site: z.string(),
        type: z.string(),
        official: z.boolean(),
        iso_639_1: z.string().nullable(),
      }),
    ),
  }),
  keywords: z.object({ keywords: z.array(z.object({ id: z.number().int(), name: z.string() })) }),
  translations: z.object({
    translations: z.array(
      z.object({
        iso_639_1: z.string(),
        data: z.object({
          title: z
            .string()
            .nullish()
            .transform((v) => v ?? ''),
          overview: z
            .string()
            .nullish()
            .transform((v) => v ?? ''),
        }),
      }),
    ),
  }),
})
export type TmdbMovie = z.infer<typeof tmdbMovieSchema>

function imageSchema() {
  return z.object({
    file_path: z.string(),
    iso_639_1: z.string().nullable(),
    vote_count: z.number(),
  })
}

const searchResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      original_title: z.string(),
      release_date: z
        .string()
        .nullish()
        .transform((v) => v ?? ''),
      adult: z.boolean(),
    }),
  ),
})
export type TmdbSearchHit = z.infer<typeof searchResponseSchema>['results'][number]

const genreListSchema = z.object({
  genres: z.array(z.object({ id: z.number().int(), name: z.string() })),
})

function tmdbUrl(path: string, params: Record<string, string>): string {
  return `${TMDB_API_URL}${path}?${new URLSearchParams(params)}`
}

export async function fetchMovie(http: HttpClient, tmdbId: number): Promise<TmdbMovie> {
  const url = tmdbUrl(`/movie/${tmdbId}`, {
    language: 'en-US',
    append_to_response: APPENDED_PARTS,
    include_image_language: IMAGE_LANGUAGES,
    include_video_language: VIDEO_LANGUAGES,
  })
  const parsed = tmdbMovieSchema.safeParse(await http.getJson(url))
  if (!parsed.success) throw new Error(`Malformed TMDB response for movie ${tmdbId}`)
  return parsed.data
}

export async function searchMovies(http: HttpClient, query: string): Promise<TmdbSearchHit[]> {
  const url = tmdbUrl('/search/movie', { query, include_adult: 'true', language: 'en-US' })
  const parsed = searchResponseSchema.safeParse(await http.getJson(url))
  if (!parsed.success)
    throw new Error(`Malformed TMDB search response for query ${JSON.stringify(query)}`)
  return parsed.data.results
}

async function fetchGenreNames(http: HttpClient, language: string): Promise<Map<number, string>> {
  const url = tmdbUrl('/genre/movie/list', { language })
  const parsed = genreListSchema.safeParse(await http.getJson(url))
  if (!parsed.success) throw new Error(`Malformed TMDB genre list for language ${language}`)
  return new Map(parsed.data.genres.map((genre) => [genre.id, genre.name]))
}

export async function fetchGenres(http: HttpClient): Promise<Genre[]> {
  const [en, tr] = await Promise.all([fetchGenreNames(http, 'en-US'), fetchGenreNames(http, 'tr')])
  // Türkçe adı olmayan tür İngilizce adıyla gösterilir.
  return [...en].map(([id, name]) => ({ id, en: name, tr: tr.get(id) || name }))
}
