import { z } from 'zod'
import { slugSchema, tmdbPathSchema } from '@/data/schemas'

export const archiveFilmSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1),
  otherTitle: z.string().min(1),
  originalTitle: z.string().min(1),
  year: z.number().int(),
  directors: z.array(z.string().min(1)),
  poster: tmdbPathSchema.nullable(),
  genres: z.array(z.number().int()),
  themes: z.array(z.number().int()),
  countries: z.array(z.string().regex(/^[A-Z]{2}$/)),
  languages: z.array(z.string().regex(/^[a-z]{2}$/)),
  votes: z.number().int().min(0),
})
export const archiveGroupSchema = z.object({
  kind: z.enum(['movement', 'collection']),
  slug: slugSchema,
  name: z.string().min(1),
  otherName: z.string().min(1),
  filmCount: z.number().int().min(0),
  image: tmdbPathSchema.nullable(),
})
export const archiveIndexSchema = z.object({
  films: z.array(archiveFilmSchema),
  groups: z.array(archiveGroupSchema),
})
export const filmSlugsSchema = z.array(slugSchema)
export type ArchiveFilm = z.infer<typeof archiveFilmSchema>
export type ArchiveGroup = z.infer<typeof archiveGroupSchema>
export type ArchiveIndex = z.infer<typeof archiveIndexSchema>
