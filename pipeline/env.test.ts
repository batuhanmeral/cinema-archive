import { describe, expect, it } from 'vitest'
import { loadPipelineEnv } from './env'

describe('loadPipelineEnv', () => {
  it('names the missing variable and never prints values', () => {
    expect(() => loadPipelineEnv({ SITE_URL: 'https://sinemaarsivi.com' })).toThrow(
      /TMDB_ACCESS_TOKEN/,
    )
  })

  it('does not echo invalid values', () => {
    expect(() => loadPipelineEnv({ SITE_URL: 'not-a-url-secret', TMDB_ACCESS_TOKEN: 't' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('not-a-url-secret') }),
    )
  })

  it('returns the parsed values', () => {
    expect(
      loadPipelineEnv({ SITE_URL: 'https://sinemaarsivi.com/', TMDB_ACCESS_TOKEN: 'tok' }),
    ).toEqual({
      tmdbAccessToken: 'tok',
      siteUrl: 'https://sinemaarsivi.com',
    })
  })
})
