import { describe, expect, it } from 'vitest'
import {
  collectionRuleSchema,
  importReportSchema,
  matchFixSchema,
  movementContentFileSchema,
} from './schemas'

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

describe('collectionRuleSchema', () => {
  it('rejects a rule with only a year range', () => {
    expect(collectionRuleSchema.safeParse({ years: { start: 1930, end: 1960 } }).success).toBe(
      false,
    )
  })

  it('accepts a membership field with a year range', () => {
    const rule = { countries: ['US'], years: { start: 1930, end: 1960 } }
    expect(collectionRuleSchema.safeParse(rule).success).toBe(true)
  })
})

describe('collectionRuleSchema articles', () => {
  it('accepts wikipediaArticles as a membership field and rejects an empty list', () => {
    const rule = { wikipediaArticles: ['Midnight movie'], years: { start: 1968, end: 1984 } }
    expect(collectionRuleSchema.safeParse(rule).success).toBe(true)
    expect(collectionRuleSchema.safeParse({ wikipediaArticles: [] }).success).toBe(false)
  })
})

describe('movementContentFileSchema', () => {
  const entry = {
    slug: 'dogme-95',
    name: { tr: 'Dogme 95', en: 'Dogme 95' },
    years: { start: 1995, end: 2005 },
    countries: ['DK'],
    wikipedia: { article: 'Dogme 95', categories: [] },
    pioneerIds: [],
  }

  it('rejects two entries with the same slug', () => {
    expect(movementContentFileSchema.safeParse([entry, entry]).success).toBe(false)
  })

  it('accepts distinct slugs', () => {
    expect(movementContentFileSchema.safeParse([entry, { ...entry, slug: 'other' }]).success).toBe(
      true,
    )
  })
})

describe('importReportSchema', () => {
  const report = {
    generatedAt: '2026-10-30T10:00:00.000Z',
    counts: {
      listRows: 0,
      films: 0,
      added: 0,
      missingFromSources: 0,
      review: 0,
      adultExcluded: 0,
      skipped: 0,
    },
    added: [],
    missingFromSources: [],
    review: [],
    adultExcluded: [],
    skipped: [],
  }

  it('requires groups', () => {
    expect(importReportSchema.safeParse(report).success).toBe(false)
    const groups = { movements: [], collections: [] }
    expect(importReportSchema.safeParse({ ...report, groups }).success).toBe(true)
  })
})
