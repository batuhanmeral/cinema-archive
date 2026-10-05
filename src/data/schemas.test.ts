import { describe, expect, it } from 'vitest'
import { makeFilm } from './fixtures'
import { filmSchema } from './schemas'

describe('filmSchema', () => {
  it('accepts the fixture film', () => expect(filmSchema.parse(makeFilm())).toEqual(makeFilm()))
  it('rejects an uppercase slug', () =>
    expect(() => filmSchema.parse(makeFilm({ slug: 'Stalker-1979' }))).toThrow())
  it('rejects an empty Turkish title', () =>
    expect(() => filmSchema.parse(makeFilm({ title: { tr: '', en: 'Stalker' } }))).toThrow())
  it('accepts a missing Turkish overview as null', () =>
    expect(
      filmSchema.parse(makeFilm({ overview: { tr: null, en: 'A guide…' } })).overview.tr,
    ).toBeNull())
})
