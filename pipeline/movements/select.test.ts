import { describe, expect, it } from 'vitest'
import {
  fitsMovement,
  selectMovementFilms,
  type MovementCandidate,
  type MovementSource,
} from './select'

const candidate = (tmdbId: number, over: Partial<MovementCandidate> = {}): MovementCandidate => ({
  tmdbId,
  year: 1960,
  voteCount: 100,
  onCultList: false,
  sources: new Set<MovementSource>(['article']),
  ...over,
})

describe('fitsMovement', () => {
  const newWave = { years: { start: 1958, end: 1966 }, countries: ['FR'] }

  it('allows one year of tolerance on both ends', () => {
    expect(fitsMovement(newWave, { year: 1957, countries: ['FR'] })).toBe(true)
    expect(fitsMovement(newWave, { year: 1967, countries: ['FR'] })).toBe(true)
  })

  it('rejects years outside the tolerance', () => {
    expect(fitsMovement(newWave, { year: 1968, countries: ['FR'] })).toBe(false)
  })

  it('rejects other countries and films without countries', () => {
    expect(fitsMovement(newWave, { year: 1960, countries: ['IT'] })).toBe(false)
    expect(fitsMovement(newWave, { year: 1960, countries: [] })).toBe(false)
  })

  it('has no upper bound for an ongoing movement', () => {
    const ongoing = { years: { start: 2001, end: null }, countries: ['RO'] }
    expect(fitsMovement(ongoing, { year: 2023, countries: ['RO'] })).toBe(true)
  })
})

describe('selectMovementFilms', () => {
  it('drops non-cult, single-source, lowest-vote films over the limit', () => {
    const cult = Array.from({ length: 5 }, (_, i) =>
      candidate(i + 1, { onCultList: true, voteCount: 5 }),
    )
    const multi = Array.from({ length: 10 }, (_, i) =>
      candidate(100 + i, { sources: new Set<MovementSource>(['article', 'bfi']) }),
    )
    const single = Array.from({ length: 25 }, (_, i) => candidate(200 + i, { voteCount: 1000 + i }))
    const weakest = Array.from({ length: 5 }, (_, i) => candidate(300 + i, { voteCount: i }))
    const picked = selectMovementFilms([...weakest, ...single, ...multi, ...cult])
    const ids = new Set(picked.map((c) => c.tmdbId))
    expect(picked).toHaveLength(40)
    for (const c of weakest) expect(ids.has(c.tmdbId)).toBe(false)
  })

  it('prefers a cult-list film with few votes over a popular non-cult one', () => {
    const cult = candidate(1, { onCultList: true, voteCount: 3 })
    const popular = candidate(2, { voteCount: 10000 })
    expect(selectMovementFilms([popular, cult], 1)).toEqual([cult])
  })

  it('merges duplicate ids and unions their sources', () => {
    const a = candidate(7, { sources: new Set<MovementSource>(['article']) })
    const b = candidate(7, { sources: new Set<MovementSource>(['mubi']) })
    const [merged] = selectMovementFilms([a, b])
    expect(merged?.sources.size).toBe(2)
  })

  it('returns films sorted by year then tmdb id', () => {
    const picked = selectMovementFilms([
      candidate(3, { year: 1962 }),
      candidate(2, { year: 1961 }),
      candidate(1, { year: 1962 }),
    ])
    expect(picked.map((c) => c.tmdbId)).toEqual([2, 1, 3])
  })
})
