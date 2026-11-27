import type { Collection, Film } from '../../src/data/schemas'
import type { CollectionContent, CollectionRule } from '../schemas'

export type CollectionFacts = {
  wikidataGenres: ReadonlySet<string>
  categories: ReadonlySet<string>
  articles: ReadonlySet<string>
}

// Sahip kararı (2026-11-05): büyük koleksiyonlar en çok oy alan 100 filme indirilir.
export const COLLECTION_MAX_FILMS = 100

const anyIn = <T>(wanted: readonly T[], has: (value: T) => boolean) => wanted.some(has)

export function matchesRule(rule: CollectionRule, film: Film, facts: CollectionFacts): boolean {
  if (rule.excludeTmdbIds?.includes(film.tmdbId)) return false
  if (rule.years && (film.year < rule.years.start || film.year > rule.years.end)) return false
  if (rule.countries && !anyIn(rule.countries, (c) => film.countries.includes(c))) return false
  if (rule.tmdbGenres && !anyIn(rule.tmdbGenres, (g) => film.genreIds.includes(g))) return false
  if (rule.sources && !anyIn(rule.sources, (s) => film.sources.includes(s))) return false
  if (rule.wikidataGenres && !anyIn(rule.wikidataGenres, (q) => facts.wikidataGenres.has(q))) {
    return false
  }
  if (
    rule.wikipediaCategories &&
    !anyIn(rule.wikipediaCategories, (c) => facts.categories.has(c))
  ) {
    return false
  }
  if (rule.wikipediaArticles && !anyIn(rule.wikipediaArticles, (a) => facts.articles.has(a))) {
    return false
  }
  return true
}

const byVotes = (a: Film, b: Film) => b.voteCount - a.voteCount || a.tmdbId - b.tmdbId
const byYear = (a: Film, b: Film) => a.year - b.year || a.tmdbId - b.tmdbId

export function buildCollections(
  contents: CollectionContent[],
  films: Film[],
  factsOf: (tmdbId: number) => CollectionFacts,
): { collections: Collection[]; sizes: Map<string, number> } {
  const collections: Collection[] = []
  const sizes = new Map<string, number>()
  for (const { slug, name, rule } of contents) {
    const matched = films.filter((film) => matchesRule(rule, film, factsOf(film.tmdbId)))
    const filmIds = matched
      .sort(byVotes)
      .slice(0, COLLECTION_MAX_FILMS)
      .sort(byYear)
      .map((film) => film.tmdbId)
    sizes.set(slug, matched.length)
    if (filmIds.length > 0) collections.push({ slug, name, filmIds })
  }
  return { collections, sizes }
}

export const rulesNeedWikidataGenres = (contents: CollectionContent[]): boolean =>
  contents.some(({ rule }) => rule.wikidataGenres !== undefined)

export const ruleCategories = (contents: CollectionContent[]): string[] => [
  ...new Set(contents.flatMap(({ rule }) => rule.wikipediaCategories ?? [])),
]

export const ruleArticles = (contents: CollectionContent[]): string[] => [
  ...new Set(contents.flatMap(({ rule }) => rule.wikipediaArticles ?? [])),
]
