import { describe, expect, it } from 'vitest'
import { makeMovement } from '@/data/fixtures'
import { buildMovementMetadata } from './metadata'

const SITE_URL = 'https://sinemaarsivi.com'

describe('buildMovementMetadata', () => {
  it('sets the title and language alternates', () => {
    const m = buildMovementMetadata(makeMovement(), 'tr', SITE_URL)
    expect(m.title).toBe('Fransız Yeni Dalgası · Sinema Arşivi')
    expect(m.alternates?.languages).toEqual({
      tr: 'https://sinemaarsivi.com/akim/french-new-wave',
      en: 'https://sinemaarsivi.com/en/movement/french-new-wave',
    })
  })

  it('points the canonical URL at the page itself', () => {
    const m = buildMovementMetadata(makeMovement(), 'en', SITE_URL)
    expect(m.title).toBe('French New Wave · Sinema Arşivi')
    expect(m.alternates?.canonical).toBe('https://sinemaarsivi.com/en/movement/french-new-wave')
  })
})
