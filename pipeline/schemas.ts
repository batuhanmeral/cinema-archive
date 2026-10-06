import { z } from 'zod'
import { SLUG_PATTERN } from '../src/data/schemas'

const idSchema = z.number().int().positive()
const countSchema = z.number().int().min(0)

export const reviewReasonSchema = z.enum([
  'unmatched',
  'ambiguous',
  'wikidata-mismatch',
  'multiple-wikidata-ids',
  'series',
])

export const matchFixSchema = z.object({
  wikiTitle: z.string(),
  tmdbId: idSchema.nullable(),
  note: z.string(),
})
export type MatchFix = z.infer<typeof matchFixSchema>
export const matchFixesFileSchema = z.array(matchFixSchema)

export const lockEntrySchema = z.object({
  tmdbId: idSchema,
  slug: z.string().regex(SLUG_PATTERN),
  sources: z.array(z.string()).min(1),
  addedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})
export type LockEntry = z.infer<typeof lockEntrySchema>

export const lockFileSchema = z.object({
  version: z.literal(1),
  films: z.array(lockEntrySchema),
})
export type LockFile = z.infer<typeof lockFileSchema>

export const reviewEntrySchema = z.object({
  wikiTitle: z.string(),
  title: z.string(),
  year: z.number().int(),
  directors: z.array(z.string()),
  reason: reviewReasonSchema,
  candidates: z.array(
    z.object({ tmdbId: idSchema, title: z.string(), year: z.number().int().nullable() }),
  ),
})
export type ReviewEntry = z.infer<typeof reviewEntrySchema>

const filmRefSchema = z.object({ tmdbId: idSchema, slug: z.string() })

export const importReportSchema = z.object({
  generatedAt: z.iso.datetime(),
  counts: z.object({
    listRows: countSchema,
    films: countSchema,
    added: countSchema,
    missingFromSources: countSchema,
    review: countSchema,
    adultExcluded: countSchema,
    skipped: countSchema,
  }),
  added: z.array(filmRefSchema),
  missingFromSources: z.array(filmRefSchema),
  review: z.array(reviewEntrySchema),
  adultExcluded: z.array(z.object({ wikiTitle: z.string(), tmdbId: idSchema, title: z.string() })),
  skipped: z.array(z.object({ wikiTitle: z.string(), note: z.string() })),
})
export type ImportReport = z.infer<typeof importReportSchema>

export const keywordStatSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  films: idSchema,
})
export type KeywordStat = z.infer<typeof keywordStatSchema>
