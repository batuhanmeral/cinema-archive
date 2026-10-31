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
  it('rejects a trailer key that is not a plain YouTube id', () => {
    for (const trailerKey of ['abc"onload="x', '../../evil', 'a?b=1', '', 'x'.repeat(65)]) {
      expect(filmSchema.safeParse(makeFilm({ trailerKey })).success, trailerKey).toBe(false)
    }
  })
  it('accepts a plain YouTube id or no trailer', () => {
    expect(filmSchema.parse(makeFilm({ trailerKey: 'JCuwthn-R_g' })).trailerKey).toBe('JCuwthn-R_g')
    expect(filmSchema.parse(makeFilm({ trailerKey: null })).trailerKey).toBeNull()
  })
})
