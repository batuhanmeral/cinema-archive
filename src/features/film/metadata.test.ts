import { describe, expect, it } from 'vitest'
import { makeFilm } from '@/data/fixtures'
import { buildFilmMetadata } from './metadata'

const SITE_URL = 'https://sinemaarsivi.com'

describe('buildFilmMetadata', () => {
  it('sets title and language alternates', () => {
    const m = buildFilmMetadata(makeFilm(), 'tr', SITE_URL)
    expect(m.title).toBe('İz Sürücü (1979) · Sinema Arşivi')
    expect(m.alternates?.languages).toEqual({
      tr: 'https://sinemaarsivi.com/film/stalker-1979',
      en: 'https://sinemaarsivi.com/en/film/stalker-1979',
    })
  })

  it('points the canonical URL at the page itself', () => {
    const m = buildFilmMetadata(makeFilm(), 'en', SITE_URL)
    expect(m.title).toBe('Stalker (1979) · Sinema Arşivi')
    expect(m.alternates?.canonical).toBe('https://sinemaarsivi.com/en/film/stalker-1979')
  })

  it('cuts a long overview at a word boundary', () => {
    const overview = `${'word '.repeat(40)}end`
    const description = buildFilmMetadata(
      makeFilm({ overview: { tr: overview, en: null } }),
      'tr',
      SITE_URL,
    ).description
    expect(description?.length).toBeLessThanOrEqual(160)
    expect(description).toMatch(/word…$/)
  })

  it('keeps a short overview whole', () => {
    expect(buildFilmMetadata(makeFilm(), 'en', SITE_URL).description).toBe(
      'A guide leads two men into the Zone.',
    )
  })

  it('omits the description when the overview is missing', () => {
    const m = buildFilmMetadata(makeFilm({ overview: { tr: null, en: 'x' } }), 'tr', SITE_URL)
    expect(m).not.toHaveProperty('description')
  })

  it('shares the poster at w780 and nothing without one', () => {
    expect(buildFilmMetadata(makeFilm(), 'tr', SITE_URL).openGraph?.images).toEqual([
      'https://image.tmdb.org/t/p/w780/stalker-tr.jpg',
    ])
    const noPoster = makeFilm({ poster: { tr: null, en: null } })
    expect(buildFilmMetadata(noPoster, 'tr', SITE_URL).openGraph?.images).toBeUndefined()
  })
})
