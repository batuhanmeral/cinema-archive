import { describe, expect, it } from 'vitest'
import { makeFilm, makeMovement, makePerson } from '@/data/fixtures'
import type { Film, Person } from '@/data/schemas'
import {
  buildMovementView,
  movementMeta,
  type MovementIndexKey,
  type MovementView,
  type MovementViewContext,
} from './view-model'

const GODARD = makePerson({ tmdbId: 1, name: 'Jean-Luc Godard', slug: 'jean-luc-godard' })
const TRUFFAUT = makePerson({ tmdbId: 2, name: 'François Truffaut', slug: null, profilePath: null })
const BELMONDO = makePerson({ tmdbId: 10, name: 'Jean-Paul Belmondo', slug: null })
const KARINA = makePerson({ tmdbId: 11, name: 'Anna Karina', slug: 'anna-karina' })
const LEAUD = makePerson({ tmdbId: 12, name: 'Jean-Pierre Léaud', slug: null })
const MOREAU = makePerson({ tmdbId: 13, name: 'Jeanne Moreau', slug: null })
const BRIALY = makePerson({ tmdbId: 14, name: 'Jean-Claude Brialy', slug: null })
const EXTRA = makePerson({ tmdbId: 15, name: 'Billed Ninth', slug: null })
const ONCE = makePerson({ tmdbId: 16, name: 'Only Once', slug: null })
const COUTARD = makePerson({ tmdbId: 20, name: 'Raoul Coutard', slug: null })
const DECAE = makePerson({ tmdbId: 21, name: 'Henri Decaë', slug: null })

const PEOPLE = [
  GODARD,
  TRUFFAUT,
  BELMONDO,
  KARINA,
  LEAUD,
  MOREAU,
  BRIALY,
  EXTRA,
  ONCE,
  COUTARD,
  DECAE,
]

const cast = (...ids: [number, number][]) =>
  ids.map(([personId, order]) => ({ personId, character: 'Role', order }))

// Beş oyuncu iki ya da daha çok filmde; dokuzuncu sıradaki ve tek filmlik oyuncu dışarıda kalır.
const FILMS: Film[] = [
  makeFilm({
    tmdbId: 101,
    slug: 'breathless-1960',
    year: 1960,
    title: { tr: 'Serseri Aşıklar', en: 'Breathless' },
    backdrops: ['/breathless-a.jpg', '/breathless-b.jpg'],
    voteCount: 900,
    crew: [
      { personId: 1, job: 'director' },
      { personId: 20, job: 'cinematographer' },
    ],
    cast: cast([10, 0], [11, 1], [12, 2], [13, 3], [14, 4], [15, 8], [16, 0]),
  }),
  makeFilm({
    tmdbId: 100,
    slug: 'the-400-blows-1959',
    year: 1959,
    title: { tr: '400 Darbe', en: 'The 400 Blows' },
    overview: { tr: null, en: 'A boy runs away.' },
    backdrops: ['/blows.jpg'],
    voteCount: 1200,
    crew: [
      { personId: 2, job: 'director' },
      { personId: 21, job: 'cinematographer' },
    ],
    cast: cast([10, 0], [11, 1], [12, 2], [13, 3], [14, 7], [15, 9]),
  }),
  makeFilm({
    tmdbId: 102,
    slug: 'a-woman-is-a-woman-1961',
    year: 1961,
    title: { tr: 'Kadın Kadındır', en: 'A Woman Is a Woman' },
    backdrops: [],
    voteCount: 5000,
    crew: [
      { personId: 1, job: 'director' },
      { personId: 20, job: 'cinematographer' },
    ],
    cast: cast([10, 0], [11, 1], [15, 10]),
  }),
]

const filmsById = new Map(FILMS.map((film) => [film.tmdbId, film]))

const FNW = makeMovement({
  slug: 'french-new-wave',
  years: { start: 1958, end: 1966 },
  countries: ['FR'],
  pioneerIds: [1, 2],
  filmIds: [101, 100, 102],
})
const NEOREALISM = makeMovement({
  slug: 'italian-neorealism',
  name: { tr: 'İtalyan Yeni Gerçekçiliği', en: 'Italian Neorealism' },
  years: { start: 1943, end: 1952 },
  countries: ['IT'],
  filmIds: [100],
})
const ROMANIAN = makeMovement({
  slug: 'romanian-new-wave',
  name: { tr: 'Romanya Yeni Dalgası', en: 'Romanian New Wave' },
  years: { start: 2001, end: null },
  countries: ['RO'],
  filmIds: [102],
})

function makeContext(overrides: Partial<MovementViewContext> = {}): MovementViewContext {
  return {
    films: (id) => filmsById.get(id),
    people: new Map<number, Person>(PEOPLE.map((p) => [p.tmdbId, p])),
    movements: [NEOREALISM, FNW, ROMANIAN],
    ...overrides,
  }
}

function row(view: MovementView, key: MovementIndexKey) {
  return view.index.find((r) => r.key === key)
}

describe('movementMeta', () => {
  it('writes years, country and counts', () => {
    const counts = { films: 22, directors: 9 }
    expect(movementMeta(FNW, 'tr', counts)).toBe('1958–1966 · Fransa · 22 film · 9 yönetmen')
    expect(movementMeta(FNW, 'en', counts)).toBe('1958–1966 · France · 22 films · 9 directors')
  })

  it('uses singular English counts', () => {
    expect(movementMeta(FNW, 'en', { films: 1, directors: 1 })).toBe(
      '1958–1966 · France · 1 film · 1 director',
    )
  })

  it('puts the country first on strips without counts', () => {
    expect(movementMeta(FNW, 'tr')).toBe('Fransa · 1958–1966')
  })

  it('leaves an ongoing movement open-ended', () => {
    expect(movementMeta(ROMANIAN, 'tr', { films: 1, directors: 1 })).toMatch(/^2001– · /)
    expect(movementMeta(ROMANIAN, 'en')).toBe('Romania · 2001–')
  })

  it('names the first country of a multi-country movement', () => {
    const dogme = makeMovement({ countries: ['DK', 'FR'] })
    expect(movementMeta(dogme, 'en')).toBe('Denmark · 1958–1968')
  })
})

describe('buildMovementView', () => {
  const view = buildMovementView(FNW, 'tr', makeContext())

  it('writes the hero meta from the resolved films and directors', () => {
    expect(view.name).toBe('Fransız Yeni Dalgası')
    expect(view.meta).toBe('1958–1966 · Fransa · 3 film · 2 yönetmen')
  })

  it('lists index rows in order with Turkish labels', () => {
    expect(view.index.map((r) => r.label)).toEqual([
      'Yıllar',
      'Ülke',
      'Öncüler',
      'Yüzleri',
      'Görüntü',
    ])
    expect(row(view, 'years')?.items).toEqual([{ text: '1958–1966' }])
    expect(row(view, 'country')?.items).toEqual([{ text: 'Fransa', href: '/archive?country=FR' }])
  })

  it('uses English labels on the English page', () => {
    expect(buildMovementView(FNW, 'en', makeContext()).index.map((r) => r.label)).toEqual([
      'Years',
      'Country',
      'Pioneers',
      'Faces',
      'Cinematography',
    ])
  })

  it('links pioneers only when they have a page', () => {
    expect(row(view, 'pioneers')?.items).toEqual([
      { text: 'Jean-Luc Godard', href: '/person/jean-luc-godard', prefetch: false },
      { text: 'François Truffaut' },
    ])
  })

  it('shows up to 4 actors billed in the top 8 of at least 2 films, most films first', () => {
    expect(row(view, 'faces')?.items.map((i) => i.text)).toEqual([
      'Anna Karina',
      'Jean-Paul Belmondo',
      'Jean-Claude Brialy',
      'Jean-Pierre Léaud',
    ])
    expect(row(view, 'faces')?.items[0]).toEqual({
      text: 'Anna Karina',
      href: '/person/anna-karina',
      prefetch: false,
    })
  })

  it('names the cinematographer of the most films', () => {
    expect(row(view, 'cinematography')?.items).toEqual([{ text: 'Raoul Coutard' }])
  })

  it('hides faces and cinematography when nobody reaches 2 films', () => {
    const single = makeMovement({ filmIds: [101] })
    const keys = buildMovementView(single, 'tr', makeContext()).index.map((r) => r.key)
    expect(keys).toEqual(['years', 'country'])
  })

  it('takes the hero from the highest-vote film with backdrops and the strip from the next', () => {
    expect(view.heroImage).toBe('/blows.jpg')
    expect(view.stripImage).toBe('/breathless-a.jpg')
  })

  it('falls back to the hero image for the strip when only one film has backdrops', () => {
    const one = makeMovement({ filmIds: [100, 102] })
    const oneView = buildMovementView(one, 'tr', makeContext())
    expect(oneView.stripImage).toBe('/blows.jpg')
  })

  it('has no images when no member film has a backdrop', () => {
    const bare = makeMovement({ filmIds: [102] })
    const bareView = buildMovementView(bare, 'tr', makeContext())
    expect(bareView.heroImage).toBeNull()
    expect(bareView.stripImage).toBeNull()
  })

  it('lists directors by film count with a count note', () => {
    expect(view.directors).toEqual([
      {
        name: 'Jean-Luc Godard',
        href: '/person/jean-luc-godard',
        profilePath: '/tarkovsky.jpg',
        note: '2 film',
      },
      { name: 'François Truffaut', profilePath: null, note: '1 film' },
    ])
  })

  it('sorts film cards by year with director and year as caption', () => {
    expect(view.films.map((f) => f.title)).toEqual([
      '400 Darbe',
      'Serseri Aşıklar',
      'Kadın Kadındır',
    ])
    expect(view.films[0]).toEqual({
      href: '/film/the-400-blows-1959',
      posterPath: '/stalker-tr.jpg',
      title: '400 Darbe',
      caption: 'François Truffaut, 1959',
      overview: null,
    })
    expect(view.films[1]?.overview).toBe('Bir rehber iki adamı Bölge’nin içine götürür.')
  })

  it('skips member ids without a film file', () => {
    const missing = makeMovement({ filmIds: [100, 999] })
    expect(buildMovementView(missing, 'tr', makeContext()).films).toHaveLength(1)
  })

  it('links the neighbouring movements as halls', () => {
    expect(view.previous).toEqual({
      name: 'İtalyan Yeni Gerçekçiliği',
      rotationSlot: 4,
      href: '/movement/italian-neorealism',
      meta: 'İtalya · 1943–1952',
      imagePath: '/blows.jpg',
    })
    expect(view.next.href).toBe('/movement/romanian-new-wave')
    expect(view.next.imagePath).toBeNull()
  })

  it('wraps around at both ends', () => {
    const first = buildMovementView(NEOREALISM, 'en', makeContext())
    expect(first.previous.href).toBe('/en/movement/romanian-new-wave')
    const last = buildMovementView(ROMANIAN, 'en', makeContext())
    expect(last.next.href).toBe('/en/movement/italian-neorealism')
  })
})
