import { describe, expect, it } from 'vitest'
import { HttpError } from './lib/http'
import { type ImportDeps, runImport } from './run-import'
import type { TmdbMovie } from './sources/tmdb'
import type { CultListEntry } from './sources/wikipedia'

function entry(overrides: Partial<CultListEntry> = {}): CultListEntry {
  return {
    wikiTitle: 'Stalker (1979 film)',
    title: 'Stalker',
    year: 1979,
    yearEnd: null,
    directors: ['Andrei Tarkovsky'],
    page: 'List of cult films: S',
    ...overrides,
  }
}

function movie(id: number, overrides: Partial<TmdbMovie> = {}): TmdbMovie {
  return {
    id,
    title: 'Stalker',
    original_title: 'Сталкер',
    overview: 'A guide leads two men into the Zone.',
    release_date: '1979-05-25',
    runtime: 163,
    adult: false,
    vote_count: 1500,
    poster_path: null,
    genres: [{ id: 878 }],
    production_countries: [{ iso_3166_1: 'SU' }],
    spoken_languages: [{ iso_639_1: 'ru' }],
    production_companies: [{ name: 'Mosfilm' }],
    credits: {
      cast: [
        {
          id: 8453,
          name: 'Alexander Kaidanovsky',
          character: 'Stalker',
          order: 0,
          profile_path: null,
        },
      ],
      crew: [{ id: 8452, name: 'Andrei Tarkovsky', job: 'Director', profile_path: null }],
    },
    images: { posters: [], backdrops: [] },
    videos: { results: [] },
    keywords: { keywords: [{ id: 100, name: 'zone' }] },
    translations: { translations: [] },
    ...overrides,
  } as TmdbMovie
}

function fakeDeps(overrides: Partial<ImportDeps> = {}): ImportDeps {
  const movies = new Map([
    [1398, movie(1398)],
    [2, movie(2, { title: 'Alien', original_title: 'Alien', release_date: '1979-05-25' })],
  ])
  return {
    loadCultList: async () => [entry()],
    resolveWikidataIds: async (titles) => new Map(titles.map((t) => [t, 'Q1'])),
    tmdbIdsForQids: async () => new Map([['Q1', [1398]]]),
    fetchMovie: async (id) => {
      const found = movies.get(id)
      if (!found) throw new HttpError(404, `https://api.test/movie/${id}`)
      return found
    },
    searchMovies: async () => [],
    awardCounts: async () => new Map([[1398, { oscar: 1 }]]),
    fetchGenres: async () => [{ id: 878, tr: 'Bilim Kurgu', en: 'Science Fiction' }],
    prevLock: null,
    prevPeople: null,
    fixes: [],
    today: '2026-10-30',
    now: '2026-10-30T10:00:00.000Z',
    ...overrides,
  }
}

describe('runImport', () => {
  it('builds a film, people, lock and keyword stats from one row', async () => {
    const out = await runImport(fakeDeps())
    expect(out.films.map((f) => [f.slug, f.awards])).toEqual([['stalker-1979', { oscar: 1 }]])
    expect(out.people.map((p) => p.tmdbId)).toEqual([8452, 8453])
    expect(out.lock.films.map((e) => e.tmdbId)).toEqual([1398])
    expect(out.keywords).toEqual([{ id: 100, name: 'zone', films: 1 }])
    expect(out.report.counts).toMatchObject({ listRows: 1, films: 1, added: 1, review: 0 })
  })

  it('merges two list rows that resolve to the same TMDB id into one film', async () => {
    const deps = fakeDeps({
      loadCultList: async () => [entry(), entry({ wikiTitle: 'Stalker (disambig)' })],
    })
    const out = await runImport(deps)
    expect(out.films).toHaveLength(1)
    expect(out.lock.films).toEqual([
      { tmdbId: 1398, slug: 'stalker-1979', sources: ['cult-list'], addedAt: '2026-10-30' },
    ])
    expect(out.report.counts.listRows).toBe(2)
  })

  it('dedupes duplicate Wikidata ids so one row does not need review', async () => {
    const out = await runImport(
      fakeDeps({ tmdbIdsForQids: async () => new Map([['Q1', [1398, 1398]]]) }),
    )
    expect(out.films).toHaveLength(1)
    expect(out.report.review).toEqual([])
  })

  it('puts an adult match in adultExcluded with no film and no lock entry', async () => {
    const adult = movie(1398, { adult: true })
    const out = await runImport(fakeDeps({ fetchMovie: async () => adult }))
    expect(out.films).toEqual([])
    expect(out.lock.films).toEqual([])
    expect(out.report.adultExcluded).toEqual([
      { wikiTitle: 'Stalker (1979 film)', tmdbId: 1398, title: 'Stalker' },
    ])
    expect(out.report.counts.adultExcluded).toBe(1)
  })

  it('lists an unmatched row in the report and still returns the other films', async () => {
    const deps = fakeDeps({
      loadCultList: async () => [entry(), entry({ wikiTitle: 'Nowhere (film)', title: 'Nowhere' })],
      resolveWikidataIds: async () =>
        new Map([
          ['Stalker (1979 film)', 'Q1'],
          ['Nowhere (film)', null],
        ]),
    })
    const out = await runImport(deps)
    expect(out.films).toHaveLength(1)
    expect(out.report.review).toMatchObject([{ wikiTitle: 'Nowhere (film)', reason: 'unmatched' }])
    expect(out.report.counts).toMatchObject({ review: 1, films: 1 })
  })

  it('searches by title and keeps only hits within a year, max 5', async () => {
    const asked: number[] = []
    const deps = fakeDeps({
      resolveWikidataIds: async () => new Map([['Stalker (1979 film)', null]]),
      searchMovies: async () => [
        {
          id: 1398,
          title: 'Stalker',
          original_title: 'Сталкер',
          release_date: '1979-05-25',
          adult: false,
        },
        {
          id: 77,
          title: 'Stalker',
          original_title: 'Stalker',
          release_date: '1995-01-01',
          adult: false,
        },
        { id: 78, title: 'Stalker', original_title: 'Stalker', release_date: '', adult: false },
      ],
      fetchMovie: async (id) => {
        asked.push(id)
        return movie(id)
      },
    })
    const out = await runImport(deps)
    expect(asked).toEqual([1398])
    expect(out.films.map((f) => f.tmdbId)).toEqual([1398])
  })

  it('drops a candidate whose TMDB page is 404', async () => {
    const deps = fakeDeps({
      fetchMovie: async (id) => {
        if (id === 1398) throw new HttpError(404, 'https://api.test/movie/1398')
        return movie(id)
      },
    })
    const out = await runImport(deps)
    expect(out.report.review).toMatchObject([{ reason: 'wikidata-mismatch' }])
  })

  it('records a skip fix in the report', async () => {
    const deps = fakeDeps({
      fixes: [{ wikiTitle: 'Stalker (1979 film)', tmdbId: null, note: 'TV' }],
    })
    const out = await runImport(deps)
    expect(out.report.skipped).toEqual([{ wikiTitle: 'Stalker (1979 film)', note: 'TV' }])
  })

  it('keeps a locked film that is no longer on the list', async () => {
    const deps = fakeDeps({
      loadCultList: async () => [],
      prevLock: {
        version: 1,
        films: [
          { tmdbId: 1398, slug: 'stalker-1979', sources: ['cult-list'], addedAt: '2026-01-01' },
        ],
      },
    })
    const out = await runImport(deps)
    expect(out.films.map((f) => f.slug)).toEqual(['stalker-1979'])
    expect(out.report.missingFromSources).toEqual([{ tmdbId: 1398, slug: 'stalker-1979' }])
    expect(out.report.counts.missingFromSources).toBe(1)
  })

  it('propagates a fetch failure instead of returning partial output', async () => {
    const deps = fakeDeps({
      fetchMovie: async () => {
        throw new HttpError(503, 'https://api.test/movie/1')
      },
    })
    await expect(runImport(deps)).rejects.toThrow(/503/)
  })

  const lockedStalker = {
    version: 1 as const,
    films: [{ tmdbId: 1398, slug: 'stalker-1979', sources: ['cult-list'], addedAt: '2026-01-01' }],
  }

  it('keeps slug and addedAt when TMDB now returns a changed title', async () => {
    const renamed = movie(1398, { title: 'The Stalker' })
    const out = await runImport(
      fakeDeps({ prevLock: lockedStalker, fetchMovie: async () => renamed }),
    )
    expect(out.lock.films).toEqual(lockedStalker.films)
    expect(out.films[0]).toMatchObject({ slug: 'stalker-1979', title: { en: 'The Stalker' } })
    expect(out.report.added).toEqual([])
  })

  it('excludes a row-decided adult film that is in the lock but keeps its lock entry', async () => {
    const adult = movie(1398, { adult: true })
    const out = await runImport(
      fakeDeps({ prevLock: lockedStalker, fetchMovie: async () => adult }),
    )
    expect(out.films).toEqual([])
    expect(out.people).toEqual([])
    expect(out.keywords).toEqual([])
    expect(out.lock.films).toEqual(lockedStalker.films)
    expect(out.report.adultExcluded).toHaveLength(1)
    expect(out.report.missingFromSources).toEqual([])
    expect(out.report.counts).toMatchObject({ films: 0, adultExcluded: 1, missingFromSources: 0 })
  })

  it('excludes a lock-only film that TMDB now flags adult', async () => {
    const adult = movie(1398, { adult: true })
    const deps = fakeDeps({
      loadCultList: async () => [],
      prevLock: lockedStalker,
      fetchMovie: async () => adult,
    })
    const out = await runImport(deps)
    expect(out.films).toEqual([])
    expect(out.people).toEqual([])
    expect(out.lock.films).toEqual(lockedStalker.films)
    expect(out.report.adultExcluded).toEqual([
      { wikiTitle: 'Stalker', tmdbId: 1398, title: 'Stalker' },
    ])
    expect(out.report.missingFromSources).toEqual([])
    expect(out.report.counts).toMatchObject({ adultExcluded: 1, missingFromSources: 0 })
  })

  it('throws when a match fix points at a TMDB id that 404s', async () => {
    const deps = fakeDeps({
      fixes: [{ wikiTitle: 'Stalker (1979 film)', tmdbId: 999, note: 'fix' }],
      fetchMovie: async (id) => {
        throw new HttpError(404, `https://api.test/movie/${id}`)
      },
    })
    await expect(runImport(deps)).rejects.toThrow(/999/)
  })

  it('turns a series fix into one film per id, merging rows and excluding an adult id', async () => {
    const series = entry({ wikiTitle: 'Stalker (film series)', year: 1979, yearEnd: 1980 })
    const movies = new Map([
      [1398, movie(1398)],
      [2, movie(2, { title: 'Alien', original_title: 'Alien' })],
      [3, movie(3, { title: 'Blue Zone', adult: true })],
    ])
    const deps = fakeDeps({
      loadCultList: async () => [entry(), series],
      fixes: [{ wikiTitle: 'Stalker (film series)', tmdbId: [1398, 2, 3], note: 'series' }],
      fetchMovie: async (id) => movies.get(id) as TmdbMovie,
      prevLock: lockedStalker,
    })
    const out = await runImport(deps)
    expect(out.films.map((f) => f.slug)).toEqual(['alien-1979', 'stalker-1979'])
    expect(out.lock.films).toEqual([
      { tmdbId: 2, slug: 'alien-1979', sources: ['cult-list'], addedAt: '2026-10-30' },
      ...lockedStalker.films,
    ])
    expect(out.report.added).toEqual([{ tmdbId: 2, slug: 'alien-1979' }])
    expect(out.report.adultExcluded).toEqual([
      { wikiTitle: 'Stalker (film series)', tmdbId: 3, title: 'Blue Zone' },
    ])
    expect(out.report.counts).toMatchObject({ films: 2, added: 1, adultExcluded: 1, review: 0 })
  })

  it('throws when one id of a series fix 404s', async () => {
    const deps = fakeDeps({
      fixes: [{ wikiTitle: 'Stalker (1979 film)', tmdbId: [1398, 999], note: 'series' }],
    })
    await expect(runImport(deps)).rejects.toThrow(/999/)
  })

  it('throws when a locked film 404s', async () => {
    const deps = fakeDeps({
      loadCultList: async () => [],
      prevLock: lockedStalker,
      fetchMovie: async (id) => {
        throw new HttpError(404, `https://api.test/movie/${id}`)
      },
    })
    await expect(runImport(deps)).rejects.toThrow(/1398/)
  })
})
