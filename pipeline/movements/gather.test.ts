import { describe, expect, it } from 'vitest'
import type { MovementContent } from '../schemas'
import type { TmdbMovie } from '../sources/tmdb'
import { gatherMovement } from './gather'

const film = (id: number, year: number, overrides: Partial<TmdbMovie> = {}) =>
  ({
    id,
    release_date: `${year}-01-01`,
    adult: false,
    vote_count: id,
    production_countries: [{ iso_3166_1: 'FR' }],
    ...overrides,
  }) as TmdbMovie

const newWave: MovementContent = {
  slug: 'french-new-wave',
  name: { tr: 'Fransız Yeni Dalgası', en: 'French New Wave' },
  years: { start: 1958, end: 1966 },
  countries: ['FR'],
  wikipedia: { article: 'French New Wave', categories: ['A', 'B'] },
  pioneerIds: [],
}

describe('gatherMovement', () => {
  it('merges article and category sources and drops unfit, adult and foreign films', async () => {
    const movies = new Map([
      [1, film(1, 1959)],
      [2, film(2, 1960)],
      [3, film(3, 1970)],
      [4, film(4, 1961, { adult: true })],
      [5, film(5, 1962, { production_countries: [{ iso_3166_1: 'IT' }] })],
    ])
    const ids: Record<string, number> = { one: 1, two: 2, late: 3, adult: 4, italian: 5 }
    const result = await gatherMovement(
      newWave,
      {
        articleFilmLinks: async () => ['one', 'late'],
        categoryMembers: async (category) =>
          category === 'A' ? ['one', 'two', 'adult'] : ['two', 'italian'],
        resolveWikidataIds: async (titles) => new Map(titles.map((t) => [t, `Q${ids[t]}`])),
        tmdbIdsForQids: async (qids) => new Map(qids.map((q) => [q, [Number(q.slice(1))]])),
      },
      {
        load: async (id) => movies.get(id) ?? null,
        cultIds: new Set([2]),
        handFilms: [{ movie: film(3, 1970), source: 'bfi' }],
      },
    )
    expect(result.candidates).toBe(3)
    expect(result.adultExcluded).toMatchObject([{ wikiTitle: 'adult', tmdbId: 4 }])
    expect(result.selection.map((c) => [c.tmdbId, c.onCultList, [...c.sources].sort()])).toEqual([
      [1, false, ['article', 'category']],
      [2, true, ['category']],
      [3, false, ['bfi']],
    ])
  })
})
