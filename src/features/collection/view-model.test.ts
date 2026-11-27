import { describe, expect, it } from 'vitest'
import { makeCollection, makeFilm, makePerson } from '@/data/fixtures'
import type { Film, Genre, Person, Theme } from '@/data/schemas'
import { buildCollectionView, collectionCount, collectionMeta } from './view-model'

const BAVA = makePerson({ tmdbId: 1, name: 'Mario Bava', slug: 'mario-bava' })
const ARGENTO = makePerson({ tmdbId: 2, name: 'Dario Argento', slug: null })

const GENRES = new Map<number, Genre>([[53, { id: 53, tr: 'Gerilim', en: 'Thriller' }]])
const THEMES = new Map<number, Theme>([
  [10, { keywordId: 10, name: 'witness', tr: 'tanık', en: 'witness' }],
])

function numbered(count: number, italian: number): Film[] {
  return Array.from({ length: count }, (_, i) =>
    makeFilm({
      tmdbId: 1000 + i,
      slug: `film-${i}`,
      year: 1963 + i,
      countries: i < italian ? ['IT'] : [`X${i}`],
    }),
  )
}

const FILMS: Film[] = [
  makeFilm({
    tmdbId: 3,
    slug: 'later-1971',
    year: 1971,
    countries: ['IT'],
    title: { tr: 'Sonraki', en: 'Later' },
    originalTitle: 'Il dopo',
    poster: { tr: '/later-tr.jpg', en: '/later-en.jpg' },
    voteCount: 100,
    backdrops: ['/later-bd.jpg'],
    crew: [{ personId: 2, job: 'director' }],
    genreIds: [53],
    keywordIds: [10, 999],
  }),
  makeFilm({
    tmdbId: 4,
    slug: 'first-1963',
    year: 1963,
    countries: ['IT'],
    title: { tr: 'İlk', en: 'First' },
    originalTitle: 'İlk',
    overview: { tr: '   ', en: null },
    poster: { tr: null, en: null },
    voteCount: 900,
    backdrops: [],
    crew: [{ personId: 1, job: 'director' }],
  }),
  makeFilm({
    tmdbId: 5,
    slug: 'middle-1965',
    year: 1965,
    countries: ['FR'],
    title: { tr: 'Orta', en: 'Middle' },
    originalTitle: 'Mezzo',
    poster: { tr: '/mid-tr.jpg', en: '/mid-en.jpg' },
    voteCount: 500,
    backdrops: ['/mid-bd.jpg'],
  }),
]
const byId = new Map(FILMS.map((film) => [film.tmdbId, film]))

const GIALLO = makeCollection({
  slug: 'giallo',
  name: { tr: 'Giallo', en: 'Giallo' },
  filmIds: [3, 4, 5],
})
const OTHERS = ['a', 'b', 'c', 'd'].map((slug) =>
  makeCollection({ slug, name: { tr: slug.toUpperCase(), en: slug.toUpperCase() }, filmIds: [3] }),
)

function context(collections = [GIALLO, ...OTHERS]) {
  return {
    films: (id: number) => byId.get(id),
    people: new Map<number, Person>([BAVA, ARGENTO].map((p) => [p.tmdbId, p])),
    genres: GENRES,
    themes: THEMES,
    collections,
  }
}

describe('collectionMeta', () => {
  const collection = makeCollection()

  it('adds the country when at least half of the films share it', () => {
    expect(collectionMeta(collection, numbered(18, 12), 'tr')).toBe('1963–1980 · İtalya · 18 film')
    expect(collectionMeta(collection, numbered(18, 9), 'en')).toBe('1963–1980 · Italy · 18 films')
  })

  it('omits the country when none reaches half', () => {
    expect(collectionMeta(collection, numbered(18, 8), 'tr')).toBe('1963–1980 · 18 film')
  })

  it('names a single year once', () => {
    expect(collectionMeta(collection, [makeFilm({ year: 1979 })], 'en')).toBe(
      '1979 · Soviet Union · 1 film',
    )
  })
})

describe('collectionCount', () => {
  it('pluralises per language', () => {
    expect(collectionCount(18, 'tr')).toBe('18 film')
    expect(collectionCount(18, 'en')).toBe('18 films')
    expect(collectionCount(1, 'en')).toBe('1 film')
  })
})

describe('buildCollectionView', () => {
  const view = buildCollectionView(GIALLO, 'tr', context())

  it('numbers rows from 1 in year order', () => {
    expect(view.rows.map((r) => [r.number, r.title, r.year])).toEqual([
      [1, 'İlk', 1963],
      [2, 'Orta', 1965],
      [3, 'Sonraki', 1971],
    ])
  })

  it('keeps the original title only when it differs from the title', () => {
    expect(view.rows.map((r) => r.originalTitle)).toEqual([null, 'Mezzo', 'Il dopo'])
  })

  it('drops blank overviews', () => {
    expect(view.rows[0]?.overview).toBeNull()
    expect(view.rows[1]?.overview).toBe('Bir rehber iki adamı Bölge’nin içine götürür.')
  })

  it('links directors without prefetch and genres and themes with it', () => {
    expect(view.rows[0]?.directors).toEqual([
      { text: 'Mario Bava', href: '/person/mario-bava', prefetch: false },
    ])
    expect(view.rows[2]?.directors).toEqual([{ text: 'Dario Argento' }])
    expect(view.rows[2]?.genres).toEqual([{ text: 'Gerilim', href: '/archive?genre=53' }])
    expect(view.rows[2]?.themes).toEqual([{ text: 'tanık', href: '/archive?theme=10' }])
  })

  it('points rows at the film page with the locale poster', () => {
    expect(view.rows[1]?.href).toBe('/film/middle-1965')
    expect(view.rows[1]?.posterPath).toBe('/mid-tr.jpg')
    expect(buildCollectionView(GIALLO, 'en', context()).rows[1]?.posterPath).toBe('/mid-en.jpg')
  })

  it('writes the hero meta and takes the hero poster from the highest-vote film with a poster', () => {
    expect(view.meta).toBe('1963–1971 · İtalya · 3 film')
    expect(view.heroImage).toBe('/mid-tr.jpg')
  })

  it('takes the tile image from the highest-vote film with backdrops', () => {
    expect(view.tileImage).toBe('/mid-bd.jpg')
  })

  it('has no hero image when no member has a poster', () => {
    const bare = makeCollection({ filmIds: [4] })
    const bareView = buildCollectionView(bare, 'tr', context([bare]))
    expect(bareView.heroImage).toBeNull()
    expect(bareView.tileImage).toBeNull()
  })

  it('lists the next three collections as others', () => {
    expect(view.others.map((o) => o.name)).toEqual(['A', 'B', 'C'])
    expect(view.others[0]).toEqual({
      name: 'A',
      href: '/collection/a',
      meta: '1 film',
      imagePath: '/later-bd.jpg',
    })
  })

  it('wraps around at the end of the list', () => {
    const last = buildCollectionView(OTHERS[3]!, 'en', context())
    expect(last.others.map((o) => o.href)).toEqual([
      '/en/collection/giallo',
      '/en/collection/a',
      '/en/collection/b',
    ])
  })

  it('never lists the collection itself', () => {
    const two = [GIALLO, OTHERS[0]!]
    expect(buildCollectionView(GIALLO, 'tr', context(two)).others).toHaveLength(1)
  })
})
