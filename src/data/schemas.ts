import { z } from 'zod'

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
// Yalnızca düz YouTube kimliği; gömme URL'sine yol ya da sorgu sızamaz.
export const TRAILER_KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

export const tmdbPathSchema = z.string().regex(/^\/[A-Za-z0-9_-]+\.(jpg|png|svg)$/)

const idSchema = z.number().int().positive()
const yearSchema = z.number().int().min(1880).max(2100)
export const slugSchema = z.string().regex(SLUG_PATTERN)
const nonEmptySchema = z.string().min(1)
export const localizedSchema = z.object({ tr: nonEmptySchema, en: nonEmptySchema })

export const crewJobSchema = z.enum(['director', 'writer', 'producer', 'cinematographer', 'composer'])
export type CrewJob = z.infer<typeof crewJobSchema>

export const filmSchema = z.object({
  tmdbId: idSchema,
  slug: slugSchema,
  year: yearSchema,
  runtime: idSchema.nullable(),
  originalTitle: nonEmptySchema,
  title: localizedSchema,
  overview: z.object({ tr: nonEmptySchema.nullable(), en: nonEmptySchema.nullable() }),
  poster: z.object({ tr: tmdbPathSchema.nullable(), en: tmdbPathSchema.nullable() }),
  backdrops: z.array(tmdbPathSchema),
  trailerKey: z.string().regex(TRAILER_KEY_PATTERN).nullable(),
  genreIds: z.array(z.number().int()),
  keywordIds: z.array(z.number().int()),
  countries: z.array(z.string().regex(/^[A-Z]{2}$/)),
  languages: z.array(z.string().regex(/^[a-z]{2}$/)),
  studios: z.array(z.string()),
  crew: z.array(z.object({ personId: z.number().int(), job: crewJobSchema })),
  cast: z.array(
    z.object({
      personId: z.number().int(),
      character: z.string(),
      order: z.number().int().min(0),
    }),
  ),
  awards: z.record(z.string(), idSchema),
  voteCount: z.number().int().min(0),
  sources: z.array(z.string()).min(1),
})
export type Film = z.infer<typeof filmSchema>

export const personSchema = z.object({
  tmdbId: idSchema,
  name: nonEmptySchema,
  profilePath: tmdbPathSchema.nullable(),
  // null değilse kişinin kendi sayfası var.
  slug: slugSchema.nullable(),
})
export type Person = z.infer<typeof personSchema>

export const genreSchema = z.object({ id: z.number().int(), tr: nonEmptySchema, en: nonEmptySchema })
export type Genre = z.infer<typeof genreSchema>

export const themeSchema = z.object({
  keywordId: z.number().int(),
  name: nonEmptySchema,
  tr: nonEmptySchema,
  en: nonEmptySchema,
})
export type Theme = z.infer<typeof themeSchema>

export const awardGroupSchema = z.object({
  key: slugSchema,
  tr: nonEmptySchema,
  en: nonEmptySchema,
  qids: z.array(z.string().regex(/^Q\d+$/)),
})
export type AwardGroup = z.infer<typeof awardGroupSchema>

export const peopleFileSchema = z.array(personSchema)
export const genresFileSchema = z.array(genreSchema)
export const themesFileSchema = z.array(themeSchema)
export const awardGroupsFileSchema = z.array(awardGroupSchema)

// Süren akımın bitişi null'dır; bitiş başlangıçtan önce olamaz.
export const yearRangeSchema = z
  .object({ start: yearSchema, end: yearSchema.nullable() })
  .refine(({ start, end }) => end === null || end >= start, 'end must not precede start')
export type YearRange = z.infer<typeof yearRangeSchema>

const countriesSchema = z.array(z.string().regex(/^[A-Z]{2}$/)).min(1)

export const movementSchema = z.object({
  slug: slugSchema,
  name: localizedSchema,
  years: yearRangeSchema,
  countries: countriesSchema,
  pioneerIds: z.array(idSchema),
  filmIds: z.array(idSchema).min(1),
})
export type Movement = z.infer<typeof movementSchema>

export const collectionSchema = z.object({
  slug: slugSchema,
  name: localizedSchema,
  filmIds: z.array(idSchema).min(1),
})
export type Collection = z.infer<typeof collectionSchema>

export const movementsFileSchema = z.array(movementSchema)
export const collectionsFileSchema = z.array(collectionSchema)
