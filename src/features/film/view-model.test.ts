import { describe, expect, it } from 'vitest'
import { makeCollection, makeFilm, makeMovement, makePerson } from '@/data/fixtures'
import type { Film } from '@/data/schemas'
import {
  CREW_ROW_LIMIT,
  buildFilmView,
  buildSimilarCards,
  type FilmView,
  type FilmViewContext,
  type IndexKey,
} from './view-model'

function makeContext(): FilmViewContext {
  const people = [
    makePerson(),
    makePerson({ tmdbId: 8453, name: 'Alexander Kaidanovsky', slug: null, profilePath: null }),
    makePerson({ tmdbId: 1, name: 'Arkady Strugatsky', slug: null }),
    makePerson({ tmdbId: 2, name: 'Boris Strugatsky', slug: null }),
    makePerson({ tmdbId: 3, name: 'Writer Three', slug: null }),
    makePerson({ tmdbId: 4, name: 'Aleksandra Demidova', slug: null }),
    makePerson({ tmdbId: 5, name: 'Aleksandr Knyazhinsky', slug: null }),
    makePerson({ tmdbId: 6, name: 'Eduard Artemyev', slug: 'eduard-artemyev' }),
  ]
  return {
    people: new Map(people.map((p) => [p.tmdbId, p])),
    genres: new Map([
      [878, { id: 878, tr: 'Bilim-Kurgu', en: 'Science Fiction' }],
      [18, { id: 18, tr: 'Dram', en: 'Drama' }],
    ]),
    themes: new Map([
      [4565, { keywordId: 4565, name: 'dystopia', tr: 'Distopya', en: 'Dystopia' }],
    ]),
    movements: [],
    collections: [],
    awardGroups: [
      { key: 'oscar', tr: 'Oscar', en: 'Oscar', qids: ['Q19020'] },
      { key: 'cannes', tr: 'Cannes', en: 'Cannes', qids: ['Q42369'] },
      { key: 'cesar', tr: 'César', en: 'César', qids: ['Q174389'] },
    ],
  }
}

const fullFilm: Partial<Film> = {
  genreIds: [878, 18],
  keywordIds: [4565],
  awards: { cannes: 1 },
  crew: [
    { personId: 8452, job: 'director' },
    { personId: 1, job: 'writer' },
    { personId: 2, job: 'writer' },
    { personId: 8452, job: 'writer' },
    { personId: 3, job: 'writer' },
    { personId: 4, job: 'producer' },
    { personId: 5, job: 'cinematographer' },
    { personId: 6, job: 'composer' },
  ],
}

const ctx = makeContext()

function row(view: FilmView, key: IndexKey) {
  const found = view.index.find((r) => r.key === key)
  if (!found) throw new Error(`No index row ${key}`)
  return found
}

describe('buildFilmView', () => {
  it('lists index rows in spec order with Turkish labels', () => {
    const view = buildFilmView(makeFilm(fullFilm), 'tr', ctx)
    expect(view.index.map((r) => r.label)).toEqual([
      'Tür',
      'Temalar',
      'Ülke',
      'Dil',
      'Yıl',
      'Süre',
      'Ödüller',
      'Stüdyo',
      'Yönetmen',
      'Senaryo',
      'Yapımcı',
      'Görüntü',
      'Müzik',
    ])
  })

  it('uses English labels on the English page', () => {
    expect(buildFilmView(makeFilm(fullFilm), 'en', ctx).index.map((r) => r.label)).toEqual([
      'Genre',
      'Themes',
      'Country',
      'Language',
      'Year',
      'Runtime',
      'Awards',
      'Studio',
      'Directed by',
      'Screenplay',
      'Producers',
      'Cinematography',
      'Music',
    ])
  })

  it('omits rows without data', () => {
    const keys = buildFilmView(
      makeFilm({ awards: {}, studios: [], runtime: null }),
      'tr',
      ctx,
    ).index.map((r) => r.key)
    expect(keys).not.toContain('awards')
    expect(keys).not.toContain('studio')
    expect(keys).not.toContain('runtime')
  })

  it('omits every crew row when the film has no crew', () => {
    const view = buildFilmView(makeFilm({ crew: [] }), 'tr', ctx)
    expect(view.index.map((r) => r.key)).not.toContain('director')
    expect(view.index.every((r) => r.items.length > 0)).toBe(true)
    expect(view.directors).toEqual([])
  })

  it('lists genres then allowlisted themes as tags, linked to the archive', () => {
    const view = buildFilmView(makeFilm({ genreIds: [878], keywordIds: [4565, 999999] }), 'tr', ctx)
    expect(view.tags).toEqual([
      { text: 'Bilim-Kurgu', href: '/archive?genre=878', prefetch: false },
      { text: 'Distopya', href: '/archive?theme=4565', prefetch: false },
    ])
    expect(view.tags.some((t) => t.href?.includes('999999'))).toBe(false)
  })

  it('puts movement then collection tags first, with default prefetch', () => {
    const view = buildFilmView(makeFilm({ genreIds: [878] }), 'tr', {
      ...ctx,
      movements: [makeMovement()],
      collections: [makeCollection()],
    })
    expect(view.tags.slice(0, 3)).toEqual([
      { text: 'Fransız Yeni Dalgası', href: '/movement/french-new-wave' },
      { text: 'Yavaş Sinema', href: '/collection/slow-cinema' },
      { text: 'Bilim-Kurgu', href: '/archive?genre=878', prefetch: false },
    ])
  })

  it('keeps prefetch off for every archive and person link in tags and index', () => {
    const view = buildFilmView(makeFilm(fullFilm), 'tr', ctx)
    const items = [...view.tags, ...view.index.flatMap((r) => r.items)]
    const linked = items.filter(
      (i) => i.href?.startsWith('/archive') || i.href?.startsWith('/person'),
    )
    expect(linked.length).toBeGreaterThan(5)
    expect(linked.every((i) => i.prefetch === false)).toBe(true)
  })

  it('links country and language to the archive with localized names', () => {
    const view = buildFilmView(makeFilm(), 'en', ctx)
    expect(row(view, 'country').items).toEqual([
      { text: 'Soviet Union', href: '/en/archive?country=SU', prefetch: false },
    ])
    expect(row(view, 'language').items).toEqual([
      { text: 'Russian', href: '/en/archive?language=ru', prefetch: false },
    ])
  })

  it('links the year to its decade', () => {
    expect(row(buildFilmView(makeFilm(), 'en', ctx), 'year').items).toEqual([
      { text: '1979', href: '/en/archive?decade=1970', prefetch: false },
    ])
  })

  it('shows runtime and studios as plain text', () => {
    const view = buildFilmView(makeFilm(), 'tr', ctx)
    expect(row(view, 'runtime').items).toEqual([{ text: '163 dk' }])
    expect(row(view, 'studio').items).toEqual([{ text: 'Mosfilm' }])
  })

  it('summarises awards in content order', () => {
    expect(
      row(buildFilmView(makeFilm({ awards: { cesar: 1, oscar: 2 } }), 'tr', ctx), 'awards').items,
    ).toEqual([{ text: '2 Oscar · 1 César' }])
  })

  it('links people only when they have a page', () => {
    const view = buildFilmView(makeFilm(fullFilm), 'tr', ctx)
    expect(row(view, 'director').items).toEqual([
      { text: 'Andrei Tarkovsky', href: '/person/andrei-tarkovsky', prefetch: false },
    ])
    expect(row(view, 'producer').items).toEqual([{ text: 'Aleksandra Demidova' }])
    expect(row(view, 'composer').items).toEqual([
      { text: 'Eduard Artemyev', href: '/person/eduard-artemyev', prefetch: false },
    ])
    expect(view.directors).toEqual([
      {
        name: 'Andrei Tarkovsky',
        role: 'Yönetmen',
        profilePath: '/tarkovsky.jpg',
        href: '/person/andrei-tarkovsky',
      },
    ])
    expect(view.cast).toEqual([
      { name: 'Alexander Kaidanovsky', role: 'Stalker', profilePath: null },
    ])
  })

  it(`shows at most ${CREW_ROW_LIMIT} people per crew row`, () => {
    const writers = row(buildFilmView(makeFilm(fullFilm), 'en', ctx), 'writer').items
    expect(writers.map((w) => w.text)).toEqual([
      'Arkady Strugatsky',
      'Boris Strugatsky',
      'Andrei Tarkovsky',
    ])
  })

  it('keeps a missing Turkish overview as null', () => {
    expect(
      buildFilmView(makeFilm({ overview: { tr: null, en: 'A guide…' } }), 'tr', ctx).overview,
    ).toBeNull()
  })

  it('treats a blank overview as missing', () => {
    expect(
      buildFilmView(makeFilm({ overview: { tr: '   ', en: 'A guide…' } }), 'tr', ctx).overview,
    ).toBeNull()
  })

  it('hides the original title when it equals the title', () => {
    expect(
      buildFilmView(makeFilm({ originalTitle: 'Stalker' }), 'en', ctx).originalTitle,
    ).toBeNull()
    expect(buildFilmView(makeFilm(), 'tr', ctx).originalTitle).toBe('Сталкер')
  })

  it('names the Soviet Union in the country row', () => {
    expect(row(buildFilmView(makeFilm(), 'tr', ctx), 'country').items[0]?.text).toBe(
      'Sovyetler Birliği',
    )
  })

  it('uses the poster, stills and trailer of the film', () => {
    const view = buildFilmView(makeFilm({ trailerKey: 'abc' }), 'en', ctx)
    expect(view.posterPath).toBe('/stalker-en.jpg')
    expect(view.stills).toEqual(['/stalker-backdrop.jpg'])
    expect(view.trailerKey).toBe('abc')
  })
})

describe('buildSimilarCards', () => {
  it('captions a card with the director and year and notes the reason', () => {
    const film = makeFilm({ crew: [{ personId: 8452, job: 'director' }] })
    expect(buildSimilarCards([{ film, reason: 'same-director' }], 'en', ctx.people)).toEqual([
      {
        slug: film.slug,
        href: `/en/film/${film.slug}`,
        posterPath: film.poster.en,
        title: film.title.en,
        caption: 'Andrei Tarkovsky, 1979',
        note: 'Same director',
      },
    ])
  })

  it('captions only the year when the director is unknown', () => {
    const film = makeFilm({ crew: [{ personId: 999, job: 'director' }] })
    const [card] = buildSimilarCards([{ film, reason: 'shared-tag' }], 'tr', ctx.people)
    expect(card?.caption).toBe('1979')
    expect(card?.note).toBe('Ortak etiket')
  })
})
