import 'server-only'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import {
  SLUG_PATTERN,
  awardGroupsFileSchema,
  collectionsFileSchema,
  filmSchema,
  genresFileSchema,
  movementsFileSchema,
  peopleFileSchema,
  themesFileSchema,
  type AwardGroup,
  type Collection,
  type Film,
  type Genre,
  type Movement,
  type Person,
  type Theme,
} from '@/data/schemas'
import { buildMembership, type Membership } from './membership'

export type DataStore = {
  films(): Film[]
  filmBySlug(slug: string): Film | undefined
  filmById(id: number): Film | undefined
  people(): Map<number, Person>
  genres(): Map<number, Genre>
  themes(): Map<number, Theme>
  awardGroups(): AwardGroup[]
  movements(): Movement[]
  collections(): Collection[]
  membership(): Membership
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

  const films = once(() =>
    readdirSync(filmsDir)
      .filter((name) => name.endsWith(JSON_EXTENSION))
      .map((name) => name.slice(0, -JSON_EXTENSION.length))
      .sort()
      .map(readFilm),
  )
  const filmsById = once(() => indexBy(films(), (film) => film.tmdbId))
  const movements = once(() =>
    readJsonFile(join(dirs.dataDir, 'movements.json'), movementsFileSchema),
  )
  const collections = once(() =>
    readJsonFile(join(dirs.dataDir, 'collections.json'), collectionsFileSchema),
  )

  return {
    // Dosya adı slug olduğundan sıralama okumadan önce yapılır.
    films,
    filmBySlug(slug) {
      // Desen kontrolü, slug'ın dosya yolu olarak dizin dışına çıkmasını engeller.
      if (!SLUG_PATTERN.test(slug) || !existsSync(filmPath(slug))) return undefined
      return readFilm(slug)
    },
    filmById: (id) => filmsById().get(id),
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
    movements,
    collections,
    membership: once(() => buildMembership(movements(), collections())),
  }
}

export const store = createDataStore({
  dataDir: join(process.cwd(), 'data'),
  contentDir: join(process.cwd(), 'content'),
})
