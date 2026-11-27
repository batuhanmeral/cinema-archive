import { describe, expect, it } from 'vitest'
import { decadeLabel } from './decades'

describe('decadeLabel', () => {
  it('uses Turkish suffixes for all 14 decades', () => {
    const decades = Array.from({ length: 14 }, (_, i) => 1890 + i * 10)
    expect(decades.map((d) => decadeLabel(d, 'tr'))).toEqual([
      "1890'lar",
      "1900'ler",
      "1910'lar",
      "1920'ler",
      "1930'lar",
      "1940'lar",
      "1950'ler",
      "1960'lar",
      "1970'ler",
      "1980'ler",
      "1990'lar",
      "2000'ler",
      "2010'lar",
      "2020'ler",
    ])
  })
  it('uses the s pattern in English', () => expect(decadeLabel(1960, 'en')).toBe('1960s'))
})
