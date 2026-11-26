import { expect, type Page, test } from '@playwright/test'

const isMobile = (name: string) => name === 'mobile'

// Masaüstünde navbar kutusu, mobilde mercek paneli.
async function searchBox(page: Page, mobile: boolean) {
  if (mobile) await page.getByRole('button', { name: 'Aramayı aç' }).click()
  const box = page.getByRole('combobox', { name: 'Sitede ara' }).locator('visible=true')
  await expect(box).toBeVisible()
  return box
}

test('"/" focuses the search from the page', async ({ page }, testInfo) => {
  await page.goto('/')
  const box = page.getByRole('combobox', { name: 'Sitede ara' }).locator('visible=true')
  // Kısayol hidrasyondan sonra çalışır; odak gelene dek yeniden basılır.
  await expect(async () => {
    await page.locator('body').press('/')
    await expect(box).toBeFocused({ timeout: 500 })
  }).toPass()
  await expect(box).toHaveValue('')
  if (isMobile(testInfo.project.name)) {
    await expect(page.getByRole('button', { name: 'Aramayı kapat' })).toBeVisible()
  }
})

test('a Turkish title finds the film and Enter opens it', async ({ page }, testInfo) => {
  await page.goto('/')
  const box = await searchBox(page, isMobile(testInfo.project.name))
  await box.fill('İz Sürücü')
  await expect(page.getByRole('option').first()).toContainText('İz Sürücü')
  await box.press('ArrowDown')
  await box.press('Enter')
  await expect(page).toHaveURL(/\/film\/stalker-1979$/)
})

test('"all results" opens the archive with the same count', async ({ page }, testInfo) => {
  await page.goto('/movements')
  const box = await searchBox(page, isMobile(testInfo.project.name))
  await box.fill('godard')
  const all = page.getByRole('option', { name: /^Tüm sonuçlar/ })
  const n = Number((await all.textContent())!.match(/\((\d+) film\)/)![1])
  expect(n).toBeGreaterThan(0)
  await all.click()
  await expect(page).toHaveURL(/\/archive\?q=godard$/)
  await expect(page.getByText(`${n} film`, { exact: true })).toBeVisible()
  await expect(page.locator('main a[href*="/film/"]')).toHaveCount(Math.min(n, 48))
})

test('searching again on the archive updates it without a reload', async ({ page }, testInfo) => {
  await page.goto('/archive?q=godard')
  await expect(page.getByRole('button', { name: 'Kaldır: “godard”' })).toBeVisible()
  await page.evaluate(() => Object.defineProperty(window, '__sameDocument', { value: true }))
  const box = await searchBox(page, isMobile(testInfo.project.name))
  await box.fill('stalker')
  await page.getByRole('option', { name: /^Tüm sonuçlar/ }).click()
  await expect(page).toHaveURL(/\/archive\?q=stalker$/)
  await expect(page.getByRole('button', { name: 'Kaldır: “stalker”' })).toBeVisible()
  await expect(page.locator('main a[href="/film/stalker-1979"]')).toBeVisible()
  expect(await page.evaluate(() => '__sameDocument' in window)).toBe(true)
})

test('the English search stays in English', async ({ page }, testInfo) => {
  await page.goto('/en')
  if (isMobile(testInfo.project.name))
    await page.getByRole('button', { name: 'Open search' }).click()
  const box = page.getByRole('combobox', { name: 'Search the site' }).locator('visible=true')
  await box.fill('french new wave')
  const first = page.getByRole('option').first()
  await expect(first).toContainText('Movement · ')
  await first.click()
  await expect(page).toHaveURL(/\/en\/movement\/french-new-wave$/)
})

test('the mobile search panel fits at 360 px and closes with Esc', async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), 'The lens panel replaces the box below 1024 px')
  await page.goto('/movements')
  const box = await searchBox(page, true)
  await box.fill('stalker')
  await expect(page.getByRole('listbox')).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0)
  await box.press('Escape')
  await box.press('Escape')
  await expect(page.getByRole('button', { name: 'Aramayı aç' })).toBeFocused()
  await expect(page.getByRole('combobox')).toBeHidden()
})

test('between 768 and 1023 px the lens replaces the box', async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo.project.name), 'Desktop viewport check')
  await page.setViewportSize({ width: 900, height: 800 })
  await page.goto('/movements')
  await expect(page.getByRole('button', { name: 'Aramayı aç' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Sitede ara' })).toBeHidden()
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Arşiv', exact: true }),
  ).toBeVisible()
})

test('searching causes no CSP violations or page errors', async ({ page }, testInfo) => {
  const problems: string[] = []
  page.on('console', (message) => {
    if (/Content Security Policy|Refused to/.test(message.text())) problems.push(message.text())
  })
  page.on('pageerror', (error) => problems.push(error.message))
  await page.goto('/')
  const box = await searchBox(page, isMobile(testInfo.project.name))
  await box.fill('tarkovski')
  await expect(page.getByRole('option').first()).toBeVisible()
  expect(problems).toEqual([])
})

test('random film opens another film page in the same language', async ({ page }, testInfo) => {
  const mobile = isMobile(testInfo.project.name)
  const random = async (name: string, menu: string) => {
    if (mobile) await page.getByRole('button', { name: menu }).click()
    await page.getByRole('button', { name }).click()
  }
  await page.goto('/film/stalker-1979')
  await random('Rastgele film', 'Menü')
  await expect(page).toHaveURL(/\/film\/(?!stalker-1979$)[^/]+$/)
  await page.goto('/en')
  await random('Random film', 'Menu')
  await expect(page).toHaveURL(/\/en\/film\/[^/]+$/)
})
