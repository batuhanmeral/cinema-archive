import { describe, expect, it } from 'vitest'
import { buildFilmView } from '@/features/film/view-model'
import { FILTER_KEYS, parseArchiveQuery, type FilterKey } from '@/lib/archive-query'
import { store } from '@/lib/data'
import { archiveDataBody } from './archive-data'
import { filmValues, selectFilms } from './select'
import type { ArchiveIndex } from './schemas'

describe('real data (film-page archive links)', () => {
  it('opens a one-value archive view that contains the film', () => {
    const index = archiveDataBody('index-tr.json') as ArchiveIndex
    const known = {} as Record<FilterKey, ReadonlySet<string>>
    for (const key of FILTER_KEYS)
      known[key] = new Set(index.films.flatMap((film) => filmValues(film, key)))
    const ctx = {
      people: store.people(),
      genres: store.genres(),
      themes: store.themes(),
      movements: [],
      collections: [],
      awardGroups: store.awardGroups(),
    }
    // Aynı bağlantı birçok filmde geçer; her sorgu bir kez süzülür.
    const views = new Map<string, Set<string>>()
    const keys = new Set<FilterKey>()
    let checked = 0
    for (const film of store.films()) {
      const view = buildFilmView(film, 'tr', ctx)
      const hrefs = [...view.tags, ...view.index.flatMap((row) => row.items)]
        .map((item) => item.href)
        .filter((href) => href?.startsWith('/archive?'))
      for (const href of new Set(hrefs)) {
        let slugs = views.get(href!)
        if (!slugs) {
          const query = parseArchiveQuery(new URL(href!, 'https://x').searchParams, known)
          const values = FILTER_KEYS.flatMap((key) => query.filters[key])
          expect(values, href).toHaveLength(1)
          for (const key of FILTER_KEYS) if (query.filters[key].length > 0) keys.add(key)
          expect(query.q).toBe('')
          slugs = new Set(
            selectFilms(index.films, query, { locale: 'tr', scores: null }).map((f) => f.slug),
          )
          views.set(href!, slugs)
        }
        expect(slugs.has(film.slug), `${film.slug} in ${href}`).toBe(true)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(store.films().length * 3)
    expect([...keys].sort()).toEqual([...FILTER_KEYS].sort())
  })
})
