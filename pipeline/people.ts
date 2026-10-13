import type { Film, Person } from '../src/data/schemas'
import { assignPersonSlug } from '../src/data/slug'

export const ACTOR_PAGE_MAX_ORDER = 8
export const ACTOR_PAGE_MIN_FILMS = 2

type PersonRef = { name: string; profilePath: string | null }

function pageWorthyIds(films: Film[]): Set<number> {
  const actorFilmCounts = new Map<number, number>()
  const ids = new Set<number>()
  for (const film of films) {
    for (const member of film.crew) if (member.job === 'director') ids.add(member.personId)
    const topBilled = new Set(
      film.cast.filter((c) => c.order < ACTOR_PAGE_MAX_ORDER).map((c) => c.personId),
    )
    for (const id of topBilled) actorFilmCounts.set(id, (actorFilmCounts.get(id) ?? 0) + 1)
  }
  for (const [id, count] of actorFilmCounts) if (count >= ACTOR_PAGE_MIN_FILMS) ids.add(id)
  return ids
}

export function buildPeople(
  films: Film[],
  refs: Map<number, PersonRef>,
  prev: Person[] | null,
): Person[] {
  const prevById = new Map((prev ?? []).map((person) => [person.tmdbId, person]))
  // Eski slug'lar, kişi artık listede olmasa bile başkasına verilmez.
  const taken = new Set((prev ?? []).flatMap((person) => (person.slug ? [person.slug] : [])))
  const withPage = pageWorthyIds(films)
  const referenced = new Set(
    films.flatMap((film) => [...film.crew, ...film.cast].map((m) => m.personId)),
  )

  return [...referenced]
    .sort((a, b) => a - b)
    .map((tmdbId) => {
      const ref = refs.get(tmdbId)
      if (!ref) throw new Error(`Person ${tmdbId} is referenced by a film but has no details`)
      let slug = prevById.get(tmdbId)?.slug ?? null
      if (slug === null && withPage.has(tmdbId)) {
        slug = assignPersonSlug({ name: ref.name, tmdbId }, taken)
        taken.add(slug)
      }
      return { tmdbId, name: ref.name, profilePath: ref.profilePath, slug }
    })
}
