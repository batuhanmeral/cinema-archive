import Fuse from 'fuse.js'
import type { ArchiveFilm, ArchiveGroup, ArchiveIndex } from '@/features/archive/schemas'
import { normalizeText } from '@/lib/normalize-text'

export type FilmHit = { film: ArchiveFilm; score: number }
export type GroupHit = { group: ArchiveGroup; score: number }
export type Matcher = {
  films(query: string): FilmHit[]
  groups(query: string): GroupHit[]
}

type FilmDoc = {
  film: ArchiveFilm
  title: string
  otherTitle: string
  originalTitle: string
  directors: string[]
}
type GroupDoc = { group: ArchiveGroup; name: string; otherName: string }

const MIN_LENGTH = 2
const BASE = {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.3,
  minMatchCharLength: MIN_LENGTH,
}

export function createMatcher(index: ArchiveIndex): Matcher {
  const filmDocs: FilmDoc[] = index.films.map((film) => ({
    film,
    title: normalizeText(film.title),
    otherTitle: normalizeText(film.otherTitle),
    originalTitle: normalizeText(film.originalTitle),
    directors: film.directors.map(normalizeText),
  }))
  const groupDocs: GroupDoc[] = index.groups.map((group) => ({
    group,
    name: normalizeText(group.name),
    otherName: normalizeText(group.otherName),
  }))
  const filmFuse = new Fuse(filmDocs, {
    ...BASE,
    keys: [
      { name: 'title', weight: 1 },
      { name: 'otherTitle', weight: 1 },
      { name: 'originalTitle', weight: 1 },
      { name: 'directors', weight: 0.5 },
    ],
  })
  const groupFuse = new Fuse(groupDocs, { ...BASE, keys: ['name', 'otherName'] })

  return {
    films(query) {
      const q = normalizeText(query)
      if (q.length < MIN_LENGTH) return []
      return filmFuse.search(q).map((r) => ({ film: r.item.film, score: r.score ?? 1 }))
    },
    groups(query) {
      const q = normalizeText(query)
      if (q.length < MIN_LENGTH) return []
      return groupFuse.search(q).map((r) => ({ group: r.item.group, score: r.score ?? 1 }))
    },
  }
}
