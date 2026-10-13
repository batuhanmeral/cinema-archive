import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { filmSchema, genresFileSchema, peopleFileSchema, type Person } from '../src/data/schemas'
import { importReportSchema, keywordStatSchema, type LockFile, lockFileSchema } from './schemas'
import type { ImportOutput } from './run-import'

const keywordsFileSchema = z.array(keywordStatSchema)

type Part = { path: string; data: unknown }

function parseOrThrow(schema: z.ZodType, path: string, data: unknown): void {
  const result = schema.safeParse(data)
  if (result.success) return
  // Yalnızca alan yolları yazılır; veri değerleri hata çıktısına girmez.
  const fields = [...new Set(result.error.issues.map((i) => i.path.join('.') || '(root)'))]
  throw new Error(`Invalid data in ${path}: ${fields.join(', ')}`)
}

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

// Önce her parça doğrulanır; tek hata bile diske hiçbir şey yazılmamasını sağlar.
export async function writeImportOutput(dataDir: string, output: ImportOutput): Promise<void> {
  const parts = buildParts(output)
  await mkdir(join(dataDir, 'films'), { recursive: true })
  await mkdir(join(dataDir, 'reports'), { recursive: true })
  // lock.json en sonda yazılır; yarım kalan yazım eski kilidi bozmaz.
  const ordered = [
    ...parts.filter((p) => p.path !== 'lock.json'),
    ...parts.filter((p) => p.path === 'lock.json'),
  ]
  for (const { path, data } of ordered) {
    await writeFile(join(dataDir, path), `${JSON.stringify(data, null, 2)}\n`)
  }
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
