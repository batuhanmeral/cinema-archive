import * as cheerio from 'cheerio'
import { z } from 'zod'
import { WIKIPEDIA_API_URL } from '../config'
import type { HttpClient } from '../lib/http'

export type CultListEntry = {
  wikiTitle: string
  title: string
  year: number
  yearEnd: number | null
  directors: string[]
  page: string
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
export const CULT_LIST_PAGES: readonly string[] = ['0–9', ...LETTERS].map(
  (suffix) => `List of cult films: ${suffix}`,
)

const WIKIDATA_BATCH_SIZE = 50
const YEAR_RANGE = /^(\d{4})(?:\s*[-–]\s*(\d{1,4}))?/

const parseResponseSchema = z.object({ parse: z.object({ text: z.string() }) })

const titlesResponseSchema = z.object({
  query: z.object({
    normalized: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
    redirects: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
    pages: z.array(
      z.object({
        title: z.string(),
        pageprops: z.object({ wikibase_item: z.string().optional() }).optional(),
      }),
    ),
  }),
})

// "1913-14" → bitiş yılı kısaltılmış; baştaki basamaklar başlangıç yılından alınır.
function parseYears(text: string): { year: number; yearEnd: number | null } | null {
  const match = YEAR_RANGE.exec(text.trim())
  if (!match) return null
  const [, startText, suffix] = match
  if (!startText) return null
  const year = Number(startText)
  if (!suffix) return { year, yearEnd: null }
  const yearEnd = Number(startText.slice(0, 4 - suffix.length) + suffix)
  return { year, yearEnd }
}

const RED_LINK_SUFFIX = ' (page does not exist)'

type Cell = ReturnType<cheerio.CheerioAPI>

// Dipnot (<sup>) bağlantıları yıl ve yönetmen okumasını bozmasın diye çıkarılır.
function withoutFootnotes(cell: Cell): Cell {
  const copy = cell.clone()
  copy.find('sup').remove()
  return copy
}

function parseDirectors(cell: Cell, $: cheerio.CheerioAPI): string[] {
  const clean = withoutFootnotes(cell)
  const linked = clean
    .find('a')
    .map((_, a) => $(a).text().trim())
    .get()
    .filter(Boolean)
  if (linked.length > 0) return linked
  return clean
    .text()
    .split(/,| and /)
    .map((name) => name.trim())
    .filter(Boolean)
}

// Bağlantısız italik başlık yazı olarak kalır; kırmızı bağlantı ekindeki son ek atılır.
function parseTitle(cell: Cell): { wikiTitle: string; title: string } | null {
  const italic = cell.find('i').first()
  const link = italic.find('a').first()
  const title = (link.length > 0 ? link : italic).text().trim()
  if (!title) return null
  const linkTitle = link.attr('title')?.replace(RED_LINK_SUFFIX, '')
  return { wikiTitle: linkTitle || title, title }
}

export function parseCultListPage(html: string, page: string): CultListEntry[] {
  const $ = cheerio.load(html)
  const entries: CultListEntry[] = []
  $('table.wikitable tr').each((_, row) => {
    const cells = $(row).children('td')
    if (cells.length === 0) return // başlık satırı (th) atlanır
    const title = parseTitle(cells.eq(0))
    const years = parseYears(withoutFootnotes(cells.eq(1)).text())
    if (cells.length < 3 || !title || !years) {
      const rowText = $(row).text().replace(/\s+/g, ' ').trim()
      throw new Error(`Unparseable row on "${page}": ${rowText}`)
    }
    entries.push({ ...title, ...years, directors: parseDirectors(cells.eq(2), $), page })
  })
  return entries
}

async function fetchPage(http: HttpClient, page: string): Promise<CultListEntry[]> {
  const url = new URL(WIKIPEDIA_API_URL)
  url.search = new URLSearchParams({
    action: 'parse',
    page,
    prop: 'text',
    format: 'json',
    formatversion: '2',
    disableeditsection: '1',
  }).toString()
  const parsed = parseResponseSchema.safeParse(await http.getJson(url.toString()))
  if (!parsed.success) throw new Error(`Malformed Wikipedia parse response for "${page}"`)
  return parseCultListPage(parsed.data.parse.text, page)
}

// Wikipedia eşzamanlılığı 1; sayfalar sırayla çekilir.
export async function fetchCultList(http: HttpClient): Promise<CultListEntry[]> {
  const entries: CultListEntry[] = []
  for (const page of CULT_LIST_PAGES) entries.push(...(await fetchPage(http, page)))
  return entries
}

const toMap = (pairs: { from: string; to: string }[] | undefined) =>
  new Map((pairs ?? []).map(({ from, to }) => [from, to]))

async function resolveBatch(
  http: HttpClient,
  titles: string[],
): Promise<Map<string, string | null>> {
  const url = new URL(WIKIPEDIA_API_URL)
  url.search = new URLSearchParams({
    action: 'query',
    prop: 'pageprops',
    ppprop: 'wikibase_item',
    redirects: '1',
    format: 'json',
    formatversion: '2',
    titles: titles.join('|'),
  }).toString()
  const parsed = titlesResponseSchema.safeParse(await http.getJson(url.toString()))
  if (!parsed.success) {
    throw new Error(`Malformed Wikipedia pageprops response for titles starting "${titles[0]}"`)
  }
  const { normalized, redirects, pages } = parsed.data.query
  const normalizedTo = toMap(normalized)
  const redirectTo = toMap(redirects)
  const idByTitle = new Map(pages.map((p) => [p.title, p.pageprops?.wikibase_item ?? null]))
  return new Map(
    titles.map((requested) => {
      const normalizedTitle = normalizedTo.get(requested) ?? requested
      const finalTitle = redirectTo.get(normalizedTitle) ?? normalizedTitle
      return [requested, idByTitle.get(finalTitle) ?? null]
    }),
  )
}

export async function resolveWikidataIds(
  http: HttpClient,
  wikiTitles: string[],
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>()
  for (let i = 0; i < wikiTitles.length; i += WIKIDATA_BATCH_SIZE) {
    const batch = await resolveBatch(http, wikiTitles.slice(i, i + WIKIDATA_BATCH_SIZE))
    for (const [title, id] of batch) result.set(title, id)
  }
  return result
}
