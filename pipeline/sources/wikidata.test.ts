import { describe, expect, it, vi } from 'vitest'
import type { HttpClient } from '../lib/http'
import { fetchAwardCounts, fetchTmdbIdsForQids } from './wikidata'

const uri = (qid: string) => ({ type: 'uri', value: `http://www.wikidata.org/entity/${qid}` })
const lit = (value: string) => ({ type: 'literal', value })

function fakeSparql(bindings: unknown[]) {
  return {
    getJson: vi.fn(),
    postFormJson: vi.fn().mockResolvedValue({ results: { bindings } }),
  } satisfies HttpClient
}

const oscar = { key: 'oscar', tr: 'Oscar', en: 'Oscar', qids: ['Q19020'] }

describe('fetchTmdbIdsForQids', () => {
  it('groups TMDB ids by QID', async () => {
    const http = fakeSparql([
      { item: uri('Q200437'), tmdb: lit('1398') },
      { item: uri('Q5'), tmdb: lit('10') },
      { item: uri('Q5'), tmdb: lit('11') },
    ])
    const ids = await fetchTmdbIdsForQids(http, ['Q200437', 'Q5'])
    expect(ids.get('Q200437')).toEqual([1398])
    expect(ids.get('Q5')).toEqual([10, 11])
  })

  it('sends one SPARQL request per batch', async () => {
    const http = fakeSparql([])
    await fetchTmdbIdsForQids(
      http,
      Array.from({ length: 301 }, (_, i) => `Q${i + 1}`),
    )
    expect(http.postFormJson).toHaveBeenCalledTimes(2)
  })

  it('ignores non-numeric tmdb values', async () => {
    const http = fakeSparql([
      { item: uri('Q5'), tmdb: lit('abc') },
      { item: uri('Q5'), tmdb: lit('12') },
    ])
    expect((await fetchTmdbIdsForQids(http, ['Q5'])).get('Q5')).toEqual([12])
  })

  it('throws on a malformed response, naming the request', async () => {
    const http = { getJson: vi.fn(), postFormJson: vi.fn().mockResolvedValue({ nope: 1 }) }
    await expect(fetchTmdbIdsForQids(http, ['Q5'])).rejects.toThrow(/Malformed.*Q5/)
  })

  it('rejects a QID that could inject SPARQL', async () => {
    const http = fakeSparql([])
    await expect(fetchTmdbIdsForQids(http, ['Q5 } ; DROP'])).rejects.toThrow(/Invalid QID/)
    expect(http.postFormJson).not.toHaveBeenCalled()
  })
})

describe('fetchAwardCounts', () => {
  it('counts distinct awards per group key', async () => {
    const http = fakeSparql([
      { tmdb: lit('275'), award: uri('Q41417'), group: uri('Q19020') },
      { tmdb: lit('275'), award: uri('Q103618'), group: uri('Q19020') },
      { tmdb: lit('275'), award: uri('Q103618'), group: uri('Q19020') },
    ])
    expect((await fetchAwardCounts(http, [275], [oscar])).get(275)).toEqual({ oscar: 2 })
  })

  it('counts an award matched through two QIDs of one group once', async () => {
    const cannes = { key: 'cannes', tr: 'Cannes', en: 'Cannes', qids: ['Q42369', 'Q179808'] }
    const http = fakeSparql([
      { tmdb: lit('1'), award: uri('Q1'), group: uri('Q42369') },
      { tmdb: lit('1'), award: uri('Q1'), group: uri('Q179808') },
    ])
    expect((await fetchAwardCounts(http, [1], [cannes])).get(1)).toEqual({ cannes: 1 })
  })

  it('omits films without whitelisted awards', async () => {
    const http = fakeSparql([])
    expect((await fetchAwardCounts(http, [275], [oscar])).has(275)).toBe(false)
  })

  it('sends 2 requests for 201 ids', async () => {
    const http = fakeSparql([])
    await fetchAwardCounts(
      http,
      Array.from({ length: 201 }, (_, i) => i + 1),
      [oscar],
    )
    expect(http.postFormJson).toHaveBeenCalledTimes(2)
  })

  it('throws on a malformed response, naming the request', async () => {
    const http = { getJson: vi.fn(), postFormJson: vi.fn().mockResolvedValue({}) }
    await expect(fetchAwardCounts(http, [275], [oscar])).rejects.toThrow(/Malformed.*275/)
  })

  it('rejects invalid group QIDs and tmdb ids', async () => {
    const http = fakeSparql([])
    const bad = { ...oscar, qids: ['Q1 }'] }
    await expect(fetchAwardCounts(http, [275], [bad])).rejects.toThrow(/Invalid QID/)
    await expect(fetchAwardCounts(http, [-1], [oscar])).rejects.toThrow(/Invalid TMDB id/)
    expect(http.postFormJson).not.toHaveBeenCalled()
  })
})
