import { describe, expect, it } from 'vitest'
import { HttpError } from './lib/http'
import { type ImportDeps, runImport } from './run-import'
import type { CollectionContent, MovementContent, MovementList } from './schemas'
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
    categoryMembers: async () => [],
    articleFilmLinks: async () => [],
    genreQids: async () => new Map(),
    movements: [],
    movementLists: [],
    collections: [],
    yesilcam: [],
    prevLock: null,
    prevPeople: null,
    prevMovements: null,
    prevCollections: null,
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
    // Slug rezervde kalır; yayınlanmayan filmin canlı kaynağı yoktur.
    expect(out.lock.films).toEqual([{ ...lockedStalker.films[0], sources: [] }])
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
    // Slug rezervde kalır; yayınlanmayan filmin canlı kaynağı yoktur.
    expect(out.lock.films).toEqual([{ ...lockedStalker.films[0], sources: [] }])
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

// Her başlık Q<tmdbId> öğesine çözülür; bilinmeyen başlığın Wikidata öğesi yoktur.
function wiki(titles: Record<string, number>): Partial<ImportDeps> {
  return {
    resolveWikidataIds: async (asked) =>
      new Map(asked.map((t) => [t, titles[t] === undefined ? null : `Q${titles[t]}`])),
    tmdbIdsForQids: async (qids) => new Map(qids.map((q) => [q, [Number(q.slice(1))]])),
  }
}

function moviesById(...list: TmdbMovie[]): Pick<ImportDeps, 'fetchMovie'> {
  const byId = new Map(list.map((m) => [m.id, m]))
  return {
    fetchMovie: async (id) => {
      const found = byId.get(id)
      if (!found) throw new HttpError(404, `https://api.test/movie/${id}`)
      return found
    },
  }
}

function searchHit(hits: Record<string, { id: number; year: number | string }>, query: string) {
  const hit = hits[query]
  if (!hit) return []
  return [
    {
      id: hit.id,
      title: query,
      original_title: query,
      release_date: `${hit.year}-01-01`,
      adult: false,
    },
  ]
}

function movement(overrides: Partial<MovementContent> = {}): MovementContent {
  return {
    slug: 'soviet-cinema',
    name: { tr: 'Sovyet Sineması', en: 'Soviet Cinema' },
    years: { start: 1975, end: 1985 },
    countries: ['SU'],
    wikipedia: { article: 'Soviet cinema', categories: ['Soviet films'] },
    pioneerIds: [8452],
    ...overrides,
  }
}

function collection(slug: string, rule: CollectionContent['rule']): CollectionContent {
  return { slug, name: { tr: slug, en: slug }, rule }
}

const stalker = movie(1398)
const mirror = movie(500, {
  title: 'Mirror',
  original_title: 'Зеркало',
  release_date: '1975-03-07',
})
const soviet = { 'Stalker (1979 film)': 1398, 'Mirror (1975 film)': 500 }
const sovietCategory = async (category: string) =>
  category === 'Soviet films' ? ['Stalker (1979 film)', 'Mirror (1975 film)'] : []

describe('runImport movements, yesilcam and collections', () => {
  it('selects cult and non-cult category films and merges their lock sources', async () => {
    const out = await runImport(
      fakeDeps({
        ...wiki(soviet),
        ...moviesById(stalker, mirror),
        movements: [movement()],
        categoryMembers: sovietCategory,
      }),
    )
    expect(out.movements).toEqual([
      {
        slug: 'soviet-cinema',
        name: { tr: 'Sovyet Sineması', en: 'Soviet Cinema' },
        years: { start: 1975, end: 1985 },
        countries: ['SU'],
        pioneerIds: [8452],
        filmIds: [500, 1398],
      },
    ])
    expect(out.lock.films.map((e) => [e.tmdbId, e.sources])).toEqual([
      [500, ['movement:soviet-cinema']],
      [1398, ['cult-list', 'movement:soviet-cinema']],
    ])
    expect(out.films.find((f) => f.tmdbId === 500)).toMatchObject({
      slug: 'mirror-1975',
      sources: ['movement:soviet-cinema'],
    })
    expect(out.report.groups.movements).toEqual([
      { slug: 'soviet-cinema', films: 2, candidates: 2, added: [500, 1398], removed: [] },
    ])
  })

  it('drops a wiki candidate outside the years but keeps a hand-list row of that year', async () => {
    const loulou = movie(600, {
      title: 'Loulou',
      release_date: '1980-09-10',
      production_countries: [{ iso_3166_1: 'FR' }],
    })
    const handFilm = movie(601, {
      title: 'Hand Film',
      release_date: '1965-01-01',
      production_countries: [{ iso_3166_1: 'FR' }],
    })
    const newWave = movement({
      slug: 'french-new-wave',
      years: { start: 1958, end: 1966 },
      countries: ['FR'],
      wikipedia: { article: 'French New Wave', categories: [] },
      pioneerIds: [],
    })
    const lists: MovementList[] = [
      {
        movement: 'french-new-wave',
        source: 'bfi',
        url: 'https://www.bfi.org.uk/list',
        films: [{ title: 'Hand Film', year: 1965, directors: ['Andrei Tarkovsky'] }],
      },
    ]
    const out = await runImport(
      fakeDeps({
        ...wiki({ ...soviet, 'Loulou (1980 film)': 600 }),
        ...moviesById(stalker, loulou, handFilm),
        movements: [newWave],
        movementLists: lists,
        articleFilmLinks: async () => ['Loulou (1980 film)'],
        searchMovies: async () => [
          {
            id: 601,
            title: 'Hand Film',
            original_title: 'Hand Film',
            release_date: '1965-01-01',
            adult: false,
          },
        ],
      }),
    )
    expect(out.movements.map((m) => m.filmIds)).toEqual([[601]])
    expect(out.lock.films.map((e) => e.tmdbId)).toEqual([601, 1398])
    expect(out.report.groups.movements[0]).toMatchObject({ films: 1, candidates: 1 })
  })

  it('drops a hand-list row outside the years but keeps one from another country', async () => {
    const lateFilm = movie(610, {
      title: 'Late Film',
      release_date: '1974-01-01',
      production_countries: [{ iso_3166_1: 'FR' }],
    })
    const foreignFilm = movie(611, {
      title: 'Foreign Film',
      release_date: '1962-01-01',
      production_countries: [{ iso_3166_1: 'SU' }],
    })
    const newWave = movement({
      slug: 'french-new-wave',
      years: { start: 1958, end: 1966 },
      countries: ['FR'],
      wikipedia: { article: 'French New Wave', categories: [] },
      pioneerIds: [],
    })
    const hits: Record<string, { id: number; year: string }> = {
      'Late Film': { id: 610, year: '1974' },
      'Foreign Film': { id: 611, year: '1962' },
    }
    const lists: MovementList[] = [
      {
        movement: 'french-new-wave',
        source: 'bfi',
        url: 'https://www.bfi.org.uk/list',
        films: Object.entries(hits).map(([title, { year }]) => ({
          title,
          year: Number(year),
          directors: ['Andrei Tarkovsky'],
        })),
      },
    ]
    const out = await runImport(
      fakeDeps({
        ...wiki(soviet),
        ...moviesById(stalker, lateFilm, foreignFilm),
        movements: [newWave],
        movementLists: lists,
        searchMovies: async (query) => searchHit(hits, query),
      }),
    )
    expect(out.movements.map((m) => m.filmIds)).toEqual([[611]])
  })

  it('keeps an excluded wiki candidate and an excluded hand row out of the movement and lock', async () => {
    const mk = (id: number, title: string, year: number) =>
      movie(id, {
        title,
        release_date: `${year}-01-01`,
        production_countries: [{ iso_3166_1: 'FR' }],
      })
    const hits: Record<string, { id: number; year: number }> = {
      'Excluded Hand': { id: 621, year: 1961 },
      'Kept Hand': { id: 622, year: 1962 },
    }
    const newWave = movement({
      slug: 'french-new-wave',
      years: { start: 1958, end: 1966 },
      countries: ['FR'],
      wikipedia: { article: 'French New Wave', categories: [] },
      pioneerIds: [],
      excludeTmdbIds: [620, 621],
    })
    const lists: MovementList[] = [
      {
        movement: 'french-new-wave',
        source: 'bfi',
        url: 'https://www.bfi.org.uk/list',
        films: Object.entries(hits).map(([title, { year }]) => ({
          title,
          year,
          directors: ['Andrei Tarkovsky'],
        })),
      },
    ]
    const out = await runImport(
      fakeDeps({
        ...wiki({ ...soviet, 'Wiki Film (film)': 620 }),
        ...moviesById(
          stalker,
          mk(620, 'Wiki Film', 1960),
          mk(621, 'Excluded Hand', 1961),
          mk(622, 'Kept Hand', 1962),
        ),
        movements: [newWave],
        movementLists: lists,
        articleFilmLinks: async () => ['Wiki Film (film)'],
        searchMovies: async (query) => searchHit(hits, query),
      }),
    )
    expect(out.movements.map((m) => m.filmIds)).toEqual([[622]])
    expect(out.lock.films.map((e) => e.tmdbId)).toEqual([622, 1398])
  })

  it('keeps an adult category film out of movements, collections, films and the lock', async () => {
    const adult = movie(700, { title: 'Blue Zone', release_date: '1978-01-01', adult: true })
    const out = await runImport(
      fakeDeps({
        ...wiki({ ...soviet, 'Blue Zone (1978 film)': 700 }),
        ...moviesById(stalker, mirror, adult),
        movements: [movement()],
        collections: [collection('soviet-films', { countries: ['SU'] })],
        categoryMembers: async () => ['Stalker (1979 film)', 'Blue Zone (1978 film)'],
      }),
    )
    expect(out.movements[0]?.filmIds).toEqual([1398])
    expect(out.collections.map((c) => c.filmIds)).toEqual([[1398]])
    expect(out.films.map((f) => f.tmdbId)).toEqual([1398])
    expect(out.lock.films.map((e) => e.tmdbId)).toEqual([1398])
    expect(out.report.adultExcluded).toEqual([
      { wikiTitle: 'Blue Zone (1978 film)', tmdbId: 700, title: 'Blue Zone' },
    ])
    expect(out.report.counts.adultExcluded).toBe(1)
  })

  it('lists a locked film that turned adult once when it is also a wiki candidate', async () => {
    const adult = movie(700, { title: 'Blue Zone', release_date: '1978-01-01', adult: true })
    const out = await runImport(
      fakeDeps({
        ...wiki({ ...soviet, 'Blue Zone (1978 film)': 700 }),
        ...moviesById(stalker, adult),
        movements: [movement()],
        categoryMembers: async () => ['Stalker (1979 film)', 'Blue Zone (1978 film)'],
        prevLock: {
          version: 1,
          films: [
            { tmdbId: 700, slug: 'blue-zone-1978', sources: ['cult-list'], addedAt: '2026-11-01' },
          ],
        },
      }),
    )
    expect(out.report.adultExcluded.map((e) => e.tmdbId)).toEqual([700])
    expect(out.films.map((f) => f.tmdbId)).toEqual([1398])
  })

  it('imports a Yeşilçam row by search into the films and a sources collection', async () => {
    const susuzYaz = movie(800, {
      title: 'Dry Summer',
      original_title: 'Susuz Yaz',
      release_date: '1963-01-01',
      production_countries: [{ iso_3166_1: 'TR' }],
      credits: {
        cast: [],
        crew: [{ id: 900, name: 'Metin Erksan', job: 'Director', profile_path: null }],
      },
    })
    const out = await runImport(
      fakeDeps({
        ...moviesById(stalker, susuzYaz),
        yesilcam: [
          { title: 'Susuz Yaz', year: 1963, directors: ['Metin Erksan'], basis: 'altin-portakal' },
        ],
        collections: [collection('yesilcam-classics', { sources: ['yesilcam'] })],
        searchMovies: async (query) =>
          query === 'Susuz Yaz'
            ? [
                {
                  id: 800,
                  title: 'Dry Summer',
                  original_title: 'Susuz Yaz',
                  release_date: '1963-01-01',
                  adult: false,
                },
              ]
            : [],
      }),
    )
    expect(out.films.find((f) => f.tmdbId === 800)?.sources).toEqual(['yesilcam'])
    expect(out.collections).toEqual([
      {
        slug: 'yesilcam-classics',
        name: { tr: 'yesilcam-classics', en: 'yesilcam-classics' },
        filmIds: [800],
      },
    ])
    expect(out.report.groups.collections).toEqual([
      { slug: 'yesilcam-classics', films: 1, candidates: 1, added: [800], removed: [] },
    ])
    expect(out.report.counts.listRows).toBe(2)
  })

  it('caps an over-limit collection at 100 and reports the matched count as candidates', async () => {
    const ids = Array.from({ length: 103 }, (_, i) => 1000 + i)
    const films = ids.map((id) =>
      movie(id, {
        title: `Film ${id}`,
        original_title: `Film ${id}`,
        vote_count: id - 900,
        release_date: '1979-01-01',
      }),
    )
    const out = await runImport(
      fakeDeps({
        ...wiki(Object.fromEntries(ids.map((id) => [`Film ${id} (1979 film)`, id]))),
        ...moviesById(...films),
        loadCultList: async () =>
          ids.map((id) =>
            entry({ wikiTitle: `Film ${id} (1979 film)`, title: `Film ${id}`, year: 1979 }),
          ),
        collections: [collection('soviet-films', { countries: ['SU'] })],
      }),
    )
    expect(out.collections[0]?.filmIds).toHaveLength(100)
    expect(out.report.groups.collections[0]).toMatchObject({ films: 100, candidates: 103 })
  })

  it('reports a film that left a movement as removed, keeps it, and is stable on re-run', async () => {
    const deps = fakeDeps({
      ...wiki(soviet),
      ...moviesById(stalker, mirror),
      movements: [movement()],
      categoryMembers: async () => ['Stalker (1979 film)'],
      prevLock: {
        version: 1,
        films: [
          {
            tmdbId: 500,
            slug: 'mirror-1975',
            sources: ['movement:soviet-cinema'],
            addedAt: '2026-11-01',
          },
          { tmdbId: 1398, slug: 'stalker-1979', sources: ['cult-list'], addedAt: '2026-11-01' },
        ],
      },
      prevMovements: [
        {
          slug: 'soviet-cinema',
          name: { tr: 'Sovyet Sineması', en: 'Soviet Cinema' },
          years: { start: 1975, end: 1985 },
          countries: ['SU'],
          pioneerIds: [8452],
          filmIds: [500, 1398],
        },
      ],
    })
    const out = await runImport(deps)
    expect(out.lock.films.map((e) => e.tmdbId)).toEqual([500, 1398])
    expect(out.films.map((f) => f.slug)).toEqual(['mirror-1975', 'stalker-1979'])
    expect(out.movements[0]?.filmIds).toEqual([1398])
    expect(out.report.groups.movements).toEqual([
      { slug: 'soviet-cinema', films: 1, candidates: 1, added: [], removed: [500] },
    ])

    const again = await runImport(deps)
    expect(again.movements).toEqual(out.movements)
    const next = await runImport({ ...deps, prevLock: out.lock, prevMovements: out.movements })
    expect(next.movements).toEqual(out.movements)
    expect(next.report.groups.movements[0]).toMatchObject({ added: [], removed: [] })
  })

  it('drops the sources a film lost: a left movement and a removed Yeşilçam row', async () => {
    const susuzYaz = movie(800, {
      title: 'Dry Summer',
      original_title: 'Susuz Yaz',
      release_date: '1963-01-01',
      production_countries: [{ iso_3166_1: 'TR' }],
    })
    const deps = fakeDeps({
      ...wiki(soviet),
      ...moviesById(stalker, mirror, susuzYaz),
      movements: [movement()],
      categoryMembers: async () => ['Stalker (1979 film)'],
      collections: [collection('yesilcam-classics', { sources: ['yesilcam'] })],
      prevLock: {
        version: 1,
        films: [
          {
            tmdbId: 500,
            slug: 'mirror-1975',
            sources: ['movement:soviet-cinema'],
            addedAt: '2026-11-01',
          },
          { tmdbId: 800, slug: 'dry-summer-1963', sources: ['yesilcam'], addedAt: '2026-11-01' },
          {
            tmdbId: 1398,
            slug: 'stalker-1979',
            sources: ['cult-list', 'movement:soviet-cinema'],
            addedAt: '2026-11-01',
          },
        ],
      },
      prevCollections: [
        {
          slug: 'yesilcam-classics',
          name: { tr: 'yesilcam-classics', en: 'yesilcam-classics' },
          filmIds: [800],
        },
      ],
    })
    const out = await runImport(deps)
    expect(out.lock.films).toEqual([
      { tmdbId: 500, slug: 'mirror-1975', sources: [], addedAt: '2026-11-01' },
      { tmdbId: 800, slug: 'dry-summer-1963', sources: [], addedAt: '2026-11-01' },
      {
        tmdbId: 1398,
        slug: 'stalker-1979',
        sources: ['cult-list', 'movement:soviet-cinema'],
        addedAt: '2026-11-01',
      },
    ])
    expect(out.films.map((f) => [f.slug, f.sources])).toEqual([
      ['dry-summer-1963', []],
      ['mirror-1975', []],
      ['stalker-1979', ['cult-list', 'movement:soviet-cinema']],
    ])
    expect(out.collections).toEqual([])
    expect(out.report.groups.collections).toEqual([
      { slug: 'yesilcam-classics', films: 0, candidates: 0, added: [], removed: [800] },
    ])
    expect(out.report.missingFromSources).toEqual([
      { tmdbId: 500, slug: 'mirror-1975' },
      { tmdbId: 800, slug: 'dry-summer-1963' },
    ])

    const next = await runImport({
      ...deps,
      prevLock: out.lock,
      prevMovements: out.movements,
      prevCollections: out.collections,
    })
    expect(next.lock).toEqual(out.lock)
    expect(next.films).toEqual(out.films)
  })

  it('throws when a pioneer directs none of the movement films', async () => {
    const deps = fakeDeps({
      ...wiki(soviet),
      ...moviesById(stalker, mirror),
      movements: [movement({ pioneerIds: [8452, 9999] })],
      categoryMembers: sovietCategory,
    })
    await expect(runImport(deps)).rejects.toThrow(
      'Movement "soviet-cinema" pioneer 9999 directs none of its films',
    )
  })

  it('throws when a movement ends up with no published films', async () => {
    const deps = fakeDeps({ ...wiki(soviet), movements: [movement({ pioneerIds: [] })] })
    await expect(runImport(deps)).rejects.toThrow(/soviet-cinema/)
  })

  it('throws when a movement list names an unknown movement', async () => {
    const deps = fakeDeps({
      movementLists: [
        {
          movement: 'no-such-movement',
          source: 'mubi',
          url: 'https://mubi.com/list',
          films: [{ title: 'Nowhere', year: 1977, directors: [] }],
        },
      ],
    })
    await expect(runImport(deps)).rejects.toThrow(/no-such-movement/)
  })

  it('puts an unmatched hand-list row in review under its synthetic wikiTitle', async () => {
    const out = await runImport(
      fakeDeps({
        ...wiki(soviet),
        ...moviesById(stalker, mirror),
        movements: [movement()],
        categoryMembers: sovietCategory,
        movementLists: [
          {
            movement: 'soviet-cinema',
            source: 'mubi',
            url: 'https://mubi.com/list',
            films: [{ title: 'Nowhere', year: 1977, directors: [] }],
          },
        ],
      }),
    )
    expect(out.report.review).toMatchObject([
      { wikiTitle: 'mubi:soviet-cinema:Nowhere (1977)', reason: 'unmatched' },
    ])
    expect(out.report.counts.review).toBe(1)
  })

  it('writes movements chronologically and collections in content order', async () => {
    const later = movement({ slug: 'later-cinema', years: { start: 1977, end: null } })
    const out = await runImport(
      fakeDeps({
        ...wiki(soviet),
        ...moviesById(stalker, mirror),
        movements: [later, movement()],
        categoryMembers: sovietCategory,
        collections: [
          collection('zone', { wikipediaCategories: ['Soviet films'] }),
          collection('empty', { countries: ['JP'] }),
          collection('genre', { wikidataGenres: ['Q471839'] }),
        ],
        genreQids: async (ids) => new Map(ids.map((id) => [id, id === 500 ? ['Q471839'] : []])),
      }),
    )
    expect(out.movements.map((m) => [m.slug, m.filmIds])).toEqual([
      ['soviet-cinema', [500, 1398]],
      ['later-cinema', [1398]],
    ])
    expect(out.collections.map((c) => [c.slug, c.filmIds])).toEqual([
      ['zone', [500, 1398]],
      ['genre', [500]],
    ])
    expect(out.report.groups.collections.map((g) => [g.slug, g.films])).toEqual([
      ['zone', 2],
      ['empty', 0],
      ['genre', 1],
    ])
  })
})
