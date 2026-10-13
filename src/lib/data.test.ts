import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeFilm, makePerson } from '@/data/fixtures'
import { createDataStore } from './data'

let root: string
let dirs: { dataDir: string; contentDir: string }

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value))
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'data-store-'))
  dirs = { dataDir: join(root, 'data'), contentDir: join(root, 'content') }
  mkdirSync(join(dirs.dataDir, 'films'), { recursive: true })
  mkdirSync(dirs.contentDir)
  writeJson(join(dirs.dataDir, 'films', 'stalker-1979.json'), makeFilm())
  writeJson(join(dirs.dataDir, 'people.json'), [makePerson()])
  writeJson(join(dirs.dataDir, 'genres.json'), [
    { id: 878, tr: 'Bilim-Kurgu', en: 'Science Fiction' },
  ])
  writeJson(join(dirs.contentDir, 'themes.json'), [
    { keywordId: 4565, name: 'dystopia', tr: 'Distopya', en: 'Dystopia' },
  ])
  writeJson(join(dirs.contentDir, 'awards.json'), [
    { key: 'oscar', tr: 'Oscar', en: 'Oscar', qids: ['Q19020'] },
  ])
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('createDataStore', () => {
  it('finds a film by slug', () => {
    const store = createDataStore(dirs)
    expect(store.filmBySlug('stalker-1979')?.title.en).toBe('Stalker')
    expect(store.filmBySlug('missing-2000')).toBeUndefined()
    expect(store.filmBySlug('../people')).toBeUndefined()
  })

  it('lists films sorted by slug', () => {
    writeJson(join(dirs.dataDir, 'films', 'alien-1979.json'), makeFilm({ slug: 'alien-1979' }))
    expect(
      createDataStore(dirs)
        .films()
        .map((film) => film.slug),
    ).toEqual(['alien-1979', 'stalker-1979'])
  })

  it('maps people, genres and themes by id and keeps award group order', () => {
    const store = createDataStore(dirs)
    expect(store.people().get(8452)?.name).toBe('Andrei Tarkovsky')
    expect(store.genres().get(878)?.tr).toBe('Bilim-Kurgu')
    expect(store.themes().get(4565)?.en).toBe('Dystopia')
    expect(store.awardGroups().map((group) => group.key)).toEqual(['oscar'])
  })

  it('throws naming the file when a film file is invalid', () => {
    writeJson(join(dirs.dataDir, 'films', 'broken-2000.json'), { ...makeFilm(), year: 'x' })
    const store = createDataStore(dirs)
    expect(() => store.filmBySlug('broken-2000')).toThrow(/broken-2000\.json/)
    expect(() => store.films()).toThrow(/broken-2000\.json/)
  })

  it('throws naming the file when a file is not JSON', () => {
    writeFileSync(join(dirs.dataDir, 'people.json'), '{')
    expect(() => createDataStore(dirs).people()).toThrow(/people\.json/)
  })
})
