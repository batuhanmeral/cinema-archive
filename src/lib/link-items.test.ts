import { describe, expect, it } from 'vitest'
import { makePerson } from '@/data/fixtures'
import { genreLinks, personLink, themeLinks } from './link-items'

describe('link items', () => {
  it('links a person with a slug without prefetch and leaves others as text', () => {
    expect(personLink(makePerson(), 'en')).toEqual({
      text: 'Andrei Tarkovsky',
      href: '/en/person/andrei-tarkovsky',
      prefetch: false,
    })
    expect(personLink(makePerson({ slug: null }), 'tr')).toEqual({ text: 'Andrei Tarkovsky' })
  })

  it('skips unknown genres and themes and prefetches archive links', () => {
    const genres = new Map([[18, { id: 18, tr: 'Dram', en: 'Drama' }]])
    const themes = new Map([[1, { keywordId: 1, name: 'x', tr: 'Tema', en: 'Theme' }]])
    expect(genreLinks([18, 99], 'tr', genres)).toEqual([
      { text: 'Dram', href: '/archive?genre=18' },
    ])
    expect(themeLinks([1, 2], 'en', themes)).toEqual([
      { text: 'Theme', href: '/en/archive?theme=1' },
    ])
  })
})
