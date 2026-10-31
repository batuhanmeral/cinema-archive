import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { filmSchema, genresFileSchema, peopleFileSchema, type Person } from '../src/data/schemas'
import { importReportSchema, keywordStatSchema, type LockFile, lockFileSchema } from './schemas'
import { parseOrThrow } from './lib/validate'
import type { ImportOutput } from './run-import'

const keywordsFileSchema = z.array(keywordStatSchema)

type Part = { path: string; data: unknown }

function buildParts(output: ImportOutput): Part[] {
  const slugs = new Set<string>()
  const filmParts = output.films.map((film) => {
    const path = `films/${film.slug}.json`
    parseOrThrow(filmSchema, path, film)
    if (slugs.has(film.slug)) throw new Error(`Duplicate film slug in ${path}`)
    slugs.add(film.slug)
    return { path, data: film }
  })
  const parts: Part[] = [
    ...filmParts,
    { path: 'people.json', data: output.people },
    { path: 'genres.json', data: output.genres },
    { path: 'lock.json', data: output.lock },
    { path: 'reports/import-report.json', data: output.report },
    { path: 'reports/keywords.json', data: output.keywords },
  ]
  parseOrThrow(peopleFileSchema, 'people.json', output.people)
  parseOrThrow(genresFileSchema, 'genres.json', output.genres)
  parseOrThrow(lockFileSchema, 'lock.json', output.lock)
  parseOrThrow(importReportSchema, 'reports/import-report.json', output.report)
  parseOrThrow(keywordsFileSchema, 'reports/keywords.json', output.keywords)
  return parts
}

const writeJson = (dataDir: string, { path, data }: Part) =>
  writeFile(join(dataDir, path), `${JSON.stringify(data, null, 2)}\n`)

async function listFilmFiles(dataDir: string): Promise<string[]> {
  try {
    return (await readdir(join(dataDir, 'films'))).filter((name) => name.endsWith('.json'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

// Sonradan adult işaretlenen kilitli filmin eski dosyası silinmeli; site films/ klasöründeki
// her dosyayı yayınlar. Başka bir dosya silinecekse bu bir hatadır, hiçbir şey yazılmaz.
async function findStaleFilms(dataDir: string, output: ImportOutput): Promise<string[]> {
  const current = new Set(output.films.map((film) => `${film.slug}.json`))
  const adultIds = new Set(output.report.adultExcluded.map((entry) => entry.tmdbId))
  const removable = new Set(
    output.lock.films.filter((entry) => adultIds.has(entry.tmdbId)).map((e) => `${e.slug}.json`),
  )
  const stale = (await listFilmFiles(dataDir)).filter((name) => !current.has(name))
  const unexpected = stale.filter((name) => !removable.has(name))
  if (unexpected.length > 0) {
    throw new Error(`Refusing to remove film files not excluded as adult: ${unexpected.join(', ')}`)
  }
  return stale
}

// Önce her parça doğrulanır; tek hata bile diske hiçbir şey yazılmamasını sağlar.
export async function writeImportOutput(dataDir: string, output: ImportOutput): Promise<void> {
  const parts = buildParts(output)
  const stale = await findStaleFilms(dataDir, output)
  await mkdir(join(dataDir, 'films'), { recursive: true })
  await mkdir(join(dataDir, 'reports'), { recursive: true })
  for (const part of parts.filter((p) => p.path !== 'lock.json')) await writeJson(dataDir, part)
  for (const name of stale) await rm(join(dataDir, 'films', name))
  // lock.json en sonda yazılır; yarım kalan yazım eski kilidi bozmaz.
  for (const part of parts.filter((p) => p.path === 'lock.json')) await writeJson(dataDir, part)
}

async function readJsonIfExists(dataDir: string, name: string, schema: z.ZodType) {
  let text: string
  try {
    text = await readFile(join(dataDir, name), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Invalid JSON in ${name}`)
  }
  parseOrThrow(schema, name, data)
  return data
}

export async function readPreviousState(
  dataDir: string,
): Promise<{ lock: LockFile | null; people: Person[] | null }> {
  return {
    lock: (await readJsonIfExists(dataDir, 'lock.json', lockFileSchema)) as LockFile | null,
    people: (await readJsonIfExists(dataDir, 'people.json', peopleFileSchema)) as Person[] | null,
  }
}
