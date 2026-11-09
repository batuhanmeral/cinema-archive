import { describe, expect, it } from 'vitest'
import { buildHomeMetadata } from './metadata'

describe('home metadata', () => {
  it.each([
    ['tr', 'https://x/'],
    ['en', 'https://x/en'],
  ] as const)('sets canonical and language alternatives for %s', (locale, canonical) => {
    const metadata = buildHomeMetadata(locale, 'https://x')
    expect(metadata.title).toBe('Sinema Arşivi')
    expect(metadata.alternates).toEqual({
      canonical,
      languages: { tr: 'https://x/', en: 'https://x/en' },
    })
  })
})
