import { describe, expect, it } from 'vitest'
import { matchFixSchema } from './schemas'

const fix = (tmdbId: unknown) => matchFixSchema.safeParse({ wikiTitle: 'X', tmdbId, note: '' })

describe('matchFixSchema', () => {
  it('accepts a single id, null and a series of distinct ids', () => {
    expect(fix(5).success).toBe(true)
    expect(fix(null).success).toBe(true)
    expect(fix([5, 6]).success).toBe(true)
  })

  it('rejects a one-element series, repeated ids and non-positive ids', () => {
    expect(fix([5]).success).toBe(false)
    expect(fix([5, 5]).success).toBe(false)
    expect(fix([5, 0]).success).toBe(false)
  })
})
