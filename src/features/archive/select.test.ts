import { describe, expect, it } from 'vitest'
import { EMPTY_QUERY, FILTER_KEYS, type ArchiveQuery, type FilterKey } from '@/lib/archive-query'
import { store } from '@/lib/data'
import { archiveDataBody } from './archive-data'
import { facetCounts, facetOptions, filmValues, selectFilms } from './select'
import type { ArchiveFilm, ArchiveIndex } from './schemas'

const f = (slug: string, o: Partial<ArchiveFilm>): ArchiveFilm => ({
  slug,
  title: slug,
  otherTitle: slug,
  originalTitle: slug,
  year: 1960,
  directors: [],
  poster: null,
  genres: [],
  themes: [],
  countries: [],
  languages: [],
  votes: 0,
  ...o,
})
const films: ArchiveFilm[] = [
  f('a', {
    title: 'Zorba',
    year: 1960,
    genres: [18],
    countries: ['FR'],
    languages: ['fr'],
    votes: 10,
  }),
  f('b', {
    title: 'Çember',
    year: 1960,
    genres: [35],
    countries: ['FR'],
    languages: ['fr'],
    votes: 50,
  }),
  f('c', {
    title: 'Alev',
    year: 1971,
    genres: [18, 35],
    countries: ['IT'],
    languages: ['it'],
    votes: 50,
  }),
  f('d', {
    title: 'Alev',
    year: 1955,
    genres: [18],
    countries: ['FR'],
    languages: ['fr'],
    votes: 5,
  }),
  f('e', {
    title: 'Bora',
    year: 1971,
    genres: [],
    themes: [7],
    countries: ['TR'],
    languages: ['tr'],
    votes: 99,
  }),
  f('f', {
    title: 'Dere',
    year: 1988,
    genres: [35],
    countries: ['IT'],
    languages: ['it'],
    votes: 1,
  }),
]
const q = (
  over: Omit<Partial<ArchiveQuery>, 'filters'> & { filters?: Partial<Record<FilterKey, string[]>> },
): ArchiveQuery => ({
  ...EMPTY_QUERY,
  ...over,
  filters: { ...EMPTY_QUERY.filters, ...over.filters },
})
const slugs = (query: ArchiveQuery, scores: Map<string, number> | null = null) =>
  selectFilms(films, query, { locale: 'tr', scores }).map((x) => x.slug)

describe('filmValues', () => {
  it('stringifies values and derives the decade', () => {
    const film = f('x', {
      year: 1979,
      genres: [18],
      themes: [7],
      countries: ['FR'],
      languages: ['fr'],
    })
    expect(filmValues(film, 'genre')).toEqual(['18'])
    expect(filmValues(film, 'theme')).toEqual(['7'])
    expect(filmValues(film, 'country')).toEqual(['FR'])
    expect(filmValues(film, 'language')).toEqual(['fr'])
    expect(filmValues(film, 'decade')).toEqual(['1970'])
  })
})

describe('selectFilms', () => {
  it('ORs within a key', () => {
    expect(slugs(q({ filters: { genre: ['35'] } }))).toEqual(['b', 'c', 'f'])
    expect(slugs(q({ filters: { genre: ['18', '35'] } }))).toEqual(['d', 'b', 'a', 'c', 'f'])
  })
  it('ANDs across keys', () => {
    expect(slugs(q({ filters: { genre: ['18', '35'], country: ['FR'] } }))).toEqual(['d', 'b', 'a'])
  })
  it('ANDs q through scores', () => {
    const scores = new Map([
      ['c', 0.1],
      ['b', 0.2],
    ])
    expect(slugs(q({ q: 'x', filters: { genre: ['35'] } }), scores)).toEqual(['c', 'b'])
  })
  it('sorts by year with title ties', () => {
    expect(slugs(q({}))).toEqual(['d', 'b', 'a', 'c', 'e', 'f'])
  })
  it('sorts year-desc with title ties', () => {
    expect(slugs(q({ sort: 'year-desc' }))).toEqual(['f', 'c', 'e', 'b', 'a', 'd'])
  })
  it('sorts by title then year', () => {
    expect(slugs(q({ sort: 'title' }))).toEqual(['d', 'c', 'e', 'b', 'f', 'a'])
  })
  it('sorts by popularity then year then slug', () => {
    expect(slugs(q({ sort: 'popular' }))).toEqual(['e', 'b', 'c', 'a', 'd', 'f'])
  })
  it('sorts by relevance score then votes', () => {
    const scores = new Map([
      ['a', 0.2],
      ['b', 0.1],
      ['c', 0.2],
      ['e', 0.2],
    ])
    expect(slugs(q({ q: 'x' }), scores)).toEqual(['b', 'e', 'c', 'a'])
  })
  it('breaks the final tie by slug', () => {
    const twins = [f('y', { votes: 1 }), f('x', { votes: 1 })]
    const out = selectFilms(twins, q({ sort: 'popular' }), { locale: 'tr', scores: null })
    expect(out.map((x) => x.slug)).toEqual(['x', 'y'])
  })
})

describe('facetCounts', () => {
  const counts = (query: ArchiveQuery, scores: Map<string, number> | null = null) =>
    facetCounts(films, query, scores)
  it('counts every key against all keys', () => {
    const c = counts(q({}))
    expect([...c.genre]).toEqual(
      expect.arrayContaining([
        ['18', 3],
        ['35', 3],
      ]),
    )
    expect(c.decade.get('1970')).toBe(2)
    expect(c.country.get('FR')).toBe(3)
  })
  it('does not apply a key to its own counts but applies the others', () => {
    const c = counts(q({ filters: { genre: ['35'], country: ['IT'] } }))
    // genre sayıları yalnız ülke=IT'ye göre: c(18,35), f(35)
    expect(c.genre.get('18')).toBe(1)
    expect(c.genre.get('35')).toBe(2)
    // ülke sayıları yalnız tür=35'e göre: b(FR), c(IT), f(IT)
    expect(c.country.get('FR')).toBe(1)
    expect(c.country.get('IT')).toBe(2)
    expect(c.country.has('TR')).toBe(false)
  })
  it('applies q through scores', () => {
    const c = counts(q({ q: 'x' }), new Map([['a', 0.1]]))
    expect(c.genre.get('18')).toBe(1)
    expect(c.genre.has('35')).toBe(false)
  })
})

describe('facetOptions', () => {
  const labels = { '18': 'Drama', '35': 'Komedi', '99': 'Belgesel' }
  it('keeps a selected zero-count option and hides an unselected one', () => {
    const counts = new Map([
      ['18', 3],
      ['35', 0],
    ])
    const options = facetOptions('genre', counts, ['99'], labels, 'tr')
    expect(options.map((o) => [o.value, o.count, o.selected])).toEqual([
      ['18', 3, false],
      ['99', 0, true],
    ])
  })
  it('sorts by count desc then label', () => {
    const counts = new Map([
      ['35', 2],
      ['18', 2],
      ['99', 5],
    ])
    expect(facetOptions('genre', counts, [], labels, 'tr').map((o) => o.value)).toEqual([
      '99',
      '18',
      '35',
    ])
  })
  it('sorts decades ascending', () => {
    const counts = new Map([
      ['1980', 1],
      ['1950', 9],
    ])
    expect(facetOptions('decade', counts, [], {}, 'en').map((o) => o.value)).toEqual([
      '1950',
      '1980',
    ])
  })
  it('falls back to the value as label', () => {
    expect(facetOptions('country', new Map([['FR', 1]]), [], {}, 'tr')[0]?.label).toBe('FR')
  })
})

describe('real data (every film-page tag shows its film)', () => {
  it('selects each film for each of its values', () => {
    const index = archiveDataBody('index-tr.json') as ArchiveIndex
    expect(index.films.length).toBe(store.films().length)
    const byKey = new Map<string, ArchiveFilm[]>()
    for (const film of index.films)
      for (const key of FILTER_KEYS)
        for (const v of filmValues(film, key)) {
          const k = `${key}\0${v}`
          const list = byKey.get(k)
          if (list) list.push(film)
          else byKey.set(k, [film])
        }
    expect(byKey.size).toBeGreaterThan(0)
    for (const [k, expected] of byKey) {
      const [key, value] = k.split('\0') as [FilterKey, string]
      const got = new Set(
        selectFilms(index.films, q({ filters: { [key]: [value] } }), {
          locale: 'tr',
          scores: null,
        }).map((x) => x.slug),
      )
      for (const film of expected) expect(got.has(film.slug)).toBe(true)
    }
  })
})
