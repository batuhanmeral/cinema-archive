import type { Collection, Movement } from '@/data/schemas'

export type Membership = {
  movementsOf(filmId: number): Movement[]
  collectionsOf(filmId: number): Collection[]
}

function groupByFilm<T extends { filmIds: number[] }>(groups: T[]): Map<number, T[]> {
  const byFilm = new Map<number, T[]>()
  for (const group of groups) {
    for (const filmId of group.filmIds) byFilm.set(filmId, [...(byFilm.get(filmId) ?? []), group])
  }
  return byFilm
}

// Gruplar verildiği sırada kalır; sayfalardaki etiket sırası dosya sırasıdır.
export function buildMembership(movements: Movement[], collections: Collection[]): Membership {
  const movementsByFilm = groupByFilm(movements)
  const collectionsByFilm = groupByFilm(collections)
  return {
    movementsOf: (filmId) => movementsByFilm.get(filmId) ?? [],
    collectionsOf: (filmId) => collectionsByFilm.get(filmId) ?? [],
  }
}
