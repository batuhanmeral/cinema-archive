import type { Film } from '../../src/data/schemas'
import { type TitleDeps, tmdbIdByTitle } from '../match/titles'
import type { CollectionContent } from '../schemas'
import { type CollectionFacts, ruleCategories, rulesNeedWikidataGenres } from './rules'

export type FactDeps = TitleDeps & {
  categoryMembers(category: string): Promise<string[]>
  genreQids(ids: number[]): Promise<Map<number, string[]>>
}

// Kurallar yalnızca yayındaki filmlere bakar; gereken kaynak yoksa istek de yapılmaz.
export async function gatherCollectionFacts(
  contents: CollectionContent[],
  films: Film[],
  deps: FactDeps,
): Promise<(tmdbId: number) => CollectionFacts> {
  const genres = rulesNeedWikidataGenres(contents)
    ? await deps.genreQids(films.map((film) => film.tmdbId))
    : new Map<number, string[]>()

  const categoriesById = new Map<number, Set<string>>()
  for (const category of ruleCategories(contents)) {
    const ids = await tmdbIdByTitle(deps, await deps.categoryMembers(category))
    for (const id of ids.values()) {
      categoriesById.set(id, (categoriesById.get(id) ?? new Set()).add(category))
    }
  }
  return (tmdbId) => ({
    wikidataGenres: new Set(genres.get(tmdbId) ?? []),
    categories: categoriesById.get(tmdbId) ?? new Set(),
  })
}
