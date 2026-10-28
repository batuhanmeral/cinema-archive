import { tmdbPathSchema, type CrewJob, type Film } from '../../src/data/schemas'
import type { TmdbMovie } from '../sources/tmdb'

export const CAST_LIMIT = 20
export const BACKDROP_LIMIT = 10
export const STUDIO_LIMIT = 3

export type FilmContext = { slug: string; sources: string[]; awards: Record<string, number> }

const YEAR_PATTERN = /^(\d{4})-\d{2}-\d{2}$/
const COUNTRY_PATTERN = /^[A-Z]{2}$/
const LANGUAGE_PATTERN = /^[a-z]{2}$/
// TMDB 'xx' kodunu "dil yok" anlamında kullanır; gerçek bir ISO 639-1 dili değildir.
const NO_LANGUAGE_CODE = 'xx'

const JOB_MAP: Record<string, CrewJob> = {
  Director: 'director',
  Screenplay: 'writer',
  Writer: 'writer',
  Producer: 'producer',
  'Director of Photography': 'cinematographer',
  'Original Music Composer': 'composer',
  Music: 'composer',
}

const TRAILER_LANGUAGE_RANK: Record<string, number> = { en: 0, tr: 1 }
const OTHER_LANGUAGE_RANK = 2

export function movieYear(movie: TmdbMovie): number | null {
  const match = YEAR_PATTERN.exec(movie.release_date ?? '')
  return match ? Number(match[1]) : null
}

export function movieDirectors(movie: TmdbMovie): string[] {
  const names = movie.credits.crew.filter((c) => c.job === 'Director').map((c) => c.name)
  return [...new Set(names)]
}

// Film şemasının reddedeceği biçimsiz yollar (boşluk, uzantı yok) atılır.
const validPath = (path: string | null): string | null =>
  path !== null && tmdbPathSchema.safeParse(path).success ? path : null

const byVotesDesc = <T extends { vote_count: number }>(items: T[]): T[] =>
  [...items].sort((a, b) => b.vote_count - a.vote_count)

function pickPoster(movie: TmdbMovie, language: string): string | null {
  const best = byVotesDesc(movie.images.posters).find(
    (p) => p.iso_639_1 === language && validPath(p.file_path),
  )
  return validPath(best?.file_path ?? null) ?? validPath(movie.poster_path)
}

function pickBackdrops(movie: TmdbMovie): string[] {
  // Yazısız (dil etiketsiz) arka planlar tercih edilir; üstüne metin basılmış olanlar elenir.
  return byVotesDesc(movie.images.backdrops)
    .filter((b) => b.iso_639_1 === null)
    .map((b) => validPath(b.file_path))
    .filter((path): path is string => path !== null)
    .slice(0, BACKDROP_LIMIT)
}

function pickTrailerKey(movie: TmdbMovie): string | null {
  const rank = (iso: string | null) => TRAILER_LANGUAGE_RANK[iso ?? ''] ?? OTHER_LANGUAGE_RANK
  const trailers = movie.videos.results
    .filter((v) => v.site === 'YouTube' && v.type === 'Trailer')
    .sort(
      (a, b) => Number(b.official) - Number(a.official) || rank(a.iso_639_1) - rank(b.iso_639_1),
    )
  return trailers[0]?.key ?? null
}

function keptCrew(movie: TmdbMovie) {
  const seen = new Set<string>()
  const kept: Array<{ personId: number; job: CrewJob; name: string; profilePath: string | null }> =
    []
  for (const member of movie.credits.crew) {
    const job = JOB_MAP[member.job]
    const key = `${member.id}:${job}`
    // İsimsiz kişi people.json'a giremez; filmde de referans verilmez.
    if (!job || !member.name.trim() || seen.has(key)) continue
    seen.add(key)
    kept.push({
      personId: member.id,
      job,
      name: member.name.trim(),
      profilePath: validPath(member.profile_path),
    })
  }
  return kept
}

function keptCast(movie: TmdbMovie) {
  return movie.credits.cast
    .filter((c) => c.name.trim())
    .sort((a, b) => a.order - b.order)
    .slice(0, CAST_LIMIT)
}

export function collectPeople(
  movie: TmdbMovie,
): Map<number, { name: string; profilePath: string | null }> {
  const people = new Map<number, { name: string; profilePath: string | null }>()
  for (const c of keptCrew(movie)) {
    if (!people.has(c.personId))
      people.set(c.personId, { name: c.name, profilePath: c.profilePath })
  }
  for (const c of keptCast(movie)) {
    if (!people.has(c.id))
      people.set(c.id, { name: c.name.trim(), profilePath: validPath(c.profile_path) })
  }
  return people
}

const LATIN_LETTER = /\p{Script=Latin}/u

export function toFilm(movie: TmdbMovie, ctx: FilmContext): Film {
  const year = movieYear(movie)
  if (year === null) throw new Error(`TMDB movie ${movie.id} has no valid release date`)
  // Boş başlıklar filmSchema'yı bozar; zincirle doldurulur, hiçbiri yoksa id ile hata verilir.
  const titleEn = movie.title.trim() || movie.original_title.trim()
  const originalTitle = movie.original_title.trim() || titleEn
  if (!titleEn) throw new Error(`TMDB movie ${movie.id} has no title`)
  const tr = movie.translations.translations.find((t) => t.iso_639_1 === 'tr')?.data
  // Türkçe başlık yoksa özgün başlık; Latin harfi yoksa (ör. 鉄男) okunabilir İngilizce başlık.
  const trFallback = LATIN_LETTER.test(originalTitle) ? originalTitle : titleEn

  return {
    tmdbId: movie.id,
    slug: ctx.slug,
    year,
    // TMDB bilinmeyen süre için 0 döndürür.
    runtime: movie.runtime ? movie.runtime : null,
    originalTitle,
    title: { en: titleEn, tr: tr?.title.trim() || trFallback },
    overview: { en: movie.overview || null, tr: tr?.overview || null },
    poster: { tr: pickPoster(movie, 'tr'), en: pickPoster(movie, 'en') },
    backdrops: pickBackdrops(movie),
    trailerKey: pickTrailerKey(movie),
    genreIds: movie.genres.map((g) => g.id),
    keywordIds: movie.keywords.keywords.map((k) => k.id),
    // ISO kodları büyük/küçük harf tutarsız gelebilir; normalize edilip geçersizler atılır.
    countries: movie.production_countries
      .map((c) => c.iso_3166_1.toUpperCase())
      .filter((code) => COUNTRY_PATTERN.test(code)),
    languages: movie.spoken_languages
      .map((l) => l.iso_639_1.toLowerCase())
      .filter((code) => LANGUAGE_PATTERN.test(code) && code !== NO_LANGUAGE_CODE),
    studios: movie.production_companies
      .map((c) => c.name)
      .filter((name) => name !== '')
      .slice(0, STUDIO_LIMIT),
    crew: keptCrew(movie).map(({ personId, job }) => ({ personId, job })),
    cast: keptCast(movie).map((c) => ({
      personId: c.id,
      character: c.character ?? '',
      order: c.order,
    })),
    awards: ctx.awards,
    voteCount: movie.vote_count,
    sources: ctx.sources,
  }
}
