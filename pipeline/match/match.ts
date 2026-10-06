import type { z } from 'zod'
import type { MatchFix, reviewReasonSchema } from '../schemas'
import type { CultListEntry } from '../sources/wikipedia'

export type ReviewReason = z.infer<typeof reviewReasonSchema>

export type Candidate = {
  tmdbId: number
  title: string
  year: number | null
  directors: string[]
  adult: boolean
}

export type MatchDecision =
  | { kind: 'matched'; tmdbId: number; via: 'fix' | 'wikidata' | 'search' }
  | { kind: 'skipped'; note: string }
  | { kind: 'adult'; tmdbId: number }
  | { kind: 'review'; reason: ReviewReason; candidates: Candidate[] }

export const YEAR_TOLERANCE = 1

// Aksan, noktalama ve büyük/küçük harf farkı aynı kişiyi ayırmasın diye sadeleştirilir.
function normalizeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeNames(names: string[]): string[] {
  return names.map(normalizeName).filter((name) => name !== '')
}

function lastWord(name: string): string {
  return name.slice(name.lastIndexOf(' ') + 1)
}

export function directorsMatch(wiki: string[], tmdb: string[]): boolean {
  const tmdbNames = normalizeNames(tmdb)
  return normalizeNames(wiki).some((wikiName) =>
    tmdbNames.some((name) => name === wikiName || lastWord(name) === lastWord(wikiName)),
  )
}

function fits(entry: CultListEntry, candidate: Candidate): boolean {
  if (candidate.year === null || Math.abs(candidate.year - entry.year) > YEAR_TOLERANCE)
    return false
  return entry.directors.length === 0 || directorsMatch(entry.directors, candidate.directors)
}

function matched(
  tmdbId: number,
  via: 'fix' | 'wikidata' | 'search',
  candidates: Candidate[],
): MatchDecision {
  const isAdult = candidates.some((candidate) => candidate.tmdbId === tmdbId && candidate.adult)
  return isAdult ? { kind: 'adult', tmdbId } : { kind: 'matched', tmdbId, via }
}

export function decideMatch(
  entry: CultListEntry,
  input: { fix: MatchFix | undefined; wikidataTmdbIds: number[]; candidates: Candidate[] },
): MatchDecision {
  const { fix, wikidataTmdbIds, candidates } = input
  if (fix) {
    return fix.tmdbId === null
      ? { kind: 'skipped', note: fix.note }
      : matched(fix.tmdbId, 'fix', candidates)
  }
  if (entry.yearEnd !== null) return { kind: 'review', reason: 'series', candidates }
  if (wikidataTmdbIds.length > 1)
    return { kind: 'review', reason: 'multiple-wikidata-ids', candidates }

  const [tmdbId] = wikidataTmdbIds
  if (tmdbId !== undefined) {
    const wikidataCandidate = candidates.find((candidate) => candidate.tmdbId === tmdbId)
    return wikidataCandidate && fits(entry, wikidataCandidate)
      ? matched(tmdbId, 'wikidata', candidates)
      : { kind: 'review', reason: 'wikidata-mismatch', candidates }
  }

  const fitting = candidates.filter((candidate) => fits(entry, candidate))
  const [only] = fitting
  if (fitting.length === 1 && only) return matched(only.tmdbId, 'search', candidates)
  return { kind: 'review', reason: fitting.length > 1 ? 'ambiguous' : 'unmatched', candidates }
}
