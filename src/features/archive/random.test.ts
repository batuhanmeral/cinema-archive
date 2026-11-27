import { describe, expect, it } from 'vitest'
import { currentFilmSlug, pickRandomSlug } from './random'

describe('pickRandomSlug', () => {
  it('never returns the current film', () => {
    expect(pickRandomSlug(['a', 'b'], 'a', () => 0)).toBe('b')
    expect(pickRandomSlug(['a', 'b'], 'a', () => 0.999)).toBe('b')
  })

  it('picks uniformly over the other films', () => {
    const slugs = ['a', 'b', 'c', 'd']
    expect(pickRandomSlug(slugs, 'b', () => 0)).toBe('a')
    expect(pickRandomSlug(slugs, 'b', () => 0.34)).toBe('c')
    expect(pickRandomSlug(slugs, 'b', () => 0.999)).toBe('d')
    expect(pickRandomSlug(slugs, null, () => 0.999)).toBe('d')
  })

  it('returns null when no other film exists', () => {
    expect(pickRandomSlug(['a'], 'a')).toBeNull()
    expect(pickRandomSlug([], null)).toBeNull()
  })
})

describe('currentFilmSlug', () => {
  it.each([
    ['/film/stalker-1979', 'stalker-1979'],
    ['/en/film/stalker-1979/', 'stalker-1979'],
    ['/archive', null],
    ['/en/movement/french-new-wave', null],
    ['/', null],
  ])('%s → %s', (pathname, slug) => {
    expect(currentFilmSlug(pathname)).toBe(slug)
  })
})
