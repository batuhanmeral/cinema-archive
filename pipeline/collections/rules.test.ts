import { describe, expect, it } from 'vitest'
import { makeFilm } from '../../src/data/fixtures'
import type { CollectionContent, CollectionRule } from '../schemas'
import {
  COLLECTION_MAX_FILMS,
  buildCollections,
  matchesRule,
  ruleArticles,
  ruleCategories,
  rulesNeedWikidataGenres,
} from './rules'
import type { CollectionFacts } from './rules'

const noFacts: CollectionFacts = {
  wikidataGenres: new Set(),
  categories: new Set(),
  articles: new Set(),
}
const content = (slug: string, rule: CollectionRule): CollectionContent => ({
  slug,
  name: { tr: slug, en: slug },
  rule,
})

describe('matchesRule', () => {
  const classic: CollectionRule = { countries: ['US'], years: { start: 1930, end: 1960 } }

  it('matches country and inclusive years', () => {
    expect(matchesRule(classic, makeFilm({ year: 1946, countries: ['US'] }), noFacts)).toBe(true)
    expect(matchesRule(classic, makeFilm({ year: 1960, countries: ['US'] }), noFacts)).toBe(true)
    expect(matchesRule(classic, makeFilm({ year: 1961, countries: ['US'] }), noFacts)).toBe(false)
    expect(matchesRule(classic, makeFilm({ year: 1946, countries: ['FR'] }), noFacts)).toBe(false)
  })

  it('matches any element of an array field', () => {
    const film = makeFilm({ countries: ['FR', 'IT'] })
    expect(matchesRule({ countries: ['IT', 'JP'] }, film, noFacts)).toBe(true)
  })

  it('matches wikidata genres and categories through facts', () => {
    const facts = {
      ...noFacts,
      wikidataGenres: new Set(['Q1033891']),
      categories: new Set(['Cat A']),
    }
    expect(matchesRule({ wikidataGenres: ['Q1033891'] }, makeFilm(), facts)).toBe(true)
    expect(matchesRule({ wikidataGenres: ['Q1033891'] }, makeFilm(), noFacts)).toBe(false)
    expect(matchesRule({ wikipediaCategories: ['Cat A'] }, makeFilm(), facts)).toBe(true)
    expect(matchesRule({ wikipediaCategories: ['Cat B'] }, makeFilm(), facts)).toBe(false)
  })

  it('matches wikipedia articles through facts', () => {
    const facts = { ...noFacts, articles: new Set(['Midnight movie']) }
    expect(matchesRule({ wikipediaArticles: ['Midnight movie'] }, makeFilm(), facts)).toBe(true)
    expect(matchesRule({ wikipediaArticles: ['Midnight movie'] }, makeFilm(), noFacts)).toBe(false)
  })

  it('matches sources against the lock sources of the film', () => {
    const rule = { sources: ['yesilcam'] }
    expect(matchesRule(rule, makeFilm({ sources: ['cult-list', 'yesilcam'] }), noFacts)).toBe(true)
    expect(matchesRule(rule, makeFilm({ sources: ['cult-list'] }), noFacts)).toBe(false)
  })

  it('requires every present field to match', () => {
    const rule: CollectionRule = { tmdbGenres: [27], years: { start: 1970, end: 1979 } }
    expect(matchesRule(rule, makeFilm({ genreIds: [27], year: 1975 }), noFacts)).toBe(true)
    expect(matchesRule(rule, makeFilm({ genreIds: [27], year: 1985 }), noFacts)).toBe(false)
    expect(matchesRule(rule, makeFilm({ genreIds: [18], year: 1975 }), noFacts)).toBe(false)
  })

  it('never matches a film in excludeTmdbIds', () => {
    const film = makeFilm({ tmdbId: 7, countries: ['US'] })
    expect(matchesRule({ countries: ['US'], excludeTmdbIds: [7] }, film, noFacts)).toBe(false)
    expect(matchesRule({ countries: ['US'], excludeTmdbIds: [8] }, film, noFacts)).toBe(true)
  })
})

describe('buildCollections exclusions', () => {
  it('leaves an excluded film out of the members and the matched count', () => {
    const films = [1, 2, 3].map((tmdbId) => makeFilm({ tmdbId, countries: ['US'] }))
    const { collections, sizes } = buildCollections(
      [content('us', { countries: ['US'], excludeTmdbIds: [2] })],
      films,
      () => noFacts,
    )
    expect(collections[0]?.filmIds).toEqual([1, 3])
    expect(sizes.get('us')).toBe(2)
  })
})

describe('buildCollections', () => {
  const films = [
    makeFilm({ tmdbId: 3, year: 1950, countries: ['US'] }),
    makeFilm({ tmdbId: 2, year: 1940, countries: ['US'] }),
    makeFilm({ tmdbId: 1, year: 1940, countries: ['US'] }),
    makeFilm({ tmdbId: 4, year: 1999, countries: ['FR'] }),
  ]

  it('keeps content order, sorts by year then id and reports empty ones as 0', () => {
    const { collections, sizes } = buildCollections(
      [
        content('fr', { countries: ['FR'] }),
        content('none', { countries: ['JP'] }),
        content('us', { countries: ['US'] }),
      ],
      films,
      () => noFacts,
    )
    expect(collections.map((c) => c.slug)).toEqual(['fr', 'us'])
    expect(collections[1]?.filmIds).toEqual([1, 2, 3])
    expect(sizes.get('none')).toBe(0)
    expect(sizes.get('us')).toBe(3)
    expect(sizes.get('fr')).toBe(1)
  })
})

describe('buildCollections cap', () => {
  it('keeps the 100 most voted of 103 matches, sorted by year, and reports 103', () => {
    const films = Array.from({ length: COLLECTION_MAX_FILMS + 3 }, (_, i) =>
      makeFilm({
        tmdbId: i + 1,
        year: 2000 - i,
        voteCount: i < 3 ? 1 : 100 + i,
        countries: ['US'],
      }),
    )
    const { collections, sizes } = buildCollections(
      [content('us', { countries: ['US'] })],
      films,
      () => noFacts,
    )
    const ids = collections[0]?.filmIds ?? []
    expect(ids).toHaveLength(COLLECTION_MAX_FILMS)
    expect([1, 2, 3].some((id) => ids.includes(id))).toBe(false)
    expect(ids[0]).toBe(103)
    expect(ids.at(-1)).toBe(4)
    expect(sizes.get('us')).toBe(103)
  })
})

describe('rule requirements', () => {
  const contents = [
    content('a', { wikipediaCategories: ['Cat A', 'Cat B'] }),
    content('b', { wikidataGenres: ['Q1'] }),
    content('c', { wikipediaCategories: ['Cat B', 'Cat C'] }),
  ]

  it('lists unique categories in content order', () => {
    expect(ruleCategories(contents)).toEqual(['Cat A', 'Cat B', 'Cat C'])
  })

  it('lists unique articles in content order', () => {
    const withArticles = [
      content('a', { wikipediaArticles: ['Art A', 'Art B'] }),
      content('b', { wikipediaArticles: ['Art B'] }),
    ]
    expect(ruleArticles(withArticles)).toEqual(['Art A', 'Art B'])
  })

  it('tells whether any rule uses wikidata genres', () => {
    expect(rulesNeedWikidataGenres(contents)).toBe(true)
    expect(rulesNeedWikidataGenres(contents.slice(0, 1))).toBe(false)
  })
})
