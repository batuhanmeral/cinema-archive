import { describe, expect, it } from 'vitest'
import { store } from '@/lib/data'
import { messages } from '@/lib/i18n/messages'
import { archiveDataBody } from './archive-data'
import { buildFacetLabels, heroStats } from './labels'
import type { ArchiveFilm, ArchiveIndex } from './schemas'

const index = archiveDataBody('index-tr.json') as ArchiveIndex

const film = (o: Partial<ArchiveFilm>): ArchiveFilm => ({
  slug: 'a',
  title: 'A',
  otherTitle: 'A',
  originalTitle: 'A',
  year: 1965,
  directors: [],
  poster: null,
  genres: [],
  themes: [],
  countries: [],
  languages: [],
  votes: 0,
  ...o,
})

describe('heroStats', () => {
  it('counts films, years and countries on real data', () => {
    expect(heroStats(index.films)).toEqual({ films: 3135, from: 1894, to: 2026, countries: 79 })
  })
})

describe('buildFacetLabels', () => {
  it('labels every real value in Turkish', () => {
    const labels = buildFacetLabels('tr', index.films)
    expect(labels.genre['18']).toBe(store.genres().get(18)?.tr)
    expect(labels.country.FR).toBe('Fransa')
    expect(labels.decade['1960']).toBe("1960'lar")
    expect(labels.language.fr).toBe('Fransızca')
    const themeId = index.films.flatMap((f) => f.themes)[0]!
    expect(labels.theme[String(themeId)]).toBe(store.themes().get(themeId)?.tr)
  })

  it('only labels values that occur in the films', () => {
    const labels = buildFacetLabels('en', [film({ genres: [18], countries: ['FR'] })])
    expect(labels).toEqual({
      genre: { '18': store.genres().get(18)?.en },
      theme: {},
      country: { FR: 'France' },
      decade: { '1960': '1960s' },
      language: {},
    })
  })
})

describe('archive copy', () => {
  it('formats counted strings per locale', () => {
    expect(messages.tr.archive.resultCount(3128)).toBe('3.128 film')
    expect(messages.en.archive.resultCount(3128)).toBe('3,128 films')
    expect(messages.en.archive.resultCount(1)).toBe('1 film')
    const stats = { films: 3128, from: 1894, to: 2026, countries: 81 }
    expect(messages.tr.archive.heroMeta(stats)).toBe('3.128 film · 1894–2026 · 81 ülke')
    expect(messages.en.archive.heroMeta(stats)).toBe('3,128 films · 1894–2026 · 81 countries')
    expect(messages.tr.archive.removeChip('Dram')).toBe('Kaldır: Dram')
    expect(messages.en.archive.filterButton(0)).toBe('Filter')
    expect(messages.tr.archive.filterButton(3)).toBe('Filtrele (3)')
  })
})
