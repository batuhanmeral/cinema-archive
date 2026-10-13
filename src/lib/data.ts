import 'server-only'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import {
  SLUG_PATTERN,
  awardGroupsFileSchema,
  filmSchema,
  genresFileSchema,
  peopleFileSchema,
  themesFileSchema,
  type AwardGroup,
  type Film,
  type Genre,
  type Person,
  type Theme,
} from '@/data/schemas'

export type DataStore = {
  films(): Film[]
  filmBySlug(slug: string): Film | undefined
  people(): Map<number, Person>
  genres(): Map<number, Genre>
  themes(): Map<number, Theme>
  awardGroups(): AwardGroup[]
}

function readJsonFile<T>(path: string, schema: z.ZodType<T>): T {
  let json: unknown
  try {
    json = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`Cannot read data file ${path}`, { cause: error })
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    throw new Error(`Invalid data file ${path}:\n${z.prettifyError(parsed.error)}`)
  }
  return parsed.data
}

// İlk çağrıda okur, sonra aynı sonucu döndürür; derleme boyunca her dosya bir kez okunur.
function once<T>(load: () => T): () => T {
  let cache: { value: T } | undefined
  return () => (cache ??= { value: load() }).value
}

function indexBy<T>(items: T[], idOf: (item: T) => number): Map<number, T> {
  return new Map(items.map((item) => [idOf(item), item]))
}

const JSON_EXTENSION = '.json'

export function createDataStore(dirs: { dataDir: string; contentDir: string }): DataStore {
  const filmsDir = join(dirs.dataDir, 'films')
  const filmPath = (slug: string) => join(filmsDir, `${slug}${JSON_EXTENSION}`)
  const filmCache = new Map<string, Film>()

  const readFilm = (slug: string): Film => {
    const cached = filmCache.get(slug)
    if (cached) return cached
    const film = readJsonFile(filmPath(slug), filmSchema)
    filmCache.set(slug, film)
    return film
  }

  return {
    // Dosya adı slug olduğundan sıralama okumadan önce yapılır.
    films: once(() =>
      readdirSync(filmsDir)
        .filter((name) => name.endsWith(JSON_EXTENSION))
        .map((name) => name.slice(0, -JSON_EXTENSION.length))
        .sort()
        .map(readFilm),
    ),
    filmBySlug(slug) {
      // Desen kontrolü, slug'ın dosya yolu olarak dizin dışına çıkmasını engeller.
      if (!SLUG_PATTERN.test(slug) || !existsSync(filmPath(slug))) return undefined
      return readFilm(slug)
    },
    people: once(() =>
      indexBy(readJsonFile(join(dirs.dataDir, 'people.json'), peopleFileSchema), (p) => p.tmdbId),
    ),
    genres: once(() =>
      indexBy(readJsonFile(join(dirs.dataDir, 'genres.json'), genresFileSchema), (g) => g.id),
    ),
    themes: once(() =>
      indexBy(
        readJsonFile(join(dirs.contentDir, 'themes.json'), themesFileSchema),
        (t) => t.keywordId,
      ),
    ),
    awardGroups: once(() =>
      readJsonFile(join(dirs.contentDir, 'awards.json'), awardGroupsFileSchema),
    ),
  }
}

export const store = createDataStore({
  dataDir: join(process.cwd(), 'data'),
  contentDir: join(process.cwd(), 'content'),
})
