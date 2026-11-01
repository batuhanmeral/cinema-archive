import type { Film } from '@/data/schemas'
import type { SimilarReasonKey } from '@/lib/i18n/messages'
import type { Membership } from '@/lib/membership'

export type SimilarReason = SimilarReasonKey
export type SimilarFilm = { film: Film; reason: SimilarReason }

export const SIMILAR_LIMIT = 12

const DECADE = 10

// Sıralama sözlük sırasıdır: üst basamak, alttakilerin toplamıyla asla geçilemez.
type Signals = {
  sameDirector: boolean
  sameMovement: boolean
  sharedCollections: number
  sharedThemes: number
  genreDecade: boolean
}
type Scored = SimilarFilm & { signals: Signals }

const decadeOf = (film: Film) => Math.floor(film.year / DECADE)

const directorIds = (film: Film) =>
  film.crew.filter((member) => member.job === 'director').map((member) => member.personId)

const slugsOf = (groups: { slug: string }[]) => new Set(groups.map((group) => group.slug))

function reasonOf(signals: Signals): SimilarReason | null {
  if (signals.sameDirector) return 'same-director'
  if (signals.sameMovement) return 'same-movement'
  if (signals.sharedCollections > 0) return 'same-collection'
  if (signals.sharedThemes > 0) return 'shared-tag'
  return signals.genreDecade ? 'genre-decade' : null
}

function byRank(a: Scored, b: Scored): number {
  const x = a.signals
  const y = b.signals
  return (
    Number(y.sameDirector) - Number(x.sameDirector) ||
    Number(y.sameMovement) - Number(x.sameMovement) ||
    y.sharedCollections - x.sharedCollections ||
    y.sharedThemes - x.sharedThemes ||
    Number(y.genreDecade) - Number(x.genreDecade) ||
    b.film.voteCount - a.film.voteCount ||
    (a.film.slug < b.film.slug ? -1 : 1)
  )
}

export function findSimilarFilms(
  target: Film,
  all: Film[],
  allowedThemeIds: ReadonlySet<number>,
  membership: Membership,
  limit = SIMILAR_LIMIT,
): SimilarFilm[] {
  const targetDirectors = new Set(directorIds(target))
  const targetThemes = new Set(target.keywordIds.filter((id) => allowedThemeIds.has(id)))
  const targetGenres = new Set(target.genreIds)
  const targetDecade = decadeOf(target)
  const targetMovements = slugsOf(membership.movementsOf(target.tmdbId))
  const targetCollections = slugsOf(membership.collectionsOf(target.tmdbId))

  const scored = all.flatMap((film): Scored[] => {
    if (film.slug === target.slug) return []
    const signals: Signals = {
      sameDirector: directorIds(film).some((id) => targetDirectors.has(id)),
      sameMovement: membership.movementsOf(film.tmdbId).some((m) => targetMovements.has(m.slug)),
      sharedCollections: membership
        .collectionsOf(film.tmdbId)
        .filter((c) => targetCollections.has(c.slug)).length,
      sharedThemes: new Set(film.keywordIds.filter((id) => targetThemes.has(id))).size,
      genreDecade:
        decadeOf(film) === targetDecade && film.genreIds.some((id) => targetGenres.has(id)),
    }
    const reason = reasonOf(signals)
    return reason ? [{ film, reason, signals }] : []
  })

  return scored
    .sort(byRank)
    .slice(0, limit)
    .map(({ film, reason }) => ({ film, reason }))
}
