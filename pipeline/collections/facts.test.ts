import { describe, expect, it } from 'vitest'
import { makeFilm } from '../../src/data/fixtures'
import { gatherCollectionFacts } from './facts'

const titleDeps = {
  resolveWikidataIds: async (titles: string[]) => new Map(titles.map((t) => [t, `Q${t}`])),
  tmdbIdsForQids: async (qids: string[]) => new Map(qids.map((q) => [q, [Number(q.slice(1))]])),
}

describe('gatherCollectionFacts', () => {
  it('maps each rule category to its member films and skips genres no rule needs', async () => {
    const factsOf = await gatherCollectionFacts(
      [
        { slug: 'a', name: { tr: 'A', en: 'A' }, rule: { wikipediaCategories: ['Cat A'] } },
        { slug: 'b', name: { tr: 'B', en: 'B' }, rule: { wikipediaCategories: ['Cat B'] } },
      ],
      [makeFilm()],
      {
        ...titleDeps,
        categoryMembers: async (category) => (category === 'Cat A' ? ['1398', '2'] : ['1398']),
        genreQids: async () => {
          throw new Error('genres are not needed')
        },
      },
    )
    expect(factsOf(1398)).toEqual({
      wikidataGenres: new Set(),
      categories: new Set(['Cat A', 'Cat B']),
    })
    expect(factsOf(2).categories).toEqual(new Set(['Cat A']))
    expect(factsOf(3)).toEqual({ wikidataGenres: new Set(), categories: new Set() })
  })

  it('reads Wikidata genres of the published films when a rule needs them', async () => {
    const asked: number[][] = []
    const factsOf = await gatherCollectionFacts(
      [{ slug: 'g', name: { tr: 'G', en: 'G' }, rule: { wikidataGenres: ['Q1'] } }],
      [makeFilm(), makeFilm({ tmdbId: 2, slug: 'alien-1979' })],
      {
        ...titleDeps,
        categoryMembers: async () => [],
        genreQids: async (ids) => {
          asked.push(ids)
          return new Map([[2, ['Q1', 'Q5']]])
        },
      },
    )
    expect(asked).toEqual([[1398, 2]])
    expect(factsOf(2).wikidataGenres).toEqual(new Set(['Q1', 'Q5']))
    expect(factsOf(1398).wikidataGenres).toEqual(new Set())
  })
})
