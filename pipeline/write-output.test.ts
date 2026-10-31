import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { makeFilm, makePerson } from '../src/data/fixtures'
import type { ImportOutput } from './run-import'
import { readPreviousState, writeImportOutput } from './write-output'

function validOutput(overrides: Partial<ImportOutput> = {}): ImportOutput {
  return {
    films: [makeFilm()],
    people: [makePerson()],
    genres: [{ id: 878, tr: 'Bilim Kurgu', en: 'Science Fiction' }],
    lock: {
      version: 1,
      films: [
        { tmdbId: 1398, slug: 'stalker-1979', sources: ['cult-list'], addedAt: '2026-10-30' },
      ],
    },
    report: {
      generatedAt: '2026-10-30T10:00:00.000Z',
      counts: {
        listRows: 1,
        films: 1,
        added: 1,
        missingFromSources: 0,
        review: 0,
        adultExcluded: 0,
        skipped: 0,
      },
      added: [{ tmdbId: 1398, slug: 'stalker-1979' }],
      missingFromSources: [],
      review: [],
      adultExcluded: [],
      skipped: [],
    },
    keywords: [{ id: 1, name: 'zone', films: 1 }],
    ...overrides,
  }
}

const tempDir = () => mkdtemp(join(tmpdir(), 'data-'))

describe('writeImportOutput', () => {
  it('writes nothing when one film is invalid', async () => {
    const dir = await tempDir()
    const output = validOutput({ films: [makeFilm(), makeFilm({ slug: 'Bad Slug' })] })
    await expect(writeImportOutput(dir, output)).rejects.toThrow(/films\/Bad Slug\.json|Bad Slug/)
    expect(await readdir(dir)).toEqual([])
  })

  it('refuses two films with the same slug and writes nothing', async () => {
    const dir = await tempDir()
    const output = validOutput({ films: [makeFilm(), makeFilm({ tmdbId: 2 })] })
    await expect(writeImportOutput(dir, output)).rejects.toThrow(/stalker-1979/)
    expect(await readdir(dir)).toEqual([])
  })

  it('writes 2-space JSON with a trailing newline', async () => {
    const dir = await tempDir()
    await writeImportOutput(dir, validOutput())
    const text = await readFile(join(dir, 'lock.json'), 'utf8')
    expect(text).toBe(`${JSON.stringify(validOutput().lock, null, 2)}\n`)
    expect(await readdir(join(dir, 'films'))).toEqual(['stalker-1979.json'])
    expect(await readdir(join(dir, 'reports'))).toEqual(['import-report.json', 'keywords.json'])
  })

  it('removes the film file of a locked film the next run excludes as adult', async () => {
    const dir = await tempDir()
    const alien = makeFilm({ tmdbId: 348, slug: 'alien-1979' })
    const lock = {
      version: 1 as const,
      films: [
        { tmdbId: 348, slug: 'alien-1979', sources: ['cult-list'], addedAt: '2026-10-30' },
        { tmdbId: 1398, slug: 'stalker-1979', sources: ['cult-list'], addedAt: '2026-10-30' },
      ],
    }
    await writeImportOutput(dir, validOutput({ films: [alien, makeFilm()], lock }))
    await writeFile(join(dir, 'films', 'notes.txt'), 'kept')

    // İkinci koşu: TMDB Stalker'ı adult işaretledi; kilit girdisi kalır, film yayından çıkar.
    const report = validOutput().report
    const adultExcluded = [{ wikiTitle: 'Stalker (film)', tmdbId: 1398, title: 'Stalker' }]
    await writeImportOutput(
      dir,
      validOutput({ films: [alien], lock, report: { ...report, adultExcluded } }),
    )

    expect((await readdir(join(dir, 'films'))).sort()).toEqual(['alien-1979.json', 'notes.txt'])
    expect(JSON.parse(await readFile(join(dir, 'lock.json'), 'utf8'))).toEqual(lock)
    expect(await readdir(join(dir, 'reports'))).toEqual(['import-report.json', 'keywords.json'])
  })

  it('refuses to remove film files that are not excluded as adult and writes nothing', async () => {
    const dir = await tempDir()
    await writeImportOutput(dir, validOutput())
    const peopleBefore = await readFile(join(dir, 'people.json'), 'utf8')

    // Boş film listesi (ör. ileride bir hata) yayındaki her film dosyasını silmemeli.
    const output = validOutput({ films: [], people: [] })
    await expect(writeImportOutput(dir, output)).rejects.toThrow(/stalker-1979\.json/)

    expect(await readdir(join(dir, 'films'))).toEqual(['stalker-1979.json'])
    expect(await readFile(join(dir, 'people.json'), 'utf8')).toBe(peopleBefore)
  })

  it('round-trips through readPreviousState', async () => {
    const dir = await tempDir()
    const output = validOutput()
    await writeImportOutput(dir, output)
    expect(await readPreviousState(dir)).toEqual({ lock: output.lock, people: output.people })
  })

  it('returns nulls when no previous state exists', async () => {
    expect(await readPreviousState(await tempDir())).toEqual({ lock: null, people: null })
  })

  it('names the file when a stored JSON file is malformed', async () => {
    const dir = await tempDir()
    await writeFile(join(dir, 'lock.json'), '{ nope')
    await expect(readPreviousState(dir)).rejects.toThrow(/lock\.json/)
  })
})
