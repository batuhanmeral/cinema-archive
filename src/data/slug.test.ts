import { describe, expect, it } from 'vitest'
import { assignFilmSlug, assignPersonSlug, slugify } from './slug'

describe('slugify', () => {
  it.each([
    ['Ace in the Hole', 'ace-in-the-hole'],
    ['À ma sœur!', 'a-ma-soeur'],
    ['Dünyayı Kurtaran Adam', 'dunyayi-kurtaran-adam'],
    ['İz Sürücü', 'iz-surucu'],
    ['Æon Flux: The Movie', 'aeon-flux-the-movie'],
    ['七人の侍', ''],
  ])('%s → %s', (input, expected) => expect(slugify(input)).toBe(expected))
})

describe('assignFilmSlug', () => {
  it('joins the title and the year', () => {
    expect(assignFilmSlug({ title: 'Stalker', year: 1979, tmdbId: 1398 }, new Set())).toBe(
      'stalker-1979',
    )
  })
  it('appends the TMDB id when the slug is taken', () => {
    expect(
      assignFilmSlug({ title: 'Stalker', year: 1979, tmdbId: 9 }, new Set(['stalker-1979'])),
    ).toBe('stalker-1979-9')
  })
  it('falls back to "film" when the title has no Latin letters', () => {
    expect(assignFilmSlug({ title: '七人の侍', year: 1954, tmdbId: 346 }, new Set())).toBe(
      'film-1954',
    )
  })
})

describe('assignPersonSlug', () => {
  it('appends the TMDB id on collision', () => {
    expect(assignPersonSlug({ name: 'John Smith', tmdbId: 7 }, new Set(['john-smith']))).toBe(
      'john-smith-7',
    )
  })
  it('falls back to "person-<id>" when the name has no Latin letters', () => {
    expect(assignPersonSlug({ name: '黒澤明', tmdbId: 5026 }, new Set())).toBe('person-5026')
  })
})
