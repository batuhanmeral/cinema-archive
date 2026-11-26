import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadSearchData } from './load'

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

  it('rejects on a malformed index', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{"films":1}', { status: 200 }))),
    )
    const { loadSearchData: load } = await import('./load')
    await expect(load('tr')).rejects.toThrow()
  })

  it('exports the loader', () => {
    expect(typeof loadSearchData).toBe('function')
  })
})
