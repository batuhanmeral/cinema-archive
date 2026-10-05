import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CULT_LIST_PAGES, parseCultListPage, resolveWikidataIds } from './wikipedia'

const html = readFileSync(join(__dirname, '__fixtures__/cult-list-sample.html'), 'utf8')
const entries = parseCultListPage(html, 'List of cult films: A')

describe('wikipedia cult list', () => {
  it('skips the header and reads every film row', () => expect(entries).toHaveLength(4))
  it('reads title, article title, year and director', () =>
    expect(entries[0]).toEqual({
      wikiTitle: 'À ma sœur!',
      title: 'À ma sœur!',
      year: 2001,
      yearEnd: null,
      directors: ['Catherine Breillat'],
      page: 'List of cult films: A',
    }))
  it('uses the link title, not the text, as the article title', () =>
    expect(entries.find((e) => e.title === 'Aag')?.wikiTitle).toBe('Aag (2007 film)'))
  it('reads every linked director', () =>
    expect(entries.find((e) => e.year === 1938)?.directors).toEqual([
      'Michael Curtiz',
      'William Keighley',
    ]))
  it('reads a year range', () =>
    expect(entries.find((e) => e.title === 'Fantômas')).toMatchObject({
      year: 1913,
      yearEnd: 1914,
    }))
  it('lists 27 pages starting with 0–9', () => {
    expect(CULT_LIST_PAGES).toHaveLength(27)
    expect(CULT_LIST_PAGES[0]).toBe('List of cult films: 0–9')
  })
  it('maps titles through normalization and redirects to QIDs', async () => {
    const http = {
      getJson: async () => ({
        query: {
          normalized: [{ from: 'a_b', to: 'A b' }],
          redirects: [{ from: 'A b', to: 'A B (film)' }],
          pages: [
            { title: 'A B (film)', pageprops: { wikibase_item: 'Q1' } },
            { title: 'Gone', missing: true },
          ],
        },
      }),
      postFormJson: async () => ({}),
    }
    const ids = await resolveWikidataIds(http, ['a_b', 'Gone'])
    expect(ids.get('a_b')).toBe('Q1')
    expect(ids.get('Gone')).toBeNull()
  })
})

describe('year ranges', () => {
  it('expands a short end year ("2001-3" → 2003)', () => {
    const row = `<table class="wikitable"><tr><td><i><a title="X">X</a></i></td><td>2001-3</td><td>A, B and C</td></tr></table>`
    expect(parseCultListPage(row, 'p')[0]).toMatchObject({
      year: 2001,
      yearEnd: 2003,
      directors: ['A', 'B', 'C'],
    })
  })
})

describe('row edge cases', () => {
  const table = (cells: string) =>
    `<table class="wikitable"><tr><th>Film</th></tr><tr>${cells}</tr></table>`
  const parse = (cells: string) => parseCultListPage(table(cells), 'p')

  it('keeps an unlinked italic title as the article title', () => {
    const [entry] = parse('<td><i>No Link</i></td><td>1999</td><td>A</td>')
    expect(entry).toMatchObject({ wikiTitle: 'No Link', title: 'No Link' })
  })
  it('strips the red link suffix from the article title', () => {
    const [entry] = parse(
      '<td><i><a class="new" title="Red Film (page does not exist)">Red Film</a></i></td><td>1999</td><td>A</td>',
    )
    expect(entry).toMatchObject({ wikiTitle: 'Red Film', title: 'Red Film' })
  })
  it('ignores footnotes in year and director cells', () => {
    const sup = '<sup class="reference"><a href="#n">[1]</a></sup>'
    const [linked] = parse(
      `<td><i><a title="X">X</a></i></td><td>1999${sup}</td><td><a title="D">D</a>${sup}</td>`,
    )
    expect(linked).toMatchObject({ year: 1999, directors: ['D'] })
    const [plain] = parse(`<td><i><a title="X">X</a></i></td><td>1999</td><td>D${sup}</td>`)
    expect(plain?.directors).toEqual(['D'])
  })
  it('throws naming the page and row when no year can be read', () => {
    expect(() => parse('<td><i>Odd</i></td><td>unknown</td><td>A</td>')).toThrow(/"p".*Odd/)
  })
})

describe('resolveWikidataIds batching', () => {
  it('sends 50 titles per request and merges the results', async () => {
    const titles = Array.from({ length: 101 }, (_, i) => `T${i}`)
    const requests: string[] = []
    const http = {
      getJson: async (url: string) => {
        requests.push(url)
        const batch = (new URL(url).searchParams.get('titles') ?? '').split('|')
        return {
          query: {
            pages: batch.map((title) => ({ title, pageprops: { wikibase_item: `Q${title}` } })),
          },
        }
      },
      postFormJson: async () => ({}),
    }
    const ids = await resolveWikidataIds(http, titles)
    expect(requests).toHaveLength(3)
    expect(ids.size).toBe(101)
    expect(ids.get('T100')).toBe('QT100')
  })
})
