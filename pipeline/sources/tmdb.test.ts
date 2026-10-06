import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { HttpClient } from '../lib/http'
import { fetchGenres, fetchMovie, searchMovies } from './tmdb'

const fixturePath = join(__dirname, '__fixtures__/tmdb-movie-1398.json')

function fakeHttp(respond: (url: string) => unknown) {
  return {
    getJson: vi.fn(async (url: string) => respond(url)),
    postFormJson: vi.fn(),
  } satisfies HttpClient
}

describe('fetchMovie', () => {
  it('requests one appended movie and parses it', async () => {
    const http = fakeHttp(() => JSON.parse(readFileSync(fixturePath, 'utf8')))
    const movie = await fetchMovie(http, 1398)
    expect(movie.id).toBe(1398)
    const url = new URL(http.getJson.mock.calls[0]![0])
    expect(url.pathname).toBe('/3/movie/1398')
    expect(url.searchParams.get('append_to_response')).toBe(
      'credits,images,videos,keywords,translations',
    )
    expect(url.searchParams.get('include_image_language')).toBe('tr,en,null')
  })

  it('rejects a TMDB response without an id and names the requested movie', async () => {
    const http = { getJson: async () => ({ title: 'x' }), postFormJson: async () => ({}) }
    await expect(fetchMovie(http, 42)).rejects.toThrow(/42/)
  })
})

describe('searchMovies', () => {
  it('parses hits and encodes the query with adult results included', async () => {
    const hit = {
      id: 1,
      title: 'A',
      original_title: 'A',
      release_date: '1979-01-01',
      adult: false,
      extra: 1,
    }
    const http = fakeHttp(() => ({ results: [hit] }))
    const hits = await searchMovies(http, 'Stalker & co')
    expect(hits).toHaveLength(1)
    const url = http.getJson.mock.calls[0]![0]
    expect(url).toContain('include_adult=true')
    expect(url).toContain('query=Stalker+%26+co')
  })
})

describe('fetchGenres', () => {
  it('merges English and Turkish names by id', async () => {
    const http = fakeHttp((url) =>
      url.includes('language=tr')
        ? { genres: [{ id: 18, name: 'Dram' }] }
        : {
            genres: [
              { id: 18, name: 'Drama' },
              { id: 99, name: 'Documentary' },
            ],
          },
    )
    expect(await fetchGenres(http)).toEqual([
      { id: 18, en: 'Drama', tr: 'Dram' },
      { id: 99, en: 'Documentary', tr: 'Documentary' },
    ])
  })
})
