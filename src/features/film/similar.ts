import type { Film } from '@/data/schemas'

export type SimilarReason = 'same-director' | 'shared-tag' | 'genre-decade'
export type SimilarFilm = { film: Film; reason: SimilarReason }

export const SIMILAR_LIMIT = 12

// Spec §7.2 önceliği: yönetmen her zaman etiketin, etiket her zaman tür+dönemin önünde.
const SAME_DIRECTOR_SCORE = 100
const SHARED_TAG_SCORE = 10
const GENRE_DECADE_SCORE = 5
const DECADE = 10

type Scored = SimilarFilm & { score: number }

const decadeOf = (film: Film) => Math.floor(film.year / DECADE)

const directorIds = (film: Film) =>
  film.crew.filter((member) => member.job === 'director').map((member) => member.personId)

function byRank(a: Scored, b: Scored): number {
  if (a.score !== b.score) return b.score - a.score
  if (a.film.voteCount !== b.film.voteCount) return b.film.voteCount - a.film.voteCount
  return a.film.slug < b.film.slug ? -1 : 1
}

export function findSimilarFilms(
  target: Film,
  all: Film[],
  allowedThemeIds: ReadonlySet<number>,
  limit = SIMILAR_LIMIT,
): SimilarFilm[] {
  const targetDirectors = new Set(directorIds(target))
  const targetThemes = new Set(target.keywordIds.filter((id) => allowedThemeIds.has(id)))
  const targetGenres = new Set(target.genreIds)
  const targetDecade = decadeOf(target)

  const scored = all.flatMap((film): Scored[] => {
    if (film.slug === target.slug) return []
    const sameDirector = directorIds(film).some((id) => targetDirectors.has(id))
    const sharedTags = new Set(film.keywordIds.filter((id) => targetThemes.has(id))).size
    const genreDecade =
      decadeOf(film) === targetDecade && film.genreIds.some((id) => targetGenres.has(id))
    const score =
      (sameDirector ? SAME_DIRECTOR_SCORE : 0) +
      sharedTags * SHARED_TAG_SCORE +
      (genreDecade ? GENRE_DECADE_SCORE : 0)
    if (score === 0) return []
    const reason: SimilarReason = sameDirector
      ? 'same-director'
      : sharedTags > 0
        ? 'shared-tag'
        : 'genre-decade'
    return [{ film, reason, score }]
  })

  return scored
    .sort(byRank)
    .slice(0, limit)
    .map(({ film, reason }) => ({ film, reason }))
}
