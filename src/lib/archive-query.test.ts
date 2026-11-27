import { describe, expect, it } from 'vitest'
import {
  EMPTY_QUERY,
  effectiveSort,
  parseArchiveQuery,
  serializeArchiveQuery,
  type FilterKey,
} from './archive-query'

const known: Record<FilterKey, ReadonlySet<string>> = {
  genre: new Set(['18', '35']),
  theme: new Set(),
  country: new Set(['FR']),
  decade: new Set(['1960']),
  language: new Set(['fr']),
}
const parse = (s: string) => parseArchiveQuery(new URLSearchParams(s), known)

describe('parseArchiveQuery', () => {
  it('drops unknown values, a blank q and an unknown sort', () => {
    const query = parse('genre=abc,18&decade=1965&sort=foo&q=%20%20')
    expect(query.filters.genre).toEqual(['18'])
    expect(query.filters.decade).toEqual([])
    expect(query.q).toBe('')
    expect(query.sort).toBeNull()
  })
  it('dedupes and sorts values', () => {
    expect(parse('genre=35,18,18').filters.genre).toEqual(['18', '35'])
  })
  it('accepts an escaped comma', () => {
    expect(parse('genre=35%2C18').filters.genre).toEqual(['18', '35'])
  })
  it('drops a q shorter than 2 normalised characters and trims otherwise', () => {
    expect(parse('q=%20a%20').q).toBe('')
    expect(parse('q=%20godard%20').q).toBe('godard')
  })
  it('returns the empty query for no params', () => {
    expect(parse('')).toEqual(EMPTY_QUERY)
  })
})

describe('serializeArchiveQuery', () => {
  it('round-trips a canonical string', () => {
    const s = 'genre=18,35&decade=1960&q=godard&sort=popular'
    expect(serializeArchiveQuery(parse(s))).toBe(s)
  })
  it('omits the default sort', () => {
    expect(serializeArchiveQuery(parse('sort=year'))).toBe('')
    expect(serializeArchiveQuery(parse('q=godard&sort=relevance'))).toBe('q=godard')
  })
  it('keeps year when q is present', () => {
    expect(serializeArchiveQuery(parse('q=godard&sort=year'))).toBe('q=godard&sort=year')
  })
  it('encodes q', () => {
    expect(serializeArchiveQuery({ ...EMPTY_QUERY, q: 'a&b c' })).toBe('q=a%26b%20c')
  })
})

describe('effectiveSort', () => {
  it('defaults by q presence', () => {
    expect(effectiveSort(EMPTY_QUERY)).toBe('year')
    expect(effectiveSort({ ...EMPTY_QUERY, q: 'godard' })).toBe('relevance')
  })
  it('ignores relevance without q', () => {
    expect(effectiveSort({ ...EMPTY_QUERY, sort: 'relevance' })).toBe('year')
    expect(effectiveSort({ ...EMPTY_QUERY, sort: 'title' })).toBe('title')
  })
})
