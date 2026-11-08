import { z } from 'zod'
import { tmdbPathSchema } from '@/data/schemas'

const filmHrefSchema = z.string().regex(/^\/(?:en\/)?film\/[a-z0-9]+(?:-[a-z0-9]+)*$/)
const personHrefSchema = z.string().regex(/^\/(?:en\/)?person\/[a-z0-9]+(?:-[a-z0-9]+)*$/)

export const perdeFilmSchema = z.object({
  href: filmHrefSchema,
  title: z.string().min(1),
  caption: z.string(),
  overview: z.string().nullable(),
  image: tmdbPathSchema.nullable(),
})
export const posterItemSchema = z.object({
  href: filmHrefSchema,
  posterPath: tmdbPathSchema,
  title: z.string().min(1),
  caption: z.string(),
})
export const directorItemSchema = z.object({
  name: z.string().min(1),
  href: personHrefSchema,
  profilePath: tmdbPathSchema,
  note: z.string(),
})
export const perdeFilmsFileSchema = z.array(perdeFilmSchema).min(1)
export const posterPoolSchema = z.array(posterItemSchema)
export const directorPoolSchema = z.array(directorItemSchema)
export type PerdeFilm = z.infer<typeof perdeFilmSchema>
export type PosterItem = z.infer<typeof posterItemSchema>
export type DirectorItem = z.infer<typeof directorItemSchema>
