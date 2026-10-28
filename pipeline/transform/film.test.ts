import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { filmSchema, personSchema } from '../../src/data/schemas'
import { tmdbMovieSchema, type TmdbMovie } from '../sources/tmdb'
import { collectPeople, movieDirectors, movieYear, toFilm } from './film'

const fixturePath = join(__dirname, '../sources/__fixtures__/tmdb-movie-1398.json')
const ctx = { slug: 'stalker-1979', sources: ['cult-list'], awards: {} }

const movie = tmdbMovieSchema.parse(JSON.parse(readFileSync(fixturePath, 'utf8')))
const film = toFilm(movie, ctx)

function withTranslation(
  base: TmdbMovie,
  iso: string,
  data: { title: string; overview: string },
): TmdbMovie {
  const others = base.translations.translations.filter((t) => t.iso_639_1 !== iso)
  return { ...base, translations: { translations: [...others, { iso_639_1: iso, data }] } }
}

describe('toFilm', () => {
  it('produces a valid Film', () => expect(filmSchema.parse(film)).toEqual(film))

  it('takes the Turkish title and overview from translations', () => {
    expect(film.title.tr).toBe('İz Sürücü')
    expect(film.overview.tr).not.toBeNull()
  })

  it('falls back to the English title when the Turkish title is empty and the original is Cyrillic', () => {
    const f = toFilm(withTranslation(movie, 'tr', { title: '', overview: '' }), ctx)
    expect(movie.original_title).toBe('Сталкер')
    expect(f.title.tr).toBe('Stalker')
    expect(f.overview.tr).toBeNull()
  })

  it('falls back to the English title when the original title is Japanese', () => {
    const m = withTranslation(
      { ...movie, title: 'Tetsuo: The Iron Man', original_title: '鉄男' },
      'tr',
      { title: '', overview: '' },
    )
    expect(toFilm(m, ctx).title.tr).toBe('Tetsuo: The Iron Man')
  })

  it('keeps a Latin original title with diacritics as the Turkish fallback', () => {
    const m = withTranslation(
      { ...movie, title: 'Witchcraft Through the Ages', original_title: 'Häxan' },
      'tr',
      { title: '', overview: '' },
    )
    expect(toFilm(m, ctx).title.tr).toBe('Häxan')
  })

  it('prefers the official English YouTube trailer', () =>
    expect(film.trailerKey).toBe('enOfficial'))

  it('keeps only textless backdrops, most voted first', () =>
    expect(film.backdrops).toEqual(['/bd-high.jpg', '/bd-low.jpg']))

  it('maps crew jobs and drops executive producers and duplicates', () => {
    expect(film.crew.filter((c) => c.job === 'director')).toHaveLength(1)
    expect(film.crew.filter((c) => c.job === 'writer')).toHaveLength(2)
    expect(film.crew.filter((c) => c.job === 'producer')).toHaveLength(1)
    expect(film.crew).toHaveLength(6)
  })

  it('keeps the first 20 billed actors in order', () => {
    expect(film.cast).toHaveLength(20)
    expect(film.cast.map((c) => c.order)).toEqual([...Array(20).keys()])
  })

  it('uses the Turkish poster on the Turkish side', () => {
    expect(film.poster.tr).toBe('/stalker-tr.jpg')
    expect(film.poster.en).toBe('/stalker-en-high.jpg')
  })

  it('limits studios to three', () => expect(film.studios).toEqual(['Mosfilm', 'Goskino', 'Third']))

  it('drops values the Film schema forbids instead of failing', () => {
    const odd: TmdbMovie = {
      ...movie,
      runtime: 0,
      poster_path: 'bad path.jpg',
      production_countries: [{ iso_3166_1: 'su' }],
      spoken_languages: [{ iso_639_1: 'RU' }, { iso_639_1: '' }],
      production_companies: [{ name: '' }, { name: 'Mosfilm' }],
      images: {
        posters: [],
        backdrops: [{ file_path: '/x y.jpg', iso_639_1: null, vote_count: 1 }],
      },
    }
    const f = toFilm(odd, ctx)
    expect(filmSchema.parse(f)).toEqual(f)
    expect(f.runtime).toBeNull()
    expect(f.poster).toEqual({ tr: null, en: null })
    expect(f.backdrops).toEqual([])
    expect(f.countries).toEqual(['SU'])
    expect(f.languages).toEqual(['ru'])
    expect(f.studios).toEqual(['Mosfilm'])
  })

  it('throws when the release year is unknown', () => {
    expect(() => toFilm({ ...movie, release_date: '' }, ctx)).toThrow(/1398/)
  })
})

describe('toFilm blank values', () => {
  it('falls back to the original title when the English title is empty', () => {
    const f = toFilm({ ...movie, title: ' ' }, ctx)
    expect(f.title.en).toBe(movie.original_title)
    expect(filmSchema.parse(f)).toEqual(f)
  })

  it('falls back to the English title when the original title is empty', () => {
    const m = withTranslation({ ...movie, original_title: '' }, 'tr', { title: '', overview: '' })
    const f = toFilm(m, ctx)
    expect(f.originalTitle).toBe('Stalker')
    expect(f.title.tr).toBe('Stalker')
    expect(filmSchema.parse(f)).toEqual(f)
  })

  it('throws naming the id when every title is empty', () => {
    expect(() => toFilm({ ...movie, title: '', original_title: '' }, ctx)).toThrow(/1398/)
  })

  it('drops blank-named cast and crew from the film and the people map', () => {
    const m: TmdbMovie = {
      ...movie,
      credits: {
        cast: [
          ...movie.credits.cast,
          { id: 900, name: '  ', character: 'X', order: 0, profile_path: null },
        ],
        crew: [...movie.credits.crew, { id: 901, name: '', job: 'Writer', profile_path: null }],
      },
    }
    const f = toFilm(m, ctx)
    expect(f.cast.some((c) => c.personId === 900)).toBe(false)
    expect(f.crew.some((c) => c.personId === 901)).toBe(false)
    const people = collectPeople(m)
    expect(people.has(900) || people.has(901)).toBe(false)
    for (const [tmdbId, p] of people) personSchema.parse({ tmdbId, ...p, slug: null })
  })

  it('drops the no-language code xx', () => {
    const f = toFilm(
      { ...movie, spoken_languages: [{ iso_639_1: 'xx' }, { iso_639_1: 'ru' }] },
      ctx,
    )
    expect(f.languages).toEqual(['ru'])
  })
})

describe('movieYear', () => {
  it('reads the year from the release date', () => expect(movieYear(movie)).toBe(1979))
  it('returns null for an empty or invalid date', () => {
    expect(movieYear({ ...movie, release_date: '' })).toBeNull()
    expect(movieYear({ ...movie, release_date: 'soon' })).toBeNull()
  })
})

describe('movieDirectors', () => {
  it('lists each director once', () => expect(movieDirectors(movie)).toEqual(['Andrei Tarkovsky']))
})

describe('collectPeople', () => {
  it('covers kept crew and kept cast only', () => {
    const people = collectPeople(movie)
    expect(people.get(1)).toEqual({ name: 'Andrei Tarkovsky', profilePath: '/tarkovsky.jpg' })
    expect(people.has(4)).toBe(false)
    expect(people.size).toBe(6 + 20)
    expect(people.has(100 + 21)).toBe(false)
  })
})
