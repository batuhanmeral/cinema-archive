import { describe, expect, it } from 'vitest'
import { parseSiteEnv } from './env'

describe('parseSiteEnv', () => {
  it('returns the site URL without a trailing slash', () => {
    expect(parseSiteEnv({ SITE_URL: 'https://sinemaarsivi.com/' })).toEqual({
      siteUrl: 'https://sinemaarsivi.com',
    })
  })
  it('fails with a message naming SITE_URL when it is missing', () => {
    expect(() => parseSiteEnv({})).toThrow(/SITE_URL/)
  })
  it('fails when SITE_URL is not a URL', () => {
    expect(() => parseSiteEnv({ SITE_URL: 'sinemaarsivi' })).toThrow(/SITE_URL/)
  })
})
