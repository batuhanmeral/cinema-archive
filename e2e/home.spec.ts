import { expect, type Locator, type Page, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { movementsFileSchema } from '../src/data/schemas'
import { ROTATION, weekIndex } from '../src/features/home/rotation'

const MONDAY = Date.parse('2026-11-09T00:00:00+03:00')
const movements = movementsFileSchema.parse(JSON.parse(readFileSync('data/movements.json', 'utf8')))
const slot = weekIndex(MONDAY)
const current = movements.find((movement) => movement.slug === ROTATION[slot])!
const frame = (page: Page) => page.locator('[data-perde-slot]:visible')
const counter = (root: Locator) => root.getByText(/^\d+ \/ \d+$/)

async function expectWeek(page: Page, expectedSlot = slot) {
  await expect(frame(page)).toHaveCount(1)
  await expect(frame(page)).toHaveAttribute('data-perde-slot', `w${expectedSlot}`)
  const movement = movements.find((movement) => movement.slug === ROTATION[expectedSlot])!
  await expect(frame(page).getByRole('heading', { level: 1 })).toHaveText(movement.name.tr)
}

async function swipe(page: Page, root: Locator) {
  const box = (await root.boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 3
  const session = await page.context().newCDPSession(page)
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x - 80, y }],
    })
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await session.detach()
  }
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(MONDAY)
})

for (const now of [MONDAY, MONDAY - 60_000]) {
  test(`hard load selects only the Istanbul movement at ${new Date(now).toISOString()}`, async ({
    page,
  }) => {
    await page.clock.setFixedTime(now)
    await page.addInitScript(() => {
      const seen: string[][] = []
      Object.defineProperty(window, '__perdeSlotsSeen', { value: seen })
      const sample = () => {
        const slots = Array.from(document.querySelectorAll<HTMLElement>('[data-perde-slot]'))
          .filter((element) => element.getClientRects().length > 0)
          .map((element) => element.dataset.perdeSlot!)
        if (slots.length) seen.push(slots)
        requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    await page.goto('/')
    const expectedSlot = weekIndex(now)
    await expectWeek(page, expectedSlot)
    const samples = await page.evaluate(
      () => (window as unknown as { __perdeSlotsSeen: string[][] }).__perdeSlotsSeen,
    )
    expect(samples.length).toBeGreaterThan(0)
    expect(samples.every((slots) => slots.length === 1 && slots[0] === `w${expectedSlot}`)).toBe(
      true,
    )
  })
}

test('home notes and responsive section counts follow the weekly rotation', async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto('/')
  const mobile = isMobile || testInfo.project.name === 'mobile'
  await expect(page.locator('[data-home-strip]:visible')).toHaveCount(mobile ? 2 : 4)
  await expect(page.locator(`[data-strip-slot=w${slot}] [data-note=current]`)).toBeVisible()
  await expect(page.locator(`[data-strip-slot=w${(slot + 1) % 18}] [data-note=next]`)).toBeVisible()
  await expect(page.locator('main > section').nth(2).locator('li:visible')).toHaveCount(
    mobile ? 2 : 6,
  )
})

test('soft home navigation and history preserve the week without hydration errors', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/movements')
  await page.evaluate(() => {
    Object.defineProperty(window, '__softNavigation', { value: true })
  })
  await page.getByRole('link', { name: /Sinema Arşivi/ }).click()
  await expect(page).toHaveURL(/\/$/)
  await expectWeek(page)
  expect(await page.evaluate(() => '__softNavigation' in window)).toBe(true)
  await page.goBack()
  await expect(page).toHaveURL(/\/movements$/)
  await expect(page.locator(`[data-strip-slot=w${slot}] [data-note=current]`)).toBeVisible()
  await page.goForward()
  await expectWeek(page)
  expect(
    errors.filter((message) => /hydration|react\.dev\/errors|Minified React error/i.test(message)),
  ).toEqual([])
})

test('Perde advances through arrows and keys or a mobile swipe', async ({ page }, testInfo) => {
  await page.goto('/')
  const root = frame(page)
  const total = current.filmIds.length
  if (testInfo.project.name === 'mobile') {
    await swipe(page, root)
    await expect(counter(root)).toHaveText(`2 / ${total}`)
  } else {
    await root.getByRole('button', { name: 'Sonraki film' }).click()
    await root.getByRole('button', { name: 'Sonraki film' }).click()
    await expect(counter(root)).toHaveText(`3 / ${total}`)
    await root.getByRole('button', { name: 'Sonraki film' }).press('ArrowLeft')
    await expect(counter(root)).toHaveText(`2 / ${total}`)
  }
})

test('Perde never changes films without an interaction', async ({ page }) => {
  await page.clock.install({ time: MONDAY })
  await page.goto('/')
  await expect(counter(frame(page))).toHaveText(`1 / ${current.filmIds.length}`)
  await page.clock.runFor(15000)
  await expect(counter(frame(page))).toHaveText(`1 / ${current.filmIds.length}`)
})

test('reduced motion removes all Perde animations', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  if (testInfo.project.name === 'mobile') await swipe(page, frame(page))
  else await frame(page).getByRole('button', { name: 'Sonraki film' }).click()
  await expect(counter(frame(page))).toHaveText(`2 / ${current.filmIds.length}`)
  expect(
    await frame(page).evaluate((element) => element.getAnimations({ subtree: true }).length),
  ).toBe(0)
})

test('both home languages fit at 360px and the language toggle switches back', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await page.goto('/')
  for (const language of ['tr', 'en']) {
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(0)
    await page
      .getByRole('button', { name: language === 'tr' ? 'Menü' : 'Menu', exact: true })
      .click()
    await page
      .getByRole('link', { name: language === 'tr' ? /İngilizce sürüme geç/ : /Switch to Turkish/ })
      .click()
    await expect(page).toHaveURL(language === 'tr' ? /\/en$/ : /\/$/)
  }
})

test('all implemented home destinations return 200', async ({ page, request }) => {
  await page.goto('/')
  const hrefs = await page
    .locator('a[href^="/"]')
    .evaluateAll((links) => Array.from(new Set(links.map((link) => link.getAttribute('href')!))))
  for (const href of hrefs.filter(
    (href) => !/^\/(?:en\/)?(?:archive|person|directors)(?:\/|\?|$)/.test(href),
  )) {
    expect((await request.get(href)).status(), href).toBe(200)
  }
})

test('404 recovery links reach both home pages', async ({ page }) => {
  for (const [name, path] of [
    ['Ana sayfa', '/'],
    ['Home', '/en'],
  ]) {
    await page.goto('/this-page-does-not-exist')
    await page.getByRole('link', { name, exact: true }).click()
    await expect(page).toHaveURL(`http://localhost:4173${path}`)
    await expect(frame(page)).toHaveCount(1)
  }
})

test('a long title without an image or overview fits the 360px Perde', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  const title =
    'A very long film title with an unusuallylongunbrokenwordthatmustwrapwithoutoverflowingthescreen'
  await page.route(`**/home-data/perde-tr-${current.slug}.json`, async (route) => {
    const response = await route.fetch()
    const films = await response.json()
    films[1] = { ...films[1], title, image: null, overview: null }
    await route.fulfill({ json: films })
  })
  await page.goto('/')
  await swipe(page, frame(page))
  await expect(frame(page).getByRole('link', { name: title })).toBeVisible()
  await expect(frame(page).locator('img')).toHaveCount(0)
  await expect(frame(page).locator('[data-overview]')).toHaveCount(0)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(0)
})
