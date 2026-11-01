import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { HttpClient } from '../lib/http'
import { fetchArticleFilmLinks, fetchCategoryMembers, parseItalicLinks } from './wikipedia-pages'

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(__dirname, '__fixtures__', name), 'utf8'))

const fakeHttp = (...responses: unknown[]) => {
  const getJson = vi.fn()
  responses.forEach((response) => getJson.mockResolvedValueOnce(response))
  return { getJson, postFormJson: vi.fn() } satisfies HttpClient
}

describe('fetchCategoryMembers', () => {
  it('follows cmcontinue across pages and returns the union in order', async () => {
    const http = fakeHttp(
      fixture('wikipedia-category-page1.json'),
      fixture('wikipedia-category-page2.json'),
    )
    const titles = await fetchCategoryMembers(http, 'Giallo films')
    expect(titles).toEqual([
      'Giallo',
      'List of giallo films',
      'A.A.A. Massaggiatrice bella presenza offresi...',
      'Al piacere di rivederla',
      'All the Colors of the Dark',
      'Amer (film)',
    ])
    expect(http.getJson).toHaveBeenCalledTimes(2)
    const first = new URL(http.getJson.mock.calls[0]?.[0] as string).searchParams
    expect(first.get('cmtitle')).toBe('Category:Giallo films')
    expect(first.get('cmnamespace')).toBe('0')
    expect(first.get('cmlimit')).toBe('500')
    const second = new URL(http.getJson.mock.calls[1]?.[0] as string).searchParams
    expect(second.get('cmcontinue')).toMatch(/^page\|/)
  })

  it('deduplicates titles', async () => {
    const page = { query: { categorymembers: [{ title: 'A' }, { title: 'A' }, { title: 'B' }] } }
    expect(await fetchCategoryMembers(fakeHttp(page), 'X')).toEqual(['A', 'B'])
  })

  it('throws on a malformed response, naming the category', async () => {
    await expect(fetchCategoryMembers(fakeHttp({ nope: 1 }), 'Giallo films')).rejects.toThrow(
      'Malformed Wikipedia categorymembers response for "Giallo films"',
    )
  })
})

describe('parseItalicLinks', () => {
  it('returns italic article links, skipping red, footnote and namespace links', () => {
    const html = `
      <ul>
        <li><i><a href="/wiki/Breathless_(1960_film)" title="Breathless (1960 film)">Breathless</a></i></li>
        <li><i><a href="/w/index.php?title=Ghost&amp;action=edit&amp;redlink=1" class="new" title="Ghost (page does not exist)">Ghost</a></i></li>
        <li><i><a href="/wiki/Film_A" title="Film A">A</a></i><sup><i><a href="/wiki/Note" title="Note">n</a></i></sup></li>
        <li><i><a href="/wiki/File:Poster.jpg" title="File:Poster.jpg">poster</a></i></li>
        <li><i><a href="/wiki/The_400_Blows" title="The 400 Blows">The 400 Blows</a></i></li>
        <li><i><a href="/wiki/Breathless_(1960_film)" title="Breathless (1960 film)">again</a></i></li>
        <li><a href="/wiki/Plain" title="Plain">not italic</a></li>
      </ul>`
    expect(parseItalicLinks(html)).toEqual(['Breathless (1960 film)', 'Film A', 'The 400 Blows'])
  })
})

describe('fetchArticleFilmLinks', () => {
  it('parses the article with the parse API and returns its italic links', async () => {
    const http = fakeHttp(fixture('wikipedia-article-parse.json'))
    const links = await fetchArticleFilmLinks(http, 'List of giallo films')
    expect(links).toEqual([
      'Giallo',
      'The Girl Who Knew Too Much (1963 film)',
      'Blood and Black Lace',
    ])
    const params = new URL(http.getJson.mock.calls[0]?.[0] as string).searchParams
    expect(params.get('action')).toBe('parse')
    expect(params.get('page')).toBe('List of giallo films')
    expect(params.get('prop')).toBe('text')
  })

  it('throws on a malformed response, naming the article', async () => {
    await expect(fetchArticleFilmLinks(fakeHttp({}), 'X')).rejects.toThrow(
      'Malformed Wikipedia parse response for "X"',
    )
  })
})
