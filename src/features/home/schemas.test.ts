import { describe, expect, it } from 'vitest'
import { perdeFilmsFileSchema, posterPoolSchema, directorPoolSchema } from './schemas'

describe('home file schemas', () => {
  it('rejects malformed records and external navigation targets', () => {
    expect(perdeFilmsFileSchema.safeParse([{ bad: 1 }]).success).toBe(false)
    expect(
      perdeFilmsFileSchema.safeParse([
        { href: 'javascript:alert(1)', title: 'Film', caption: '', overview: null, image: null },
      ]).success,
    ).toBe(false)
    expect(
      posterPoolSchema.safeParse([
        { href: '/film/a', posterPath: null, title: 'Film', caption: '' },
      ]).success,
    ).toBe(false)
    expect(
      directorPoolSchema.safeParse([
        { name: 'Name', href: 'https://other.test/', profilePath: '/a.jpg', note: '3 films' },
      ]).success,
    ).toBe(false)
  })
})
