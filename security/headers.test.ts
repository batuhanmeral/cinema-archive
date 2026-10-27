import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

type HeaderRule = { source: string; headers: { key: string; value: string }[] }

function readHeaders(file: string): HeaderRule[] {
  const raw = readFileSync(path.join(__dirname, '..', file), 'utf8')
  return (JSON.parse(raw) as { headers: HeaderRule[] }).headers
}

function header(rules: HeaderRule[], key: string): string {
  const found = rules.flatMap((rule) => rule.headers).find((h) => h.key === key)
  if (!found) throw new Error(`missing header ${key}`)
  return found.value
}

function parseCsp(value: string): Record<string, string[]> {
  return Object.fromEntries(
    value
      .split(';')
      .map((directive) => directive.trim().split(/\s+/))
      .filter((parts) => parts[0] !== '')
      .map(([name, ...sources]) => [name, sources]),
  )
}

const vercel = readHeaders('vercel.json')
const serve = readHeaders('serve.json')

describe('security headers', () => {
  it('declares one rule for all paths in each file', () => {
    expect(vercel.map((r) => r.source)).toEqual(['/(.*)'])
    expect(serve.map((r) => r.source)).toEqual(['**'])
  })

  it('keeps production and local headers identical', () => {
    expect(serve[0].headers).toEqual(vercel[0].headers)
  })

  it('locks down framing, plugins and base URLs', () => {
    const csp = parseCsp(header(vercel, 'Content-Security-Policy'))
    expect(csp['frame-ancestors']).toEqual(["'none'"])
    expect(csp['object-src']).toEqual(["'none'"])
    expect(csp['base-uri']).toEqual(["'self'"])
  })

  it('allows only TMDB images and the nocookie YouTube embed from other origins', () => {
    const csp = parseCsp(header(vercel, 'Content-Security-Policy'))
    expect(csp['img-src']).toContain('https://image.tmdb.org')
    expect(csp['frame-src']).toEqual(['https://www.youtube-nocookie.com'])
    expect(Object.values(csp).flat()).not.toContain('*')
  })
})
