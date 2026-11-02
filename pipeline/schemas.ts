import { z } from 'zod'
import { localizedSchema, SLUG_PATTERN, slugSchema, yearRangeSchema } from '../src/data/schemas'

const idSchema = z.number().int().positive()
const countSchema = z.number().int().min(0)

export const reviewReasonSchema = z.enum([
  'unmatched',
  'ambiguous',
  'wikidata-mismatch',
  'multiple-wikidata-ids',
  'series',
])

// Seri satırı: listenin adını verdiği serinin her filmi ayrı kimlikle eşlenir (spec §4.1).
const seriesIdsSchema = z
  .array(idSchema)
  .min(2)
  .refine((ids) => new Set(ids).size === ids.length, 'series ids must be distinct')

export const matchFixSchema = z.object({
  wikiTitle: z.string(),
  tmdbId: z.union([idSchema, seriesIdsSchema]).nullable(),
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

export const groupReportSchema = z.object({
  slug: slugSchema,
  films: countSchema,
  candidates: countSchema,
  added: z.array(idSchema),
  removed: z.array(idSchema),
})
export type GroupReport = z.infer<typeof groupReportSchema>

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
  groups: z.object({
    movements: z.array(groupReportSchema),
    collections: z.array(groupReportSchema),
  }),
})
export type ImportReport = z.infer<typeof importReportSchema>

export const keywordStatSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  films: idSchema,
})
export type KeywordStat = z.infer<typeof keywordStatSchema>

const countriesSchema = z.array(z.string().regex(/^[A-Z]{2}$/)).min(1)
const uniqueSlugs = (entries: { slug: string }[]) =>
  new Set(entries.map((entry) => entry.slug)).size === entries.length

export const movementContentSchema = z.object({
  slug: slugSchema,
  name: localizedSchema,
  years: yearRangeSchema,
  countries: countriesSchema,
  wikipedia: z.object({ article: z.string().min(1), categories: z.array(z.string()) }),
  pioneerIds: z.array(idSchema),
})
export type MovementContent = z.infer<typeof movementContentSchema>
export const movementContentFileSchema = z
  .array(movementContentSchema)
  .refine(uniqueSlugs, 'slugs must be unique')

export const listFilmSchema = z.object({
  title: z.string().min(1),
  year: z.number().int(),
  directors: z.array(z.string()),
})

export const movementListSchema = z.object({
  movement: slugSchema,
  source: z.enum(['bfi', 'mubi', 'criterion']),
  url: z.url(),
  films: z.array(listFilmSchema).min(1),
})
export type MovementList = z.infer<typeof movementListSchema>
export const movementListsFileSchema = z.array(movementListSchema)

export const collectionRuleSchema = z
  .object({
    wikidataGenres: z
      .array(z.string().regex(/^Q\d+$/))
      .min(1)
      .optional(),
    wikipediaCategories: z.array(z.string()).min(1).optional(),
    wikipediaArticles: z.array(z.string()).min(1).optional(),
    tmdbGenres: z.array(z.number().int()).min(1).optional(),
    countries: countriesSchema.optional(),
    years: z.object({ start: z.number(), end: z.number() }).optional(),
    sources: z.array(z.string()).min(1).optional(),
  })
  .refine(
    (rule) =>
      Boolean(
        rule.wikidataGenres ??
        rule.wikipediaCategories ??
        rule.wikipediaArticles ??
        rule.tmdbGenres ??
        rule.countries ??
        rule.sources,
      ),
    'rule needs a membership field besides years',
  )
export type CollectionRule = z.infer<typeof collectionRuleSchema>

export const collectionContentSchema = z.object({
  slug: slugSchema,
  name: localizedSchema,
  rule: collectionRuleSchema,
})
export type CollectionContent = z.infer<typeof collectionContentSchema>
export const collectionContentFileSchema = z
  .array(collectionContentSchema)
  .refine(uniqueSlugs, 'slugs must be unique')

export const yesilcamRowSchema = listFilmSchema.extend({
  basis: z.enum(['altin-portakal', 'hand']),
})
export type YesilcamRow = z.infer<typeof yesilcamRowSchema>
export const yesilcamFileSchema = z.array(yesilcamRowSchema)
