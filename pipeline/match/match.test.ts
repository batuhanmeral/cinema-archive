import { describe, expect, it } from 'vitest'
import type { CultListEntry } from '../sources/wikipedia'
import { type Candidate, decideMatch, directorsMatch } from './match'

function entry(overrides: Partial<CultListEntry> = {}): CultListEntry {
  return {
    wikiTitle: 'Stalker (1979 film)',
    title: 'Stalker',
    year: 1979,
    yearEnd: null,
    directors: [],
    page: 'List of cult films: S',
    ...overrides,
  }
}

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return { tmdbId: 1, title: 'Stalker', year: 1979, directors: [], adult: false, ...overrides }
}

const noEvidence = { fix: undefined, wikidataTmdbIds: [], candidates: [] }

describe('decideMatch', () => {
  it('uses a fix id even without other evidence', () =>
    expect(
      decideMatch(entry(), {
        fix: { wikiTitle: 'X', tmdbId: 5, note: '' },
        wikidataTmdbIds: [],
        candidates: [candidate({ tmdbId: 5 })],
      }),
    ).toEqual({ kind: 'matched', tmdbId: 5, via: 'fix' }))

  it('uses a fix id when the candidate list lacks it', () =>
    expect(
      decideMatch(entry(), {
        fix: { wikiTitle: 'X', tmdbId: 5, note: '' },
        wikidataTmdbIds: [],
        candidates: [],
      }),
    ).toEqual({ kind: 'matched', tmdbId: 5, via: 'fix' }))

  it('turns an adult fix candidate into an adult decision', () =>
    expect(
      decideMatch(entry(), {
        fix: { wikiTitle: 'X', tmdbId: 5, note: '' },
        wikidataTmdbIds: [],
        candidates: [candidate({ tmdbId: 5, adult: true })],
      }),
    ).toEqual({ kind: 'adult', tmdbId: 5 }))

  it('skips an entry fixed to null', () =>
    expect(
      decideMatch(entry(), {
        fix: { wikiTitle: 'X', tmdbId: null, note: 'short film' },
        wikidataTmdbIds: [],
        candidates: [],
      }),
    ).toEqual({ kind: 'skipped', note: 'short film' }))

  it('sends a year range to review as a series', () =>
    expect(decideMatch(entry({ yearEnd: 2003 }), noEvidence)).toEqual({
      kind: 'review',
      reason: 'series',
      candidates: [],
    }))

  it('matches the Wikidata id when year and director fit', () =>
    expect(
      decideMatch(entry({ year: 1979, directors: ['Andrei Tarkovsky'] }), {
        fix: undefined,
        wikidataTmdbIds: [1398],
        candidates: [candidate({ tmdbId: 1398, year: 1980, directors: ['Andrei Tarkovsky'] })],
      }),
    ).toEqual({ kind: 'matched', tmdbId: 1398, via: 'wikidata' }))

  it('reviews a Wikidata id whose year is 3 years off', () =>
    expect(
      decideMatch(entry({ year: 1979 }), {
        fix: undefined,
        wikidataTmdbIds: [1398],
        candidates: [candidate({ tmdbId: 1398, year: 1982 })],
      }),
    ).toMatchObject({ kind: 'review', reason: 'wikidata-mismatch' }))

  it('reviews a Wikidata id whose director differs', () =>
    expect(
      decideMatch(entry({ directors: ['Andrei Tarkovsky'] }), {
        fix: undefined,
        wikidataTmdbIds: [1398],
        candidates: [candidate({ tmdbId: 1398, directors: ['Someone Else'] })],
      }),
    ).toMatchObject({ kind: 'review', reason: 'wikidata-mismatch' }))

  it('reviews a Wikidata id missing from the candidates', () =>
    expect(
      decideMatch(entry(), { fix: undefined, wikidataTmdbIds: [1398], candidates: [] }),
    ).toMatchObject({ kind: 'review', reason: 'wikidata-mismatch' }))

  it('reviews two Wikidata ids', () =>
    expect(
      decideMatch(entry(), {
        fix: undefined,
        wikidataTmdbIds: [1, 2],
        candidates: [candidate({ tmdbId: 1 }), candidate({ tmdbId: 2 })],
      }),
    ).toMatchObject({ kind: 'review', reason: 'multiple-wikidata-ids' }))

  it('matches exactly one fitting search candidate', () =>
    expect(
      decideMatch(entry({ directors: ['Andrei Tarkovsky'] }), {
        fix: undefined,
        wikidataTmdbIds: [],
        candidates: [
          candidate({ tmdbId: 10, year: 1979, directors: ['Andrei Tarkovsky'] }),
          candidate({ tmdbId: 11, year: 1995, directors: ['Andrei Tarkovsky'] }),
        ],
      }),
    ).toEqual({ kind: 'matched', tmdbId: 10, via: 'search' }))

  it('reports two fitting search candidates as ambiguous', () => {
    const first = candidate({ tmdbId: 10, year: 1979 })
    const second = candidate({ tmdbId: 11, year: 1980 })
    expect(
      decideMatch(entry(), { fix: undefined, wikidataTmdbIds: [], candidates: [first, second] }),
    ).toEqual({ kind: 'review', reason: 'ambiguous', candidates: [first, second] })
  })

  it('reports no fitting candidate as unmatched', () => {
    const far = candidate({ tmdbId: 10, year: 1995 })
    expect(
      decideMatch(entry(), { fix: undefined, wikidataTmdbIds: [], candidates: [far] }),
    ).toEqual({ kind: 'review', reason: 'unmatched', candidates: [far] })
  })

  it('turns an adult match into an adult decision', () =>
    expect(
      decideMatch(entry(), {
        fix: undefined,
        wikidataTmdbIds: [],
        candidates: [candidate({ tmdbId: 10, adult: true })],
      }),
    ).toEqual({ kind: 'adult', tmdbId: 10 }))
})

describe('directorsMatch', () => {
  it('matches directors across diacritics and by surname', () => {
    expect(directorsMatch(['Luis Buñuel'], ['Luis Bunuel'])).toBe(true)
    expect(directorsMatch(['W. D. Richter'], ['W.D. Richter'])).toBe(true)
    expect(directorsMatch(['Billy Wilder'], ['George Cukor'])).toBe(false)
  })

  it('ignores blank names and empty lists', () => {
    expect(directorsMatch(['  '], ['  '])).toBe(false)
    expect(directorsMatch([], ['Billy Wilder'])).toBe(false)
  })
})
