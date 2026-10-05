import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHttpClient } from './http'

const tempDirs: string[] = []
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('createHttpClient', () => {
  it('retries a 429 after the Retry-After delay', async () => {
    const sleep = vi.fn(async () => {})
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '2' } }))
      .mockResolvedValueOnce(Response.json({ ok: true }))
    const http = createHttpClient({ userAgent: 'ua', concurrency: 1, fetchImpl, sleep })
    await expect(http.getJson('https://x.test/a')).resolves.toEqual({ ok: true })
    expect(sleep).toHaveBeenCalledWith(2000)
  })

  it('throws HttpError with status and URL after maxRetries', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 503 }))
    const http = createHttpClient({
      userAgent: 'ua',
      concurrency: 1,
      fetchImpl,
      sleep: async () => {},
      maxRetries: 2,
    })
    await expect(http.getJson('https://x.test/b')).rejects.toMatchObject({
      status: 503,
      url: 'https://x.test/b',
    })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('does not retry a 404', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 404 }))
    const http = createHttpClient({
      userAgent: 'ua',
      concurrency: 1,
      fetchImpl,
      sleep: async () => {},
    })
    await expect(http.getJson('https://x.test/c')).rejects.toMatchObject({ status: 404 })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('never runs more than `concurrency` requests at once', async () => {
    let active = 0,
      peak = 0
    const fetchImpl = vi.fn(async () => {
      active++
      peak = Math.max(peak, active)
      await new Promise((r) => setTimeout(r, 5))
      active--
      return Response.json({})
    })
    const http = createHttpClient({ userAgent: 'ua', concurrency: 3, fetchImpl })
    await Promise.all(Array.from({ length: 10 }, (_, i) => http.getJson(`https://x.test/${i}`)))
    expect(peak).toBe(3)
  })

  it('serves the second identical request from the disk cache', async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'http-'))
    tempDirs.push(cacheDir)
    const fetchImpl = vi.fn(async () => Response.json({ n: 1 }))
    const http = createHttpClient({ userAgent: 'ua', concurrency: 1, fetchImpl, cacheDir })
    await http.getJson('https://x.test/d')
    await expect(http.getJson('https://x.test/d')).resolves.toEqual({ n: 1 })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('sends headers but keeps them out of the cache files', async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'http-'))
    tempDirs.push(cacheDir)
    const inits: RequestInit[] = []
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      inits.push(init ?? {})
      return Response.json({ n: 1 })
    })
    const http = createHttpClient({
      userAgent: 'ua',
      concurrency: 1,
      fetchImpl,
      cacheDir,
      headers: { Authorization: 'Bearer SECRET-TOKEN' },
    })
    await http.getJson('https://x.test/e')
    const sent = new Headers(inits[0]?.headers)
    expect(sent.get('Authorization')).toBe('Bearer SECRET-TOKEN')
    expect(sent.get('User-Agent')).toBe('ua')
    expect(sent.get('Accept')).toBe('application/json')
    const files = await readdir(cacheDir)
    expect(files).toHaveLength(1)
    expect(await readFile(join(cacheDir, files[0] ?? ''), 'utf8')).not.toContain('SECRET-TOKEN')
  })

  it('posts form data and caches by body', async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'http-'))
    tempDirs.push(cacheDir)
    const inits: RequestInit[] = []
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      inits.push(init ?? {})
      return Response.json({ n: 2 })
    })
    const http = createHttpClient({ userAgent: 'ua', concurrency: 1, fetchImpl, cacheDir })
    await http.postFormJson('https://x.test/q', { query: 'a' })
    await http.postFormJson('https://x.test/q', { query: 'a' })
    await http.postFormJson('https://x.test/q', { query: 'b' })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const init = inits[0] ?? {}
    expect(init.method).toBe('POST')
    expect(String(init.body)).toBe('query=a')
  })

  it('names the URL when a 2xx body is not valid JSON', async () => {
    const fetchImpl = vi.fn(async () => new Response('<html>', { status: 200 }))
    const http = createHttpClient({ userAgent: 'ua', concurrency: 1, fetchImpl })
    await expect(http.getJson('https://x.test/f')).rejects.toThrow(/https:\/\/x\.test\/f/)
  })

  it('retries a rejected fetch and then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(Response.json({ ok: true }))
    const sleep = vi.fn(async () => {})
    const http = createHttpClient({ userAgent: 'ua', concurrency: 1, fetchImpl, sleep })
    await expect(http.getJson('https://x.test/g')).resolves.toEqual({ ok: true })
    expect(sleep).toHaveBeenCalledWith(1000)
  })

  it('gives up on a always-rejecting fetch with an error naming the URL', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('timeout')
    })
    const http = createHttpClient({
      userAgent: 'ua',
      concurrency: 1,
      fetchImpl,
      sleep: async () => {},
      maxRetries: 2,
    })
    await expect(http.getJson('https://x.test/h')).rejects.toThrow(/https:\/\/x\.test\/h.*timeout/)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('clamps an oversized Retry-After to 60 seconds', async () => {
    const sleep = vi.fn(async () => {})
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '99999' } }))
      .mockResolvedValueOnce(Response.json({}))
    const http = createHttpClient({ userAgent: 'ua', concurrency: 1, fetchImpl, sleep })
    await http.getJson('https://x.test/i')
    expect(sleep).toHaveBeenCalledWith(60000)
  })

  it('clamps a negative Retry-After to zero', async () => {
    const sleep = vi.fn(async () => {})
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '-5' } }))
      .mockResolvedValueOnce(Response.json({}))
    const http = createHttpClient({ userAgent: 'ua', concurrency: 1, fetchImpl, sleep })
    await http.getJson('https://x.test/j')
    expect(sleep).toHaveBeenCalledWith(0)
  })
})
