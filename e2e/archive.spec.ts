import { expect, type Page, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { archiveIndexSchema } from '../src/features/archive/schemas'

// Beklenen sayılar derlenen dizinden hesaplanır; arayüz aynı veriyi süzer.
const index = archiveIndexSchema.parse(
  JSON.parse(readFileSync('out/archive-data/index-tr.json', 'utf8')),
)
const frenchSixties = index.films.filter(
  (film) => film.countries.includes('FR') && film.year >= 1960 && film.year < 1970,
).length
const format = new Intl.NumberFormat('tr')

const cards = (page: Page) => page.locator('main a[href*="/film/"]')
const showMore = (page: Page) => page.getByRole('button', { name: 'Daha fazla göster' })
const isMobile = (name: string) => name === 'mobile'

async function noHorizontalScroll(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0)
}

// Masaüstünde açılır panel, mobilde alt panel; ikisi de aynı onay kutularını sunar.
async function toggle(page: Page, mobile: boolean, filter: string, value: RegExp) {
  if (mobile) {
    await page.getByRole('button', { name: /^Filtrele/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Filtrele' })
    await sheet.getByRole('button', { name: new RegExp(`^${filter}`) }).click()
    await sheet.getByRole('checkbox', { name: value }).check()
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
  } else {
    await page.getByRole('button', { name: new RegExp(`^${filter}`) }).click()
    await page.getByRole('checkbox', { name: value }).check()
    await page.keyboard.press('Escape')
  }
}

test('a film-page tag opens the filtered archive containing that film', async ({ page }) => {
  await page.goto('/film/stalker-1979')
  const tag = page.locator('a[href="/archive?genre=878"]').first()
  const label = (await tag.textContent())!.trim()
  await tag.click()
  await expect(page).toHaveURL(/\/archive\?genre=878$/)
  await expect(page.getByRole('button', { name: `Kaldır: ${label}` })).toBeVisible()
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0)
  const stalker = page.locator('main a[href="/film/stalker-1979"]')
  while (!(await stalker.count()) && (await showMore(page).count())) await showMore(page).click()
  await expect(stalker).toBeVisible()
})

test('filters, chips, clear, sort and show more', async ({ page }, testInfo) => {
  const mobile = isMobile(testInfo.project.name)
  await page.goto('/archive')
  await expect(cards(page)).toHaveCount(48)
  await expect(
    page.getByText(`${format.format(index.films.length)} film`, { exact: true }),
  ).toBeVisible()

  await toggle(page, mobile, 'Ülke', /^Fransa/)
  await toggle(page, mobile, 'Yıl', /^1960'lar/)
  await expect(page).toHaveURL(/\/archive\?country=FR&decade=1960$/)
  await expect(page.getByText(`${frenchSixties} film`, { exact: true })).toBeVisible()
  await expect(cards(page)).toHaveCount(Math.min(frenchSixties, 48))

  await page.getByRole('button', { name: 'Kaldır: Fransa' }).click()
  await expect(page).toHaveURL(/\/archive\?decade=1960$/)
  await page.getByRole('button', { name: 'Temizle' }).click()
  await expect(page).toHaveURL(/\/archive$/)
  await expect(page.getByRole('button', { name: /^Kaldır/ })).toHaveCount(0)

  const first = await cards(page).first().getAttribute('href')
  await page.getByRole('combobox', { name: /Sırala/ }).selectOption({ label: 'Popülerlik' })
  await expect(page).toHaveURL(/sort=popular/)
  await expect(cards(page).first()).not.toHaveAttribute('href', first!)

  await showMore(page).click()
  await expect(cards(page)).toHaveCount(96)
  await noHorizontalScroll(page)
})

test('the English archive reads the URL', async ({ page }) => {
  await page.goto('/en/archive?genre=18')
  await expect(page.getByRole('button', { name: 'Remove: Drama' })).toBeVisible()
  await expect(cards(page).first()).toHaveAttribute('href', /^\/en\/film\//)
})

test('the mobile filter sheet fits, traps focus and closes with Esc', async ({
  page,
}, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), 'The sheet exists below 768 px only')
  await page.goto('/archive')
  await noHorizontalScroll(page)
  const button = page.getByRole('button', { name: 'Filtrele' })
  await button.click()
  const sheet = page.getByRole('dialog', { name: 'Filtrele' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Kapat' })).toBeFocused()
  await sheet.getByRole('button', { name: /^Tür/ }).click()
  await sheet.getByRole('checkbox').first().check()
  await expect(page).toHaveURL(/\/archive\?genre=/)
  await noHorizontalScroll(page)
  for (let i = 0; i < 40; i++) await page.keyboard.press('Tab')
  await expect(sheet.locator(':focus')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('button', { name: 'Filtrele (1)' })).toBeFocused()
})

test('the archive has no CSP violations or page errors', async ({ page }, testInfo) => {
  const problems: string[] = []
  page.on('console', (message) => {
    if (/Content Security Policy|Refused to/.test(message.text())) problems.push(message.text())
  })
  page.on('pageerror', (error) => problems.push(error.message))
  await page.goto('/archive?country=FR')
  await expect(page.getByRole('button', { name: 'Kaldır: Fransa' })).toBeVisible()
  await toggle(page, isMobile(testInfo.project.name), 'Yıl', /^1960'lar/)
  await expect(page).toHaveURL(/decade=1960/)
  expect(problems).toEqual([])
})
