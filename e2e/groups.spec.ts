import { expect, test } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { type Film, filmSchema } from '../src/data/schemas'

const DATA_DIR = path.join(__dirname, '..', 'data')
const FILMS_DIR = path.join(DATA_DIR, 'films')

const localizedName = z.object({ tr: z.string(), en: z.string() })
const groupSchema = z.object({
  slug: z.string(),
  name: localizedName,
  filmIds: z.array(z.number().int()),
})
type Group = z.infer<typeof groupSchema>

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'))
}

const movements = z.array(groupSchema).parse(readJson(path.join(DATA_DIR, 'movements.json')))
const collections = z.array(groupSchema).parse(readJson(path.join(DATA_DIR, 'collections.json')))

const filmsByTmdbId = new Map<number, Film>(
  readdirSync(FILMS_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => filmSchema.parse(readJson(path.join(FILMS_DIR, file))))
    .map((film) => [film.tmdbId, film]),
)

function filmOf(id: number): Film {
  const film = filmsByTmdbId.get(id)
  if (!film) throw new Error(`data/films has no film with tmdbId ${id}`)
  return film
}

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`data has no ${what}`)
  return value
}

const frenchNewWave = required(
  movements.find((movement) => movement.slug === 'french-new-wave'),
  'movement french-new-wave',
)
const giallo = required(
  collections.find((collection) => collection.slug === 'giallo'),
  'collection giallo',
)
const longestNamedCollection = collections.reduce((a: Group, b: Group) =>
  b.name.tr.length > a.name.tr.length ? b : a,
)

async function horizontalOverflow(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

test('every movement and collection has a TR and EN page headed by its name', async ({ page }) => {
  test.slow()
  const pages = [
    ...movements.map((group) => ({ kind: 'movement', group })),
    ...collections.map((group) => ({ kind: 'collection', group })),
  ]
  for (const { kind, group } of pages) {
    for (const locale of ['tr', 'en'] as const) {
      const route = `${locale === 'en' ? '/en' : ''}/${kind}/${group.slug}`
      const response = await page.goto(route)
      expect(response?.status(), route).toBe(200)
      await expect(page.getByRole('heading', { level: 1 }), route).toHaveText(group.name[locale])
    }
  }
})

test('a movement lists exactly its films in year order and opens a film', async ({ page }) => {
  await page.goto(`/movement/${frenchNewWave.slug}`)
  const cards = page.locator('main h3 a[href^="/film/"]')
  await expect(cards).toHaveCount(frenchNewWave.filmIds.length)

  const hrefs = await cards.evaluateAll((links) => links.map((link) => link.getAttribute('href')))
  const bySlug = new Map([...filmsByTmdbId.values()].map((film) => [film.slug, film]))
  const years = hrefs.map((href) => required(bySlug.get(href!.replace('/film/', '')), href!).year)
  expect(years).toEqual([...years].sort((a, b) => a - b))

  await cards.first().click()
  await expect(page).toHaveURL(new RegExp(`${hrefs[0]}$`))
})

test('the movement tag on a film page opens the movement', async ({ page }) => {
  const film = filmOf(required(frenchNewWave.filmIds[0], 'film in french-new-wave'))
  await page.goto(`/film/${film.slug}`)
  await page
    .getByTestId('film-tags')
    .getByRole('link', { name: frenchNewWave.name.tr, exact: true })
    .click()
  await expect(page).toHaveURL(new RegExp(`/movement/${frenchNewWave.slug}$`))
})

test('the collection tag on a film page opens the collection', async ({ page }) => {
  const film = filmOf(required(giallo.filmIds[0], 'film in giallo'))
  await page.goto(`/film/${film.slug}`)
  await page
    .getByTestId('film-tags')
    .getByRole('link', { name: giallo.name.tr, exact: true })
    .click()
  await expect(page).toHaveURL(new RegExp(`/collection/${giallo.slug}$`))
})

test('the language toggle on a collection lands on the same English page', async ({
  page,
}, testInfo) => {
  await page.goto(`/collection/${giallo.slug}`)
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Menü' }).click()
  await page.getByRole('link', { name: 'İngilizce sürüme geç' }).click()
  await expect(page).toHaveURL(new RegExp(`/en/collection/${giallo.slug}$`))
})

test('the open mobile menu keeps the navbar in view after scrolling', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'The menu button exists below md only')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/movement/${frenchNewWave.slug}`)
  const banner = page.getByRole('banner')
  await expect(banner).toBeInViewport()
  await page.mouse.wheel(0, 500)
  await expect(banner).not.toBeInViewport()

  const menu = banner.getByRole('button', { name: 'Menü' })
  await menu.press('Enter')
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await menu.blur()
  await expect(banner).toBeInViewport({ ratio: 1 })
  await page.getByRole('link', { name: 'Akımlar', exact: true }).click()
  await expect(page).toHaveURL(/\/movements$/)
})

test('group pages have no horizontal scroll', async ({ page }) => {
  const routes = [
    `/movement/${frenchNewWave.slug}`,
    `/collection/${longestNamedCollection.slug}`,
    '/movements',
    '/collections',
  ]
  for (const route of routes) {
    await page.goto(route)
    expect(await horizontalOverflow(page), route).toBeLessThanOrEqual(0)
  }
})

test('the skip link is the first tab stop and moves focus into the content', async ({ page }) => {
  await page.goto(`/movement/${frenchNewWave.slug}`)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'İçeriğe atla' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#content$/)
  await expect(page.locator('#content')).toBeFocused()
  // Odak içeriğe taşındıktan sonra sıradaki Tab içerikteki ilk öğeye düşmeli.
  await page.keyboard.press('Tab')
  const insideContent = await page.evaluate(() => !!document.activeElement?.closest('#content'))
  expect(insideContent).toBe(true)
})
