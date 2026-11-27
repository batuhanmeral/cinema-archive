import { assignFilmSlug } from '../src/data/slug'
import type { LockEntry, LockFile } from './schemas'

export type MatchedFilm = { tmdbId: number; title: string; year: number; sources: string[] }

const byTmdbId = (a: { tmdbId: number }, b: { tmdbId: number }) => a.tmdbId - b.tmdbId

export function updateLock(
  prev: LockFile | null,
  matched: MatchedFilm[],
  today: string,
): { lock: LockFile; added: LockEntry[]; missingFromSources: LockEntry[] } {
  const matchedIds = new Set(matched.map((film) => film.tmdbId))
  // Kaynaklar bu koşunun durumudur; listeden düşen film slug'ını korur ama kaynağı boşalır.
  const entries = new Map(
    (prev?.films ?? []).map((entry) => [
      entry.tmdbId,
      matchedIds.has(entry.tmdbId) ? entry : { ...entry, sources: [] },
    ]),
  )
  const taken = new Set([...entries.values()].map((entry) => entry.slug))
  const added: LockEntry[] = []

  // tmdbId sırası, çakışan slug'ların her çalıştırmada aynı çözülmesini sağlar.
  for (const film of [...matched].sort(byTmdbId)) {
    const existing = entries.get(film.tmdbId)
    if (existing) {
      entries.set(film.tmdbId, { ...existing, sources: film.sources })
      continue
    }
    const slug = assignFilmSlug(film, taken)
    taken.add(slug)
    const entry = { tmdbId: film.tmdbId, slug, sources: film.sources, addedAt: today }
    entries.set(film.tmdbId, entry)
    added.push(entry)
  }

  // Listeden düşen film kilitte kalır; URL'ler sessizce kaybolmasın diye yalnızca raporlanır.
  const missingFromSources = [...entries.values()]
    .filter((entry) => !matchedIds.has(entry.tmdbId))
    .sort(byTmdbId)
  return {
    lock: { version: 1, films: [...entries.values()].sort(byTmdbId) },
    added,
    missingFromSources,
  }
}
