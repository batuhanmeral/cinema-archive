import { describe, expect, it } from 'vitest'
import type { ArchiveFilm, ArchiveGroup } from '@/features/archive/schemas'
import type { Matcher } from './matcher'
import { buildDropdownRows } from './rows'

const film = (i: number): ArchiveFilm => ({
  slug: `film-${i}`,
  title: `Film ${i}`,
  otherTitle: `Other ${i}`,
  originalTitle: `Original ${i}`,
  year: 1960 + i,
  directors: ['Someone'],
  poster: i === 0 ? '/poster.jpg' : null,
  genres: [],
  themes: [],
  countries: [],
  languages: [],
  votes: 0,
})
const group = (kind: ArchiveGroup['kind'], i: number, filmCount: number): ArchiveGroup => ({
  kind,
  slug: `${kind}-${i}`,
  name: `${kind} ${i}`,
  otherName: `${kind} other ${i}`,
  filmCount,
  image: '/image.jpg',
})

function stub(films: ArchiveFilm[], groups: ArchiveGroup[]): Matcher {
  return {
    films: () => films.map((f, i) => ({ film: f, score: i / 100 })),
    groups: () => groups.map((g, i) => ({ group: g, score: i / 100 })),
  }
}

const tenFilms = Array.from({ length: 10 }, (_, i) => film(i))
const mixed = [
  group('movement', 1, 22),
  group('collection', 1, 31),
  group('movement', 2, 18),
  group('collection', 2, 40),
  group('movement', 3, 16),
  group('collection', 3, 12),
]

describe('buildDropdownRows', () => {
  it('takes up to two movements, two collections, then films', () => {
    const result = buildDropdownRows(stub(tenFilms, mixed), 'godard', 'tr')
    expect(result.rows.map((row) => `${row.kind}:${row.title}`)).toEqual([
      'movement:movement 1',
      'movement:movement 2',
      'collection:collection 1',
      'collection:collection 2',
      'film:Film 0',
      'film:Film 1',
    ])
    expect(result.filmTotal).toBe(10)
    expect(result.archiveHref).toBe('/archive?q=godard')
  })

  it('writes type lines, links and images', () => {
    const { rows } = buildDropdownRows(stub(tenFilms, mixed), 'godard', 'tr')
    expect(rows[0]).toEqual({
      kind: 'movement',
      href: '/movement/movement-1',
      title: 'movement 1',
      typeLine: 'Akım · 22 film',
      image: '/image.jpg',
    })
    expect(rows[2]!.typeLine).toBe('Koleksiyon · 31 film')
    expect(rows[2]!.href).toBe('/collection/collection-1')
    expect(rows[4]).toEqual({
      kind: 'film',
      href: '/film/film-0',
      title: 'Film 0',
      typeLine: 'Film · 1960',
      image: '/poster.jpg',
    })
  })

  it('fills all six rows with films when no group matches', () => {
    const { rows } = buildDropdownRows(stub(tenFilms, []), 'film', 'en')
    expect(rows).toHaveLength(6)
    expect(rows.every((row) => row.kind === 'film')).toBe(true)
    expect(rows[0]!.href).toBe('/en/film/film-0')
  })

  it('has no archive link without film hits', () => {
    const result = buildDropdownRows(stub([], []), 'zzzz', 'tr')
    expect(result).toEqual({ rows: [], filmTotal: 0, archiveHref: null })
  })

  it('keeps group rows but no archive link when only groups match', () => {
    const result = buildDropdownRows(stub([], mixed.slice(0, 1)), 'yeni dalga', 'tr')
    expect(result.rows).toHaveLength(1)
    expect(result.archiveHref).toBeNull()
  })

  it('returns nothing below two normalised characters', () => {
    expect(buildDropdownRows(stub(tenFilms, mixed), 'a', 'tr').rows).toEqual([])
    expect(buildDropdownRows(stub(tenFilms, mixed), ' ’a! ', 'tr').rows).toEqual([])
  })

  it('cleans the query in the archive link', () => {
    const result = buildDropdownRows(stub(tenFilms, []), '  iz sürücü ', 'en')
    expect(result.archiveHref).toBe('/en/archive?q=iz%20s%C3%BCr%C3%BCc%C3%BC')
  })
})
