import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const DEFAULT_MAX_RETRIES = 4
const BASE_BACKOFF_MS = 1000
const REQUEST_TIMEOUT_MS = 30_000
const MAX_RETRY_DELAY_MS = 60_000

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
  ) {
    super(`HTTP ${status} for ${url}`)
    this.name = 'HttpError'
  }
}

export type HttpClient = {
  getJson(url: string): Promise<unknown>
  postFormJson(url: string, form: Record<string, string>): Promise<unknown>
}

export type HttpClientOptions = {
  userAgent: string
  concurrency: number
  headers?: Record<string, string>
  cacheDir?: string | null
  maxRetries?: number
  fetchImpl?: typeof fetch
  sleep?: (ms: number) => Promise<void>
}

type Limiter = <T>(task: () => Promise<T>) => Promise<T>

// Basit söz kuyruğu: en fazla `limit` görev aynı anda çalışır.
function createLimiter(limit: number): Limiter {
  let active = 0
  const waiting: Array<() => void> = []
  // Slot doğrudan bekleyene devredilir; `active` düşmediği için limit aşılamaz.
  const release = () => {
    const next = waiting.shift()
    if (next) next()
    else active--
  }
  return async (task) => {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve))
    else active++
    try {
      return await task()
    } finally {
      release()
    }
  }
}

const isRetryable = (status: number) => status === 429 || status >= 500

function retryDelayMs(response: Response, attempt: number): number {
  const header = response.headers.get('Retry-After')
  const seconds = Number(header)
  // Sunucudan gelen değer güvenilmez: negatif veya devasa bekleme engellenir.
  if (header && Number.isFinite(seconds)) {
    return Math.min(Math.max(seconds * 1000, 0), MAX_RETRY_DELAY_MS)
  }
  return BASE_BACKOFF_MS * 2 ** attempt
}

// Anahtar yalnızca method + URL + gövdeden türer; başlıklar (token) dahil edilmez.
const cacheKey = (method: string, url: string, body: string) =>
  createHash('sha1').update(method).update(url).update(body).digest('hex')

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const {
    userAgent,
    headers = {},
    cacheDir = null,
    maxRetries = DEFAULT_MAX_RETRIES,
    fetchImpl = fetch,
    sleep = (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  } = options
  const limit = createLimiter(options.concurrency)

  async function readCache(key: string): Promise<unknown | undefined> {
    if (!cacheDir) return undefined
    try {
      return JSON.parse(await readFile(join(cacheDir, `${key}.json`), 'utf8'))
    } catch {
      return undefined
    }
  }

  async function writeCache(key: string, data: unknown): Promise<void> {
    if (!cacheDir) return
    await mkdir(cacheDir, { recursive: true })
    await writeFile(join(cacheDir, `${key}.json`), JSON.stringify(data))
  }

  async function request(method: string, url: string, body?: string): Promise<unknown> {
    const key = cacheKey(method, url, body ?? '')
    const cached = await readCache(key)
    if (cached !== undefined) return cached

    const init: RequestInit = {
      method,
      body,
      headers: {
        ...headers,
        'User-Agent': userAgent,
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/x-www-form-urlencoded' }),
      },
    }

    for (let attempt = 0; ; attempt++) {
      // Slot yalnızca istek sırasında tutulur; bekleme (sleep) sırasında bırakılır.
      let response: Response
      try {
        response = await limit(() =>
          fetchImpl(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
        )
      } catch (cause) {
        if (attempt >= maxRetries) {
          const reason = cause instanceof Error ? cause.message : 'unknown error'
          throw new Error(`Request failed for ${url}: ${reason}`, { cause })
        }
        await sleep(BASE_BACKOFF_MS * 2 ** attempt)
        continue
      }
      if (response.ok) {
        let data: unknown
        try {
          data = await response.json()
        } catch {
          throw new Error(`Invalid JSON response for ${url}`)
        }
        await writeCache(key, data)
        return data
      }
      await response.body?.cancel()
      if (!isRetryable(response.status) || attempt >= maxRetries) {
        throw new HttpError(response.status, url)
      }
      await sleep(retryDelayMs(response, attempt))
    }
  }

  return {
    getJson: (url) => request('GET', url),
    postFormJson: (url, form) => request('POST', url, new URLSearchParams(form).toString()),
  }
}
