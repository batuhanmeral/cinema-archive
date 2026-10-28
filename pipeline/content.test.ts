import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { themesFileSchema } from '../src/data/schemas'
import { readContent } from './content'

async function contentDir(name: string, text: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'content-'))
  await writeFile(join(dir, name), text)
  return dir
}

describe('readContent', () => {
  it('returns the parsed content', async () => {
    const theme = { keywordId: 1, name: 'zone', tr: 'Bölge', en: 'Zone' }
    const dir = await contentDir('themes.json', JSON.stringify([theme]))
    expect(await readContent(dir, 'themes.json', themesFileSchema)).toEqual([theme])
  })

  it('names the file and the invalid field paths without their values', async () => {
    const themes = [
      { keywordId: 1, name: 'zone', tr: 'Bölge', en: 'Zone' },
      { keywordId: 2, name: 'secret-value', tr: '', en: 'Cults' },
    ]
    const dir = await contentDir('themes.json', JSON.stringify(themes))
    const error = await readContent(dir, 'themes.json', themesFileSchema).catch((e: Error) => e)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toMatch(/themes\.json.*1\.tr/)
    expect((error as Error).message).not.toContain('secret-value')
  })

  it('names the file when the JSON is malformed', async () => {
    const dir = await contentDir('awards.json', '{ nope')
    await expect(readContent(dir, 'awards.json', themesFileSchema)).rejects.toThrow(/awards\.json/)
  })
})
