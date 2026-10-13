import { describe, expect, it } from 'vitest'
import { makeFilm, makePerson } from '../src/data/fixtures'
import type { Film } from '../src/data/schemas'
import { buildPeople } from './people'

const refs = new Map([
  [1, { name: 'Dir One', profilePath: null }],
  [2, { name: 'Actor Two', profilePath: '/two.jpg' }],
  [3, { name: 'Writer Three', profilePath: null }],
])
const film = (
  tmdbId: number,
  cast: { personId: number; order: number }[],
  crew: Film['crew'] = [],
) =>
  makeFilm({
    tmdbId,
    crew,
    cast: cast.map((c) => ({ ...c, character: '' })),
  })
const find = (people: ReturnType<typeof buildPeople>, id: number) =>
  people.find((p) => p.tmdbId === id)

describe('buildPeople', () => {
  it('gives a page to every director', () => {
    const films = [film(10, [], [{ personId: 1, job: 'director' }])]
    expect(find(buildPeople(films, refs, null), 1)?.slug).toBe('dir-one')
  })

  it('gives no page to a writer who is not a director', () => {
    const films = [film(10, [], [{ personId: 3, job: 'writer' }])]
    expect(find(buildPeople(films, refs, null), 3)?.slug).toBeNull()
  })

  it('gives a page to an actor billed in the top 8 of two films', () => {
    const films = [film(10, [{ personId: 2, order: 0 }]), film(11, [{ personId: 2, order: 7 }])]
    expect(find(buildPeople(films, refs, null), 2)?.slug).toBe('actor-two')
  })

  it('gives no page to an actor in the top 8 of only one film', () => {
    const films = [film(10, [{ personId: 2, order: 0 }]), film(11, [])]
    expect(find(buildPeople(films, refs, null), 2)?.slug).toBeNull()
  })

  it('gives no page to an actor billed 9th in two films', () => {
    const films = [film(10, [{ personId: 2, order: 8 }]), film(11, [{ personId: 2, order: 8 }])]
    expect(find(buildPeople(films, refs, null), 2)?.slug).toBeNull()
  })

  it('keeps the previous slug of a person', () => {
    const films = [film(10, [], [{ personId: 1, job: 'director' }])]
    const prev = [makePerson({ tmdbId: 1, name: 'Old Name', slug: 'old-name' })]
    expect(find(buildPeople(films, refs, prev), 1)?.slug).toBe('old-name')
  })

  it('lists every referenced person sorted by tmdbId and drops unreferenced ones', () => {
    const films = [
      film(10, [
        { personId: 3, order: 0 },
        { personId: 2, order: 1 },
      ]),
    ]
    const prev = [makePerson({ tmdbId: 99, name: 'Gone', slug: 'gone' })]
    expect(buildPeople(films, refs, prev).map((p) => p.tmdbId)).toEqual([2, 3])
  })

  it('suffixes a new slug that collides with a stored one', () => {
    const films = [film(10, [], [{ personId: 1, job: 'director' }])]
    const prev = [makePerson({ tmdbId: 99, name: 'Dir One', slug: 'dir-one' })]
    expect(find(buildPeople(films, refs, prev), 1)?.slug).toBe('dir-one-1')
  })
})
