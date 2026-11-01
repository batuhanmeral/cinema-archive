import { describe, expect, it } from 'vitest'
import { makeFilm } from '../../src/data/fixtures'
import type { CollectionContent, CollectionRule } from '../schemas'
import { buildCollections, matchesRule, ruleCategories, rulesNeedWikidataGenres } from './rules'
import type { CollectionFacts } from './rules'

const noFacts: CollectionFacts = { wikidataGenres: new Set(), categories: new Set() }
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
    const facts = { wikidataGenres: new Set(['Q1033891']), categories: new Set(['Cat A']) }
    expect(matchesRule({ wikidataGenres: ['Q1033891'] }, makeFilm(), facts)).toBe(true)
    expect(matchesRule({ wikidataGenres: ['Q1033891'] }, makeFilm(), noFacts)).toBe(false)
    expect(matchesRule({ wikipediaCategories: ['Cat A'] }, makeFilm(), facts)).toBe(true)
    expect(matchesRule({ wikipediaCategories: ['Cat B'] }, makeFilm(), facts)).toBe(false)
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

describe('rule requirements', () => {
  const contents = [
    content('a', { wikipediaCategories: ['Cat A', 'Cat B'] }),
    content('b', { wikidataGenres: ['Q1'] }),
    content('c', { wikipediaCategories: ['Cat B', 'Cat C'] }),
  ]

  it('lists unique categories in content order', () => {
    expect(ruleCategories(contents)).toEqual(['Cat A', 'Cat B', 'Cat C'])
  })

  it('tells whether any rule uses wikidata genres', () => {
    expect(rulesNeedWikidataGenres(contents)).toBe(true)
    expect(rulesNeedWikidataGenres(contents.slice(0, 1))).toBe(false)
  })
})
