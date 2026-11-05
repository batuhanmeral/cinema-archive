import { describe, expect, it } from 'vitest'
import { makeCollection } from '@/data/fixtures'
import { buildCollectionMetadata, buildCollectionsListMetadata } from './metadata'

const SITE_URL = 'https://sinemaarsivi.com'

describe('buildCollectionMetadata', () => {
  it('sets the title and language alternates', () => {
    const m = buildCollectionMetadata(makeCollection(), 'tr', SITE_URL)
    expect(m.title).toBe('Yavaş Sinema · Sinema Arşivi')
    expect(m.alternates?.languages).toEqual({
      tr: 'https://sinemaarsivi.com/collection/slow-cinema',
      en: 'https://sinemaarsivi.com/en/collection/slow-cinema',
    })
  })

  it('points the canonical URL at the page itself', () => {
    const m = buildCollectionMetadata(makeCollection(), 'en', SITE_URL)
    expect(m.title).toBe('Slow Cinema · Sinema Arşivi')
    expect(m.alternates?.canonical).toBe('https://sinemaarsivi.com/en/collection/slow-cinema')
  })
})

describe('buildCollectionsListMetadata', () => {
  it('links the list pages across languages', () => {
    const m = buildCollectionsListMetadata('en', SITE_URL)
    expect(m.title).toBe('Collections · Sinema Arşivi')
    expect(m.alternates?.canonical).toBe('https://sinemaarsivi.com/en/collections')
    expect(m.alternates?.languages).toEqual({
      tr: 'https://sinemaarsivi.com/collections',
      en: 'https://sinemaarsivi.com/en/collections',
    })
  })
})
