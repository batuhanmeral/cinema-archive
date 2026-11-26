import { describe, expect, it } from 'vitest'
import { store } from '@/lib/data'
import { normalizeText } from '@/lib/normalize-text'
import { buildArchiveIndex } from '@/features/archive/archive-data'
import { createMatcher } from './matcher'

const ctx = {
  films: store.films(),
  people: store.people(),
  themes: store.themes(),
  movements: store.movements(),
  collections: store.collections(),
  filmById: (id: number) => store.filmById(id),
}
const tr = createMatcher(buildArchiveIndex('tr', ctx))
const en = createMatcher(buildArchiveIndex('en', ctx))
const slugs = (m: typeof tr, q: string) => m.films(q).map((h) => h.film.slug)

describe('createMatcher', () => {
  it.each(['İz Sürücü', 'iz surucu', 'Stalker', 'Stalkr', 'Stlker'])(
    'finds stalker-1979 for %s',
    (q) => {
      expect(slugs(tr, q)).toContain('stalker-1979')
      expect(slugs(en, q)).toContain('stalker-1979')
    },
  )

  it.each(['Tarkovski', 'Tarkovsky'])('finds Tarkovsky films for %s', (q) => {
    const hits = tr.films(q).filter((h) => h.film.directors.includes('Andrei Tarkovsky'))
    expect(hits.length).toBeGreaterThanOrEqual(1)
  })

  it('only returns godard matches for godard', () => {
    const hits = tr.films('godard')
    expect(hits.length).toBeGreaterThanOrEqual(1)
    for (const { film } of hits) {
      const text = normalizeText(
        [film.title, film.otherTitle, film.originalTitle, ...film.directors].join(' '),
      )
      expect(text).toContain('godard')
    }
  })

  it('finds groups', () => {
    expect(tr.groups('yeni dalga').some((h) => h.group.kind === 'movement')).toBe(true)
    expect(
      tr.groups('giallo').some((h) => h.group.kind === 'collection' && h.group.slug === 'giallo'),
    ).toBe(true)
  })

  it('survives long punctuated queries', () => {
    const q = 'the good, the bad and the ugly (1966)!'
    expect(() => tr.films(q)).not.toThrow()
    expect(
      tr.films(q).some((h) => h.film.originalTitle === 'Il buono, il brutto, il cattivo'),
    ).toBe(true)
  })

  it('returns nothing for short queries', () => {
    expect(tr.films('a')).toEqual([])
    expect(tr.films('')).toEqual([])
    expect(tr.groups('a')).toEqual([])
  })
})
