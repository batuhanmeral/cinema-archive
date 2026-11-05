import * as cheerio from 'cheerio'
import { z } from 'zod'
import { WIKIPEDIA_API_URL } from '../config'
import type { HttpClient } from '../lib/http'

const CATEGORY_PAGE_SIZE = '500'

// "Mission: Impossible" gibi başlıklar korunsun diye yalnızca bilinen ad alanları elenir.
const NAMESPACE_PREFIX =
  /^(?:file|image|category|template|wikipedia|help|portal|special|talk|draft|user|module|mediawiki|book)(?:[ _]talk)?:/i

const parseResponseSchema = z.object({ parse: z.object({ text: z.string() }) })

const categoryResponseSchema = z.object({
  continue: z.object({ cmcontinue: z.string() }).optional(),
  query: z.object({ categorymembers: z.array(z.object({ title: z.string() })) }),
})

function apiUrl(params: Record<string, string>): string {
  const url = new URL(WIKIPEDIA_API_URL)
  url.search = new URLSearchParams(params).toString()
  return url.toString()
}

// Wikipedia eşzamanlılığı 1; sayfalar sırayla çekilir.
export async function fetchCategoryMembers(http: HttpClient, category: string): Promise<string[]> {
  const titles = new Set<string>()
  let cmcontinue: string | undefined
  do {
    const url = apiUrl({
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmnamespace: '0',
      cmlimit: CATEGORY_PAGE_SIZE,
      format: 'json',
      formatversion: '2',
      ...(cmcontinue ? { cmcontinue } : {}),
    })
    const parsed = categoryResponseSchema.safeParse(await http.getJson(url))
    if (!parsed.success) {
      throw new Error(`Malformed Wikipedia categorymembers response for "${category}"`)
    }
    parsed.data.query.categorymembers.forEach(({ title }) => titles.add(title))
    cmcontinue = parsed.data.continue?.cmcontinue
  } while (cmcontinue)
  return [...titles]
}

export function parseItalicLinks(html: string): string[] {
  const $ = cheerio.load(html)
  const titles = new Set<string>()
  $('i > a[href^="/wiki/"]').each((_, a) => {
    const link = $(a)
    const title = link.attr('title')
    // Dipnot bağlantıları ve kırmızı bağlantılar film makalesi değildir.
    if (!title || link.hasClass('new') || link.closest('sup').length > 0) return
    if (NAMESPACE_PREFIX.test(title)) return
    titles.add(title)
  })
  return [...titles]
}

export async function fetchArticleFilmLinks(http: HttpClient, article: string): Promise<string[]> {
  const url = apiUrl({
    action: 'parse',
    page: article,
    prop: 'text',
    format: 'json',
    formatversion: '2',
    disableeditsection: '1',
  })
  const parsed = parseResponseSchema.safeParse(await http.getJson(url))
  if (!parsed.success) throw new Error(`Malformed Wikipedia parse response for "${article}"`)
  return parseItalicLinks(parsed.data.parse.text)
}
