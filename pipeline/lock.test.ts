import { describe, expect, it } from 'vitest'
import type { LockFile } from './schemas'
import { updateLock } from './lock'

const prev: LockFile = {
  version: 1,
  films: [{ tmdbId: 1398, slug: 'stalker-1979', sources: ['cult-list'], addedAt: '2026-10-30' }],
}

describe('updateLock', () => {
  it('keeps an existing slug when the title changed', () => {
    const { lock } = updateLock(
      prev,
      [{ tmdbId: 1398, title: 'The Stalker', year: 1979, sources: ['cult-list'] }],
      '2026-11-30',
    )
    expect(lock.films[0]).toEqual(prev.films[0])
  })

  it('keeps a film that left the list and reports it', () => {
    const { lock, missingFromSources } = updateLock(prev, [], '2026-11-30')
    expect(lock.films).toHaveLength(1)
    expect(missingFromSources.map((e) => e.tmdbId)).toEqual([1398])
  })

  it('gives colliding new films distinct slugs in tmdbId order', () => {
    const { lock } = updateLock(
      null,
      [
        { tmdbId: 20, title: 'Psycho', year: 1960, sources: ['cult-list'] },
        { tmdbId: 10, title: 'Psycho', year: 1960, sources: ['cult-list'] },
      ],
      '2026-10-30',
    )
    expect(lock.films.map((f) => f.slug)).toEqual(['psycho-1960', 'psycho-1960-20'])
  })

  it('replaces sources with the current run and reports only new films as added', () => {
    const { lock, added } = updateLock(
      {
        version: 1,
        films: [
          {
            tmdbId: 1398,
            slug: 'stalker-1979',
            sources: ['cult-list', 'movement:old'],
            addedAt: '2026-10-30',
          },
        ],
      },
      [
        { tmdbId: 1398, title: 'Stalker', year: 1979, sources: ['movement:new'] },
        { tmdbId: 5, title: 'Alien', year: 1979, sources: ['cult-list'] },
      ],
      '2026-11-30',
    )
    expect(lock.films.map((f) => f.tmdbId)).toEqual([5, 1398])
    expect(lock.films[1]).toEqual({
      tmdbId: 1398,
      slug: 'stalker-1979',
      sources: ['movement:new'],
      addedAt: '2026-10-30',
    })
    expect(added).toEqual([
      { tmdbId: 5, slug: 'alien-1979', sources: ['cult-list'], addedAt: '2026-11-30' },
    ])
  })

  it('gives a locked film the run did not match empty sources, keeping slug and addedAt', () => {
    const { lock, missingFromSources } = updateLock(prev, [], '2026-11-30')
    const kept = { tmdbId: 1398, slug: 'stalker-1979', sources: [], addedAt: '2026-10-30' }
    expect(lock.films).toEqual([kept])
    expect(missingFromSources).toEqual([kept])
  })
})
