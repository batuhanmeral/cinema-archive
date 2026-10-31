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

const EXPECTED_CSP: Record<string, string[]> = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https://image.tmdb.org'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'frame-src': ['https://www.youtube-nocookie.com'],
  'media-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
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

  it('sends exactly the seven headers in order', () => {
    expect(vercel[0].headers.map((h) => h.key)).toEqual([
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Cross-Origin-Opener-Policy',
    ])
  })

  // HSTS, Referrer-Policy ve COOP için ZAP kuralı yok; yalnızca bu test korur
  it('keeps the exact values of the non-CSP headers', () => {
    expect(header(vercel, 'Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains')
    expect(header(vercel, 'X-Content-Type-Options')).toBe('nosniff')
    expect(header(vercel, 'X-Frame-Options')).toBe('DENY')
    expect(header(vercel, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(header(vercel, 'Permissions-Policy')).toBe(
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    )
    expect(header(vercel, 'Cross-Origin-Opener-Policy')).toBe('same-origin')
  })

  // Kaynak eklemek (https:, üçüncü taraf host) bilinçli bir test değişikliği olmalı
  it('keeps every CSP directive with its exact sources', () => {
    const value = header(vercel, 'Content-Security-Policy')
    expect(parseCsp(value)).toEqual(EXPECTED_CSP)
    expect(value).toBe(
      Object.entries(EXPECTED_CSP)
        .map(([name, sources]) => [name, ...sources].join(' '))
        .join('; '),
    )
  })
})
