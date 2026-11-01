export type TitleDeps = {
  resolveWikidataIds(titles: string[]): Promise<Map<string, string | null>>
  tmdbIdsForQids(qids: string[]): Promise<Map<string, number[]>>
}

// Wikipedia başlığı → QID → tek TMDB kimliği. Birden çok kimlikli QID belirsizdir, atlanır.
export async function tmdbIdByTitle(
  deps: TitleDeps,
  titles: string[],
): Promise<Map<string, number>> {
  if (titles.length === 0) return new Map()
  const qidByTitle = await deps.resolveWikidataIds(titles)
  const qids = [...new Set([...qidByTitle.values()].filter((q): q is string => q !== null))]
  const idsByQid = await deps.tmdbIdsForQids(qids)
  const result = new Map<string, number>()
  for (const [title, qid] of qidByTitle) {
    const ids = [...new Set((qid && idsByQid.get(qid)) || [])]
    const [only] = ids
    if (ids.length === 1 && only !== undefined) result.set(title, only)
  }
  return result
}
