import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { makeCollection, makeFilm, makeMovement, makePerson } from '@/data/fixtures'
import { store } from '@/lib/data'
import { archiveDataBody, archiveDataFiles, buildArchiveIndex } from './archive-data'
import { archiveIndexSchema, filmSlugsSchema, type ArchiveIndex } from './schemas'
import { FILM_SLUGS_URL, archiveIndexUrl } from './urls'

const film = makeFilm({
  keywordIds: [7, 999],
  crew: [
    { personId: 2, job: 'director' },
    { personId: 8452, job: 'director' },
    { personId: 8452, job: 'writer' },
  ],
})
const ctx = {
  films: [film],
  people: new Map([
    [8452, makePerson()],
    [2, makePerson({ tmdbId: 2, name: 'Co Director', slug: null })],
  ]),
  themes: new Map([[7, { keywordId: 7, name: 'x', tr: 'x', en: 'x' }]]),
  movements: [makeMovement()],
  collections: [makeCollection()],
  filmById: (id: number) => (id === film.tmdbId ? film : undefined),
}

describe('buildArchiveIndex', () => {
  it('builds a TR film row', () => {
    const [row] = buildArchiveIndex('tr', ctx).films
    expect(row).toMatchObject({
      slug: 'stalker-1979',
      title: 'İz Sürücü',
      otherTitle: 'Stalker',
      directors: ['Co Director', 'Andrei Tarkovsky'],
      themes: [7],
      poster: '/stalker-tr.jpg',
      votes: 1500,
    })
  })
  it('swaps the titles and poster for EN', () => {
    const [row] = buildArchiveIndex('en', ctx).films
    expect(row).toMatchObject({
      title: 'Stalker',
      otherTitle: 'İz Sürücü',
      poster: '/stalker-en.jpg',
    })
  })
  it('lists movements before collections with member counts', () => {
    const { groups } = buildArchiveIndex('tr', ctx)
    expect(groups.map((g) => [g.kind, g.slug, g.filmCount])).toEqual([
      ['movement', 'french-new-wave', 1],
      ['collection', 'slow-cinema', 1],
    ])
    expect(groups[0]).toMatchObject({ name: 'Fransız Yeni Dalgası', otherName: 'French New Wave' })
    expect(buildArchiveIndex('en', ctx).groups[1]).toMatchObject({ name: 'Slow Cinema' })
  })
  it('produces schema-valid output', () => {
    expect(archiveIndexSchema.safeParse(buildArchiveIndex('tr', ctx)).success).toBe(true)
  })
})

describe('archive data files', () => {
  it('enumerates the three files and rejects unknown ones', () => {
    expect(archiveDataFiles()).toEqual(['index-tr.json', 'index-en.json', 'film-slugs.json'])
    expect(() => archiveDataBody('nope.json')).toThrow()
    expect(archiveIndexUrl('en')).toBe('/archive-data/index-en.json')
    expect(FILM_SLUGS_URL).toBe('/archive-data/film-slugs.json')
  })
  it('serves the real data within the size guard', () => {
    const tr = archiveDataBody('index-tr.json') as ArchiveIndex
    expect(archiveIndexSchema.safeParse(tr).success).toBe(true)
    expect(tr.films).toHaveLength(3108)
    expect(tr.groups.filter((g) => g.kind === 'movement')).toHaveLength(18)
    expect(tr.groups.filter((g) => g.kind === 'collection')).toHaveLength(23)
    expect(gzipSync(JSON.stringify(tr)).length).toBeLessThanOrEqual(300_000)
    expect(filmSlugsSchema.parse(archiveDataBody('film-slugs.json'))).toHaveLength(
      store.films().length,
    )
  })
})
