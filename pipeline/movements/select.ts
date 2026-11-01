import type { MovementContent } from '../schemas'

export const MOVEMENT_MAX_FILMS = 40
export const MOVEMENT_MIN_FILMS = 12
export const MOVEMENT_YEAR_TOLERANCE = 1

export type MovementSource = 'article' | 'category' | 'bfi' | 'mubi' | 'criterion'

export type MovementCandidate = {
  tmdbId: number
  year: number
  voteCount: number
  onCultList: boolean
  sources: ReadonlySet<MovementSource>
}

export function fitsMovement(
  movement: Pick<MovementContent, 'years' | 'countries'>,
  film: { year: number; countries: string[] },
): boolean {
  const { start, end } = movement.years
  if (film.year < start - MOVEMENT_YEAR_TOLERANCE) return false
  if (end !== null && film.year > end + MOVEMENT_YEAR_TOLERANCE) return false
  return film.countries.some((country) => movement.countries.includes(country))
}

function mergeById(candidates: MovementCandidate[]): MovementCandidate[] {
  const merged = new Map<number, MovementCandidate>()
  for (const candidate of candidates) {
    const existing = merged.get(candidate.tmdbId)
    merged.set(
      candidate.tmdbId,
      existing
        ? {
            ...existing,
            onCultList: existing.onCultList || candidate.onCultList,
            sources: new Set([...existing.sources, ...candidate.sources]),
          }
        : candidate,
    )
  }
  return [...merged.values()]
}

const byRank = (a: MovementCandidate, b: MovementCandidate) =>
  Number(b.onCultList) - Number(a.onCultList) ||
  b.sources.size - a.sources.size ||
  b.voteCount - a.voteCount ||
  a.tmdbId - b.tmdbId

const byYear = (a: MovementCandidate, b: MovementCandidate) =>
  a.year - b.year || a.tmdbId - b.tmdbId

export function selectMovementFilms(
  candidates: MovementCandidate[],
  limit = MOVEMENT_MAX_FILMS,
): MovementCandidate[] {
  return mergeById(candidates).sort(byRank).slice(0, limit).sort(byYear)
}
