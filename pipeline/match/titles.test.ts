import { describe, expect, it } from 'vitest'
import { tmdbIdByTitle } from './titles'

describe('tmdbIdByTitle', () => {
  it('keeps titles with one TMDB id and drops null or multi-id QIDs', async () => {
    const deps = {
      resolveWikidataIds: async () =>
        new Map([
          ['Stalker', 'Q1'],
          ['Mirror', 'Q2'],
          ['Twice', 'Q3'],
          ['Nowhere', null],
        ]),
      tmdbIdsForQids: async () =>
        new Map([
          ['Q1', [1398]],
          ['Q2', [500, 500]],
          ['Q3', [7, 8]],
        ]),
    }
    const ids = await tmdbIdByTitle(deps, ['Stalker', 'Mirror', 'Twice', 'Nowhere'])
    expect([...ids]).toEqual([
      ['Stalker', 1398],
      ['Mirror', 500],
    ])
  })
})
