import { describe, expect, it } from 'vitest'
import { buildArchiveMetadata } from './metadata'

describe('buildArchiveMetadata', () => {
  it('builds the English title, description and canonical without a query', () => {
    expect(buildArchiveMetadata('en', 'https://x')).toEqual({
      title: 'Archive · Sinema Arşivi',
      description: 'Every film on the site. Filter by genre, theme, country, year and language.',
      alternates: {
        canonical: 'https://x/en/archive',
        languages: { tr: 'https://x/archive', en: 'https://x/en/archive' },
      },
    })
  })

  it('builds the Turkish title and canonical', () => {
    const metadata = buildArchiveMetadata('tr', 'https://x')
    expect(metadata.title).toBe('Arşiv · Sinema Arşivi')
    expect(metadata.alternates?.canonical).toBe('https://x/archive')
  })
})
