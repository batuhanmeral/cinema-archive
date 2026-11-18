import { describe, expect, it } from 'vitest'
import { makeFilm, makeMovement, makePerson } from '@/data/fixtures'
import { movementMeta } from '@/features/movement/view-model'
import { buildDirectorPool, buildHomeView, buildPerdeFilms, buildPosterPool } from './view-model'

const people = new Map([[8452, makePerson()]])

describe('home view model', () => {
  it('orders every film by votes, year and slug, preserving missing images and overviews', () => {
    const films = [
      makeFilm({ tmdbId: 1, slug: 'low', voteCount: 10, year: 1960 }),
      makeFilm({
        tmdbId: 2,
        slug: 'late',
        voteCount: 50,
        year: 1962,
        backdrops: [],
        overview: { tr: null, en: 'Text' },
      }),
      makeFilm({
        tmdbId: 3,
        slug: 'early-b',
        voteCount: 50,
        year: 1961,
        backdrops: [],
        poster: { tr: null, en: null },
      }),
      makeFilm({ tmdbId: 4, slug: 'early-a', voteCount: 50, year: 1961 }),
    ]
    const result = buildPerdeFilms(makeMovement({ filmIds: [1, 2, 3, 4] }), 'tr', {
      films: (id) => films.find((film) => film.tmdbId === id),
      people,
      movements: [],
    })
    expect(result.map((film) => film.href)).toEqual([
      '/film/early-a',
      '/film/early-b',
      '/film/late',
      '/film/low',
    ])
    expect(result.map((film) => film.image)).toEqual([
      '/stalker-backdrop.jpg',
      null,
      '/stalker-tr.jpg',
      '/stalker-backdrop.jpg',
    ])
    expect(result[2]!.overview).toBeNull()
    expect(result[0]!.caption).toBe('Andrei Tarkovsky, 1961')
  })
  it('omits the director count in Perde movement metadata', () => {
    const movement = makeMovement({ years: { start: 1958, end: 1967 } })
    expect(movementMeta(movement, 'tr', { films: 16 })).toBe('1958–1967 · Fransa · 16 film')
    expect(movementMeta(movement, 'en', { films: 16 })).toBe('1958–1967 · France · 16 films')
  })
  it('only includes posters in the requested language', () => {
    const films = [makeFilm(), makeFilm({ poster: { tr: null, en: '/english.jpg' } })]
    expect(buildPosterPool(films, 'tr', people)).toHaveLength(1)
    expect(buildPosterPool(films, 'en', people)).toHaveLength(2)
  })
  it('counts directing credits once per film, excludes ineligible people and sorts ties by id', () => {
    const persons = [
      makePerson({ tmdbId: 1, name: 'First' }),
      makePerson({ tmdbId: 2 }),
      makePerson({ tmdbId: 3, profilePath: null }),
      makePerson({ tmdbId: 4, slug: null }),
      makePerson({ tmdbId: 5 }),
    ]
    const films = [1, 2, 3].map((tmdbId) =>
      makeFilm({
        tmdbId,
        crew: [1, 1, 2, 3, 4, ...(tmdbId < 3 ? [5] : [])].map((personId) => ({
          personId,
          job: 'director',
        })),
      }),
    )
    const pool = buildDirectorPool(
      films,
      'en',
      new Map(persons.map((person) => [person.tmdbId, person])),
    )
    expect(pool).toHaveLength(2)
    expect(pool[0]!.name).toBe('First')
    expect(pool[0]!.note).toBe('3 films')
  })
  it('builds all rotation frames with only the initial film and deterministic section defaults', () => {
    const view = buildHomeView('tr')
    expect(view.frames).toHaveLength(18)
    expect(view.frames.map((frame) => frame.slot)).toEqual(Array.from({ length: 18 }, (_, i) => i))
    expect(view.frames.every((frame) => frame.films.length === 1 && frame.total >= 1)).toBe(true)
    expect(view.strips.map((strip) => strip.rotationSlot)).toEqual(
      view.frames.map((frame) => frame.slot),
    )
    expect(view.collections).toHaveLength(23)
    expect(view.initialCollections).toEqual(view.collections.slice(0, 6))
    expect(view.posters).toHaveLength(16)
    expect(view.directors).toHaveLength(12)
  })
})
