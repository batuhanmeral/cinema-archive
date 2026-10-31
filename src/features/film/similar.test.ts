import { describe, expect, it } from 'vitest'
import { makeFilm } from '@/data/fixtures'
import { SIMILAR_LIMIT, findSimilarFilms } from './similar'

const target = makeFilm({
  slug: 't',
  crew: [{ personId: 1, job: 'director' }],
  keywordIds: [10],
  genreIds: [18],
  year: 1975,
})

const slugsAndReasons = (films: ReturnType<typeof findSimilarFilms>) =>
  films.map((s) => [s.film.slug, s.reason])

describe('findSimilarFilms', () => {
  it('ranks the same director above a shared tag', () => {
    const byDirector = makeFilm({
      slug: 'a',
      crew: [{ personId: 1, job: 'director' }],
      keywordIds: [],
      genreIds: [],
      year: 1990,
    })
    const byTag = makeFilm({ slug: 'b', crew: [], keywordIds: [10], genreIds: [], year: 1990 })
    expect(
      slugsAndReasons(findSimilarFilms(target, [byTag, byDirector, target], new Set([10]))),
    ).toEqual([
      ['a', 'same-director'],
      ['b', 'shared-tag'],
    ])
  })

  it('ignores themes that are not allowlisted', () => {
    const withThemes = makeFilm({ ...target, slug: 't2', keywordIds: [10, 20] })
    const allowed = makeFilm({ slug: 'a', crew: [], keywordIds: [10], genreIds: [], year: 1990 })
    const notAllowed = makeFilm({ slug: 'b', crew: [], keywordIds: [20], genreIds: [], year: 1990 })
    expect(
      slugsAndReasons(findSimilarFilms(withThemes, [allowed, notAllowed], new Set([10]))),
    ).toEqual([['a', 'shared-tag']])
  })

  it('adds points for each shared allowlisted theme', () => {
    const withThemes = makeFilm({ ...target, slug: 't2', keywordIds: [10, 20] })
    const one = makeFilm({ slug: 'a', crew: [], keywordIds: [10], genreIds: [], voteCount: 9000 })
    const two = makeFilm({ slug: 'b', crew: [], keywordIds: [10, 20], genreIds: [], voteCount: 1 })
    expect(
      findSimilarFilms(withThemes, [one, two], new Set([10, 20])).map((s) => s.film.slug),
    ).toEqual(['b', 'a'])
  })

  it('needs both a shared genre and the same decade for genre-decade', () => {
    const sameGenreOtherDecade = makeFilm({ slug: 'a', crew: [], genreIds: [18], year: 1980 })
    const otherGenreSameDecade = makeFilm({ slug: 'b', crew: [], genreIds: [27], year: 1979 })
    const both = makeFilm({ slug: 'c', crew: [], genreIds: [27, 18], year: 1979 })
    expect(
      slugsAndReasons(
        findSimilarFilms(target, [sameGenreOtherDecade, otherGenreSameDecade, both], new Set([10])),
      ),
    ).toEqual([['c', 'genre-decade']])
  })

  it('names the strongest signal as the reason when several are present', () => {
    const all = makeFilm({
      slug: 'a',
      crew: [{ personId: 1, job: 'director' }],
      keywordIds: [10],
      genreIds: [18],
      year: 1975,
    })
    const tagAndGenre = makeFilm({
      slug: 'b',
      crew: [],
      keywordIds: [10],
      genreIds: [18],
      year: 1975,
    })
    expect(slugsAndReasons(findSimilarFilms(target, [tagAndGenre, all], new Set([10])))).toEqual([
      ['a', 'same-director'],
      ['b', 'shared-tag'],
    ])
  })

  it('does not count a shared writer as the same director', () => {
    const writer = makeFilm({ slug: 'a', crew: [{ personId: 1, job: 'writer' }], genreIds: [] })
    expect(findSimilarFilms(target, [writer], new Set([10]))).toEqual([])
  })

  it('excludes the target and unrelated films, and caps at 12', () => {
    const related = Array.from({ length: 15 }, (_, i) =>
      makeFilm({
        slug: `r${String(i).padStart(2, '0')}`,
        crew: [{ personId: 1, job: 'director' }],
      }),
    )
    const unrelated = makeFilm({ slug: 'u', crew: [], keywordIds: [], genreIds: [], year: 1990 })
    const result = findSimilarFilms(target, [target, unrelated, ...related], new Set([10]))
    expect(result).toHaveLength(SIMILAR_LIMIT)
    expect(SIMILAR_LIMIT).toBe(12)
    const slugs = result.map((s) => s.film.slug)
    expect(slugs).not.toContain('t')
    expect(slugs).not.toContain('u')
  })

  it('honours a custom limit', () => {
    const related = ['a', 'b', 'c'].map((slug) =>
      makeFilm({ slug, crew: [{ personId: 1, job: 'director' }] }),
    )
    expect(findSimilarFilms(target, related, new Set(), 2)).toHaveLength(2)
  })

  it('breaks ties by vote count, then slug', () => {
    const director = [{ personId: 1, job: 'director' as const }]
    const films = [
      makeFilm({ slug: 'c', crew: director, voteCount: 10 }),
      makeFilm({ slug: 'b', crew: director, voteCount: 50 }),
      makeFilm({ slug: 'a', crew: director, voteCount: 50 }),
    ]
    expect(findSimilarFilms(target, films, new Set()).map((s) => s.film.slug)).toEqual([
      'a',
      'b',
      'c',
    ])
  })
})
