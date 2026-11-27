import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const index = { films: [], groups: [] }
const ok = () => Promise.resolve(new Response(JSON.stringify(index), { status: 200 }))

describe('loadSearchData', () => {
  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shares one fetch between calls', async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(ok)
    vi.stubGlobal('fetch', fetchMock)
    const { loadSearchData: load } = await import('./load')
    const [a, b] = await Promise.all([load('tr'), load('tr')])
    expect(a).toBe(b)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/archive-data/index-tr.json')
    expect(a.matcher.films('stalker')).toEqual([])
  })

  it('rejects on 404 and retries on the next call', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockImplementation(ok)
    vi.stubGlobal('fetch', fetchMock)
    const { loadSearchData: load } = await import('./load')
    await expect(load('en')).rejects.toThrow()
    await expect(load('en')).resolves.toBeDefined()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rejects on a malformed index and evicts it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"films":1}', { status: 200 }))
      .mockImplementation(ok)
    vi.stubGlobal('fetch', fetchMock)
    const { loadSearchData: load } = await import('./load')
    await expect(load('tr')).rejects.toThrow()
    await expect(load('tr')).resolves.toBeDefined()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rejects when fetch itself throws and retries', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockImplementation(ok)
    vi.stubGlobal('fetch', fetchMock)
    const { loadSearchData: load } = await import('./load')
    await expect(load('tr')).rejects.toThrow('offline')
    await expect(load('tr')).resolves.toBeDefined()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

const slugsOk = () =>
  Promise.resolve(new Response('["stalker-1979","solaris-1972"]', { status: 200 }))

describe('loadFilmSlugs', () => {
  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shares one fetch between calls', async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(slugsOk)
    vi.stubGlobal('fetch', fetchMock)
    const { loadFilmSlugs } = await import('./load')
    const [a, b] = await Promise.all([loadFilmSlugs(), loadFilmSlugs()])
    expect(a).toEqual(['stalker-1979', 'solaris-1972'])
    expect(b).toBe(a)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/archive-data/film-slugs.json')
  })

  it('rejects on 404 and retries on the next call', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockImplementation(slugsOk)
    vi.stubGlobal('fetch', fetchMock)
    const { loadFilmSlugs } = await import('./load')
    await expect(loadFilmSlugs()).rejects.toThrow()
    await expect(loadFilmSlugs()).resolves.toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rejects on a malformed list and evicts it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"a":1}', { status: 200 }))
      .mockImplementation(slugsOk)
    vi.stubGlobal('fetch', fetchMock)
    const { loadFilmSlugs } = await import('./load')
    await expect(loadFilmSlugs()).rejects.toThrow()
    await expect(loadFilmSlugs()).resolves.toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
