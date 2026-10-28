import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { z } from 'zod'
import { parseOrThrow } from './lib/validate'

export async function readContent<T>(
  contentDir: string,
  name: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const path = join(contentDir, name)
  const text = await readFile(path, 'utf8')
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Invalid JSON in ${path}`)
  }
  return parseOrThrow(schema, path, json)
}
