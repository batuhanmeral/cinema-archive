import { expect, type Locator, test } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { lockFileSchema } from '../pipeline/schemas'
import { type Film, filmSchema } from '../src/data/schemas'

const DATA_DIR = path.join(__dirname, '..', 'data')
const FILMS_DIR = path.join(DATA_DIR, 'films')
const STALKER_TMDB_ID = 1398
const LONG_TITLE = 'The Adventures of Buckaroo Banzai Across the 8th Dimension'

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function stalkerSlug(): string {
  const lock = lockFileSchema.parse(readJson(path.join(DATA_DIR, 'lock.json')))
  const entry = lock.films.find((film) => film.tmdbId === STALKER_TMDB_ID)
  if (!entry) throw new Error(`data/lock.json has no film with tmdbId ${STALKER_TMDB_ID} (Stalker)`)
  return entry.slug
}

function readFilm(slug: string): Film {
  return filmSchema.parse(readJson(path.join(FILMS_DIR, `${slug}.json`)))
}

function allFilms(): Film[] {
  return readdirSync(FILMS_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => readFilm(path.basename(file, '.json')))
}

// Taşma testinin en zorlu başlıkla çalışması için; film yoksa en uzun Türkçe başlığa düşer.
function longTitleSlug(): string {
  const films = allFilms()
  const named = films.find(
    (film) => film.title.en === LONG_TITLE || film.originalTitle === LONG_TITLE,
  )
  if (named) return named.slug
  const longest = films.reduce((a, b) => (b.title.tr.length > a.title.tr.length ? b : a))
  return longest.slug
}

const slug = stalkerSlug()
const film = readFilm(slug)

test('the Turkish film page shows the title, index and credit line', async ({ page }) => {
  await page.goto(`/film/${slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(film.title.tr)
  await expect(page.locator('dl').getByText('Yönetmen', { exact: true })).toBeVisible()
  await expect(page.getByText("Bu site TMDB API'sini kullanır", { exact: false })).toBeVisible()
})

test('the language toggle lands on the same film in English', async ({ page }) => {
  await page.goto(`/film/${slug}`)
  await page.getByRole('link', { name: 'İngilizce sürüme geç' }).click()
  await expect(page).toHaveURL(new RegExp(`/en/film/${slug}$`))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(film.title.en)
  await expect(page.getByText('This product uses the TMDB API', { exact: false })).toBeVisible()
})

test('no horizontal page scroll at the current viewport', async ({ page }) => {
  for (const route of [`/film/${slug}`, `/en/film/${slug}`, `/film/${longTitleSlug()}`]) {
    await page.goto(route)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, route).toBeLessThanOrEqual(0)
  }
})

test('every control is reachable by keyboard with a visible focus outline', async ({ page }) => {
  await page.goto(`/film/${slug}`)
  await page.keyboard.press('Tab')
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)
  expect(outline).not.toBe('none')
})

// Odaklanan öğenin dış çizgisi (kalınlık + boşluk) taşmayı kesen atalarının kutusuna sığmalı.
async function clippedOutline(link: Locator): Promise<string[]> {
  await link.focus()
  return link.evaluate((element) => {
    const style = getComputedStyle(element)
    if (style.outlineStyle === 'none') return ['outline: none']
    const reach = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset)
    const rect = element.getBoundingClientRect()
    const outline = {
      left: rect.left - reach,
      right: rect.right + reach,
      top: rect.top - reach,
      bottom: rect.bottom + reach,
    }
    // Alt piksel yuvarlaması yanlış alarm vermesin.
    const tolerance = 0.5
    const problems: string[] = []
    const section = element.closest('section')
    for (let node = element.parentElement; node; node = node.parentElement) {
      const { overflowX, overflowY } = getComputedStyle(node)
      const box = node.getBoundingClientRect()
      const left = box.left + node.clientLeft
      const top = box.top + node.clientTop
      const name = `${node.tagName.toLowerCase()}.${node.className}`
      if (
        overflowX !== 'visible' &&
        (outline.left < left - tolerance || outline.right > left + node.clientWidth + tolerance)
      ) {
        problems.push(`x clipped by ${name}`)
      }
      if (
        overflowY !== 'visible' &&
        (outline.top < top - tolerance || outline.bottom > top + node.clientHeight + tolerance)
      ) {
        problems.push(`y clipped by ${name}`)
      }
      if (node === section) break
    }
    return problems
  })
}

test('focus outlines of person links and rail cards are not clipped', async ({ page }) => {
  await page.goto(`/film/${slug}`)
  const cast = page.getByRole('region', { name: 'Yönetmen ve oyuncular' })
  const similar = page.getByRole('region', { name: 'Benzer filmler' })
  const links = {
    director: page.getByRole('link', { name: 'Andrei Tarkovsky' }).last(),
    'cast rail': cast.getByRole('link').first(),
    'similar rail': similar.getByRole('link').first(),
  }
  const problems: Record<string, string[]> = {}
  for (const [name, link] of Object.entries(links)) problems[name] = await clippedOutline(link)
  expect(problems).toEqual({ director: [], 'cast rail': [], 'similar rail': [] })
})

test('keyboard focus stays on the rail after its last page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Rail arrows are hidden below md')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/film/${slug}`)
  const section = page.locator('section', {
    has: page.getByRole('heading', { name: 'Benzer filmler' }),
  })
  const next = section.getByRole('button', { name: 'Sonraki' })
  await next.focus()
  // Her basış görünür genişliğin %80'ini kayar; 12 kart birkaç basışta biter.
  for (let press = 0; press < 10 && (await next.isVisible()); press++) {
    await page.keyboard.press('Enter')
    await page.waitForTimeout(100)
  }
  await expect(next).toBeHidden()
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY')
})

test('the film page works under the production headers without CSP violations', async ({
  page,
}) => {
  const violations: string[] = []
  page.on('console', (message) => {
    if (/Content Security Policy|Refused to/.test(message.text())) violations.push(message.text())
  })
  const response = await page.goto(`/film/${slug}`)
  expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
  const play = page.getByRole('button', { name: 'Fragmanı oynat' })
  if (await play.count()) {
    await play.click()
    await expect(page.locator('iframe')).toBeVisible()
  }
  expect(violations).toEqual([])
})
