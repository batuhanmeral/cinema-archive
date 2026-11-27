import { describe, expect, it } from 'vitest'
import { archiveFilmSchema, archiveGroupSchema, filmSlugsSchema } from './schemas'

const row = {
  slug: 'stalker-1979',
  title: 'İz Sürücü',
  otherTitle: 'Stalker',
  originalTitle: 'Сталкер',
  year: 1979,
  directors: ['Andrei Tarkovsky'],
  poster: null,
  genres: [878],
  themes: [],
  countries: ['SU'],
  languages: ['ru'],
  votes: 10,
}

describe('archive schemas', () => {
  it('accepts a film row with a null poster', () => {
    expect(archiveFilmSchema.safeParse(row).success).toBe(true)
  })
  it('rejects bad poster paths and slugs', () => {
    expect(archiveFilmSchema.safeParse({ ...row, poster: 'x.jpg' }).success).toBe(false)
    expect(filmSlugsSchema.safeParse(['Bad Slug']).success).toBe(false)
  })
  it('rejects an unknown group kind', () => {
    const group = {
      kind: 'person',
      slug: 'a',
      name: 'A',
      otherName: 'A',
      filmCount: 1,
      image: null,
    }
    expect(archiveGroupSchema.safeParse(group).success).toBe(false)
  })
})
